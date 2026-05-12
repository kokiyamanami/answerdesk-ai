"""
PDF 文書処理ジョブ:
  1. documents.status を processing に更新
  2. S3 から PDF を取得
  3. PyMuPDF でテキスト抽出
  4. チャンク化
  5. OpenAI Embedding 生成
  6. document_chunks に保存
  7. documents.status を processed に更新
  失敗時: failed + error_message を保存
"""
import logging
from datetime import datetime, timezone
from uuid import UUID

logger = logging.getLogger(__name__)


def process_document(document_id: str) -> None:
    from app.db.session import SessionLocal
    from app.models.document import Document
    from app.models.document_chunk import DocumentChunk
    from app.services.pdf_service import extract_chunks_from_pdf
    from app.services.embedding_service import generate_embeddings

    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == UUID(document_id)).first()
        if not doc:
            logger.error(f"Document not found: {document_id}")
            return

        # 排他制御: already processing or processed の場合はスキップ
        if doc.status in ("processing", "processed"):
            logger.info(f"Document {document_id} is already {doc.status}. Skipping.")
            return

        doc.status = "processing"
        db.commit()
        logger.info(f"Processing document: {document_id} ({doc.file_name})")

        # 既存チャンクを無効化
        db.query(DocumentChunk).filter(
            DocumentChunk.source_kind == "document",
            DocumentChunk.source_id == doc.id,
        ).update({"is_active": False})
        db.commit()

        # S3 から PDF を取得してチャンク抽出
        chunks = extract_chunks_from_pdf(storage_url=doc.storage_url, file_name=doc.file_name)

        if not chunks:
            raise ValueError("PDF からテキストを抽出できませんでした。テキスト抽出可能なPDFか確認してください。")

        # Embedding 生成
        contents = [c["content"] for c in chunks]
        embeddings = generate_embeddings(contents)

        # document_chunks 保存
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            dc = DocumentChunk(
                bot_id=doc.bot_id,
                source_kind="document",
                source_id=doc.id,
                chunk_index=i,
                title=chunk.get("title"),
                content=chunk["content"],
                metadata_json=chunk.get("metadata"),
                embedding=embedding,
                is_active=True,
            )
            db.add(dc)

        doc.status = "processed"
        doc.processed_at = datetime.now(timezone.utc)
        db.commit()
        logger.info(f"Document processed: {document_id} ({len(chunks)} chunks)")

    except Exception as e:
        logger.exception(f"Document processing failed: {document_id}: {e}")
        try:
            doc = db.query(Document).filter(Document.id == UUID(document_id)).first()
            if doc:
                doc.status = "failed"
                doc.error_message = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
