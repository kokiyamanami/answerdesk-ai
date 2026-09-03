import csv
import io

from fastapi import APIRouter, Depends, File, HTTPException, Header, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.api.deps import get_current_user, get_user_bot
from app.db.session import get_db
from app.models.bot import Bot
from app.models.document_chunk import DocumentChunk
from app.models.faq import FAQ
from app.models.user import User
from app.services.embedding_service import generate_embedding

router = APIRouter(prefix="/faqs", tags=["faq"])

CSV_COLUMNS = ["question", "answer", "category", "sort_order"]


class FAQResponse(BaseModel):
    id: str
    question: str
    answer: str
    category: Optional[str]
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class FAQCreateRequest(BaseModel):
    question: str
    answer: str
    category: Optional[str] = None
    sort_order: int = 0


class FAQUpdateRequest(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


def _get_bot_or_404(current_user: User, db: Session, bot_id: str | None = None) -> Bot:
    return get_user_bot(current_user, db, bot_id)


def _sync_faq_chunk(faq: FAQ, db: Session) -> None:
    """FAQのdocument_chunkを更新する（既存を無効化して再生成）。"""
    db.query(DocumentChunk).filter(
        DocumentChunk.source_kind == "faq",
        DocumentChunk.source_id == faq.id,
    ).update({"is_active": False})
    db.flush()

    content = f"質問: {faq.question}\n回答: {faq.answer}"
    title_prefix = f"FAQ: {faq.category} / " if faq.category else "FAQ: "
    title = f"{title_prefix}{faq.question}"

    embedding = generate_embedding(content)

    chunk = DocumentChunk(
        bot_id=faq.bot_id,
        source_kind="faq",
        source_id=faq.id,
        chunk_index=0,
        title=title,
        content=content,
        metadata_json={"category": faq.category},
        embedding=embedding,
        is_active=True,
    )
    db.add(chunk)


@router.get("", response_model=list[FAQResponse])
def list_faqs(current_user: User = Depends(get_current_user), x_bot_id: str | None = Header(None, alias="X-Bot-Id"), db: Session = Depends(get_db)):
    bot = _get_bot_or_404(current_user, db, x_bot_id)
    faqs = (
        db.query(FAQ)
        .filter(FAQ.bot_id == bot.id, FAQ.is_active == True)
        .order_by(FAQ.sort_order, FAQ.created_at)
        .all()
    )
    return [FAQResponse(id=str(f.id), question=f.question, answer=f.answer,
                        category=f.category, sort_order=f.sort_order, is_active=f.is_active)
            for f in faqs]


@router.get("/export")
def export_faqs(current_user: User = Depends(get_current_user), x_bot_id: str | None = Header(None, alias="X-Bot-Id"), db: Session = Depends(get_db)):
    """FAQ を CSV でエクスポートする（Excel 互換のため UTF-8 BOM 付き）。"""
    bot = _get_bot_or_404(current_user, db, x_bot_id)
    faqs = (
        db.query(FAQ)
        .filter(FAQ.bot_id == bot.id, FAQ.is_active == True)
        .order_by(FAQ.sort_order, FAQ.created_at)
        .all()
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(CSV_COLUMNS)
    for f in faqs:
        writer.writerow([f.question, f.answer, f.category or "", f.sort_order])
    data = "﻿" + buf.getvalue()
    return StreamingResponse(
        iter([data]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="faqs.csv"'},
    )


@router.post("/import")
def import_faqs(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    x_bot_id: str | None = Header(None, alias="X-Bot-Id"),
    db: Session = Depends(get_db),
):
    """CSV から FAQ を追加インポートする。列: question, answer, category(任意), sort_order(任意)。
    既存 FAQ は置き換えず追記。question/answer が空の行はスキップ。"""
    bot = _get_bot_or_404(current_user, db, x_bot_id)

    raw = file.file.read()
    if len(raw) > 2 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={"code": "file_too_large", "message": "CSVは2MB以内にしてください。"})
    for encoding in ("utf-8-sig", "cp932"):
        try:
            text_content = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            text_content = None
    if text_content is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={"code": "invalid_encoding", "message": "CSVの文字コードはUTF-8またはShift_JISにしてください。"})

    reader = csv.DictReader(io.StringIO(text_content))
    if not reader.fieldnames or "question" not in reader.fieldnames or "answer" not in reader.fieldnames:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={"code": "invalid_columns", "message": "CSVに question / answer 列が必要です。"})

    created = 0
    skipped = 0
    errors: list[str] = []
    for i, row in enumerate(reader, start=2):  # 2 = ヘッダの次の行
        question = (row.get("question") or "").strip()
        answer = (row.get("answer") or "").strip()
        if not question or not answer:
            skipped += 1
            continue
        category = (row.get("category") or "").strip() or None
        raw_sort = (row.get("sort_order") or "").strip()
        try:
            sort_order = int(raw_sort) if raw_sort else 0
        except ValueError:
            sort_order = 0
        try:
            faq = FAQ(bot_id=bot.id, question=question, answer=answer,
                      category=category, sort_order=sort_order)
            db.add(faq)
            db.flush()
            _sync_faq_chunk(faq, db)
            db.commit()
            created += 1
        except Exception as e:
            db.rollback()
            errors.append(f"{i}行目: {type(e).__name__}")

    return {"created": created, "skipped": skipped, "errors": errors}


