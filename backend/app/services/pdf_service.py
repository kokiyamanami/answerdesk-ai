"""
PDF テキスト抽出 + チャンク化サービス。
PyMuPDF を使用して、テキスト抽出可能な PDF のみ対応。
"""
import io
import logging
from typing import Any

logger = logging.getLogger(__name__)

CHUNK_MAX_CHARS = 800
CHUNK_OVERLAP_CHARS = 100


def extract_chunks_from_pdf(storage_url: str, file_name: str) -> list[dict[str, Any]]:
    """
    S3 から PDF を取得してチャンクリストを返す。
    各チャンク: {"content": str, "title": str | None, "metadata": dict}
    """
    pdf_bytes = _download_from_s3(storage_url)
    return _extract_chunks(pdf_bytes, file_name)


def _download_from_s3(storage_url: str) -> bytes:
    import boto3
    from app.core.config import settings

    # storage_url は "s3://bucket/key" 形式を想定
    if storage_url.startswith("s3://"):
        parts = storage_url[5:].split("/", 1)
        bucket, key = parts[0], parts[1]
    else:
        raise ValueError(f"Unsupported storage_url format: {storage_url}")

    s3 = boto3.client("s3", region_name=settings.aws_region)
    response = s3.get_object(Bucket=bucket, Key=key)
    return response["Body"].read()


def _extract_chunks(pdf_bytes: bytes, file_name: str) -> list[dict[str, Any]]:
    import fitz  # PyMuPDF

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    chunks: list[dict[str, Any]] = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        if not text.strip():
            continue

        page_chunks = _split_text(text, max_chars=CHUNK_MAX_CHARS, overlap=CHUNK_OVERLAP_CHARS)
        for i, chunk_text in enumerate(page_chunks):
            chunks.append({
                "content": chunk_text.strip(),
                "title": None,
                "metadata": {
                    "page": page_num + 1,
                    "file_name": file_name,
                    "chunk_on_page": i,
                },
            })

    doc.close()
    logger.info(f"Extracted {len(chunks)} chunks from {file_name}")
    return chunks


def _split_text(text: str, max_chars: int, overlap: int) -> list[str]:
    """文字数ベースでテキストを分割する（オーバーラップあり）。"""
    chunks = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = min(start + max_chars, text_len)
        chunks.append(text[start:end])
        if end == text_len:
            break
        start = end - overlap

    return chunks
