"""
OpenAI Embedding 生成サービス。
"""
import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """テキストリストに対して Embedding ベクトルを生成して返す。"""
    from openai import OpenAI

    client = OpenAI(
        api_key=settings.openai_api_key,
        timeout=settings.openai_request_timeout_seconds,
    )

    # OpenAI Embedding API は最大 2048 件/リクエスト
    batch_size = 100
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = client.embeddings.create(
            model=settings.openai_embedding_model,
            input=batch,
        )
        batch_embeddings = [item.embedding for item in response.data]
        all_embeddings.extend(batch_embeddings)

    return all_embeddings


def generate_embedding(text: str) -> list[float]:
    """単一テキストの Embedding を返す。"""
    return generate_embeddings([text])[0]