@router.post("", response_model=FAQResponse, status_code=status.HTTP_201_CREATED)
def create_faq(body: FAQCreateRequest, current_user: User = Depends(get_current_user), x_bot_id: str | None = Header(None, alias="X-Bot-Id"), db: Session = Depends(get_db)):
    bot = _get_bot_or_404(current_user, db, x_bot_id)
    faq = FAQ(bot_id=bot.id, question=body.question, answer=body.answer,
               category=body.category, sort_order=body.sort_order)
    db.add(faq)
    db.flush()
    _sync_faq_chunk(faq, db)
    db.commit()
    db.refresh(faq)
    return FAQResponse(id=str(faq.id), question=faq.question, answer=faq.answer,
                       category=faq.category, sort_order=faq.sort_order, is_active=faq.is_active)


@router.patch("/{faq_id}", response_model=FAQResponse)
def update_faq(faq_id: str, body: FAQUpdateRequest,
               current_user: User = Depends(get_current_user), x_bot_id: str | None = Header(None, alias="X-Bot-Id"), db: Session = Depends(get_db)):
    bot = _get_bot_or_404(current_user, db, x_bot_id)
    faq = db.query(FAQ).filter(FAQ.id == UUID(faq_id), FAQ.bot_id == bot.id).first()
    if not faq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "faq_not_found", "message": "FAQが見つかりません。"})

    for key, value in body.model_dump(exclude_none=True).items():
        setattr(faq, key, value)
    db.flush()

    _sync_faq_chunk(faq, db)
    db.commit()
    db.refresh(faq)
    return FAQResponse(id=str(faq.id), question=faq.question, answer=faq.answer,
                       category=faq.category, sort_order=faq.sort_order, is_active=faq.is_active)


@router.delete("/{faq_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_faq(faq_id: str, current_user: User = Depends(get_current_user), x_bot_id: str | None = Header(None, alias="X-Bot-Id"), db: Session = Depends(get_db)):
    bot = _get_bot_or_404(current_user, db, x_bot_id)
    faq = db.query(FAQ).filter(FAQ.id == UUID(faq_id), FAQ.bot_id == bot.id).first()
    if not faq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "faq_not_found", "message": "FAQが見つかりません。"})
    db.query(DocumentChunk).filter(
        DocumentChunk.source_kind == "faq",
        DocumentChunk.source_id == faq.id,
    ).delete()
    db.delete(faq)
    db.commit()
