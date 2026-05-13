import json
import os
import uuid

import boto3
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.bot import Bot
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.user import User

router = APIRouter(prefix="/documents", tags=["document"])

MAX_BYTES = settings.max_upload_file_size_mb * 1024 * 1024


class DocumentResponse(BaseModel):
    id: str
    file_name: str
    mime_type: str
    file_size_bytes: int
    status: str
    error_message: Optional[str]

    model_config = {"from_attributes": True}


def _get_bot_or_404(current_user: User, db: Session) -> Bot:
    bot = db.query(Bot).filter(Bot.user_id == current_user.id).first()
    if not bot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "bot_not_found", "message": "ボットが見つかりません。"})
    return bot


def _doc_to_response(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=str(doc.id),
        file_name=doc.file_name,
        mime_type=doc.mime_type,
        file_size_bytes=doc.file_size_bytes,
        status=doc.status,
        error_message=doc.error_message,
    )


@router.get("", response_model=list[DocumentResponse])
def list_documents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot = _get_bot_or_404(current_user, db)
    docs = db.query(Document).filter(Document.bot_id == bot.id).order_by(Document.created_at.desc()).all()
    return [_doc_to_response(d) for d in docs]


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # バリデーション
    if file.content_type not in settings.allowed_upload_mime_types.split(","):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_file_type", "message": "PDFファイルのみアップロードできます。"},
        )

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "file_too_large", "message": f"ファイルサイズは{settings.max_upload_file_size_mb}MB以内にしてください。"},
        )

    bot = _get_bot_or_404(current_user, db)

    # ストレージへ保存
    doc_id = uuid.uuid4()
    s3_key = f"documents/{bot.id}/{doc_id}/{file.filename}"

    if settings.app_env != "prod":
        save_dir = f"/app/uploads/documents/{bot.id}/{doc_id}"
        os.makedirs(save_dir, exist_ok=True)
        with open(f"{save_dir}/{file.filename}", "wb") as f:
            f.write(content)
        storage_url = f"/uploads/documents/{bot.id}/{doc_id}/{file.filename}"
    else:
        storage_url = f"s3://{settings.s3_bucket_name}/{s3_key}"
        try:
            s3 = boto3.client("s3", region_name=settings.aws_region)
            s3.put_object(
                Bucket=settings.s3_bucket_name,
                Key=s3_key,
                Body=content,
                ContentType=file.content_type,
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "upload_failed", "message": "ファイルのアップロードに失敗しました。"},
            )

    # documents レコード作成
    doc = Document(
        id=doc_id,
        bot_id=bot.id,
        source_type="pdf",
        file_name=file.filename,
        storage_url=storage_url,
        mime_type=file.content_type,
        file_size_bytes=len(content),
        status="uploaded",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # SQS へジョブ投入（dev環境でSQS未設定の場合は同期で直接実行）
    if settings.sqs_queue_url:
        _enqueue_process_document(str(doc.id))
    else:
        import threading
        from app.worker.jobs.process_document import process_document
        t = threading.Thread(target=process_document, args=(str(doc.id),), daemon=True)
        t.start()

    return _doc_to_response(doc)


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot = _get_bot_or_404(current_user, db)
    doc = db.query(Document).filter(Document.id == UUID(document_id), Document.bot_id == bot.id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "document_not_found", "message": "文書が見つかりません。"})
    return _doc_to_response(doc)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot = _get_bot_or_404(current_user, db)
    doc = db.query(Document).filter(Document.id == UUID(document_id), Document.bot_id == bot.id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "document_not_found", "message": "文書が見つかりません。"})
    db.query(DocumentChunk).filter(
        DocumentChunk.source_kind == "document",
        DocumentChunk.source_id == doc.id,
    ).delete()
    db.delete(doc)
    db.commit()


def _enqueue_process_document(document_id: str) -> None:
    if not settings.sqs_queue_url:
        return
    try:
        sqs = boto3.client("sqs", region_name=settings.aws_region)
        sqs.send_message(
            QueueUrl=settings.sqs_queue_url,
            MessageBody=json.dumps({"job_type": "process_document", "document_id": document_id}),
        )
    except Exception:
        # SQSへの投入失敗はアップロード成功とは独立して扱う（workerは手動リトライ可能）
        pass
