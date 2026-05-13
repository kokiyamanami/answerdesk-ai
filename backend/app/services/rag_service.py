"""
RAG 検索・回答生成サービス。
"""
import logging
from typing import Any, Optional
from uuid import UUID

from openai import OpenAI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.bot import Bot
from app.models.conversation import Conversation, Message, MessageCitation
from app.models.document_chunk import DocumentChunk
from app.services.embedding_service import generate_embedding

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """あなたはFAQチャットボットです。
以下の「参考情報」のみを根拠として回答してください。
参考情報にない内容は推測や補完をせず、回答できない旨を伝えてください。
回答は簡潔な日本語で行ってください。

参考情報:
{context}
"""

FALLBACK_JUDGMENT_PROMPT = """以下の参考情報をもとに質問に答えられますか？
答えられる場合は「YES」、答えられない場合は「NO」とだけ答えてください。

参考情報:
{context}

質問: {question}
"""


def answer_question(
    bot: Bot,
    question: str,
    db: Session,
) -> dict[str, Any]:
    """
    RAG で質問に回答する。
    返り値: {answer, fallback, citations, retrieval_score}
    """
    # 1. 質問の Embedding 生成
    q_embedding = generate_embedding(question)

    # 2. pgvector 類似検索
    chunks = _vector_search(bot_id=bot.id, embedding=q_embedding, db=db)

    # 3. 未ヒット判定（スコア閾値）
    threshold = bot.rag_score_threshold if bot.rag_score_threshold is not None else settings.rag_score_threshold
    if not chunks or chunks[0]["score"] < threshold:
        return _make_fallback(bot)

    # 4. コンテキスト組み立て
    context = _build_context(chunks)

    # 5. LLM で未ヒット判定
    model = bot.ai_model or settings.openai_chat_model
    if _is_fallback_by_llm(context=context, question=question, model=model):
        return _make_fallback(bot)

    # 6. 回答生成
    answer = _generate_answer(context=context, question=question, model=model)

    return {
        "answer": answer,
        "fallback": False,
        "citations": [{"chunk_id": c["chunk_id"], "title": c["title"], "source_kind": c["source_kind"],
                        "score": c["score"]} for c in chunks],
        "retrieval_score": chunks[0]["score"],
    }


def _vector_search(bot_id: UUID, embedding: list[float], db: Session) -> list[dict]:
    embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"
    sql = text("""
        SELECT id, title, content, source_kind,
               1 - (embedding <=> CAST(:embedding AS vector)) AS score
        FROM document_chunks
        WHERE bot_id = :bot_id AND is_active = true
        ORDER BY embedding <=> CAST(:embedding AS vector)
        LIMIT :top_k
    """)
    rows = db.execute(sql, {
        "embedding": embedding_str,
        "bot_id": str(bot_id),
        "top_k": settings.vector_top_k,
    }).fetchall()

    return [
        {"chunk_id": str(r.id), "title": r.title, "content": r.content,
         "source_kind": r.source_kind, "score": float(r.score)}
        for r in rows
    ]


def _build_context(chunks: list[dict]) -> str:
    parts = []
    for i, c in enumerate(chunks, 1):
        title = f"[{c['title']}]" if c["title"] else f"[参考{i}]"
        parts.append(f"{title}\n{c['content']}")
    return "\n\n".join(parts)


def _is_fallback_by_llm(context: str, question: str, model: str) -> bool:
    client = OpenAI(api_key=settings.openai_api_key, timeout=settings.openai_request_timeout_seconds)
    prompt = FALLBACK_JUDGMENT_PROMPT.format(context=context, question=question)
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=5,
        temperature=0,
    )
    answer = response.choices[0].message.content.strip().upper()
    return answer != "YES"


def _generate_answer(context: str, question: str, model: str) -> str:
    client = OpenAI(api_key=settings.openai_api_key, timeout=settings.openai_request_timeout_seconds)
    system = SYSTEM_PROMPT.format(context=context)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": question},
        ],
        temperature=0.2,
    )
    return response.choices[0].message.content.strip()


def _make_fallback(bot: Bot) -> dict[str, Any]:
    result: dict[str, Any] = {
        "answer": bot.fallback_message,
        "fallback": True,
        "citations": [],
        "retrieval_score": None,
    }
    if bot.fallback_contact_url or bot.fallback_contact_email:
        result["contact"] = {
            "url": bot.fallback_contact_url,
            "email": bot.fallback_contact_email,
        }
    return result


def save_messages(
    conversation: Conversation,
    bot: Bot,
    question: str,
    rag_result: dict[str, Any],
    db: Session,
) -> Message:
    """会話のユーザーメッセージとAIメッセージを保存する。"""
    from datetime import datetime, timezone

    # ユーザーメッセージ
    user_msg = Message(
        conversation_id=conversation.id,
        bot_id=bot.id,
        role="user",
        message_type="normal",
        content=question,
    )
    db.add(user_msg)
    db.flush()

    # AI メッセージ
    ai_msg = Message(
        conversation_id=conversation.id,
        bot_id=bot.id,
        role="assistant",
        message_type="fallback" if rag_result["fallback"] else "normal",
        content=rag_result["answer"],
        retrieval_score=rag_result["retrieval_score"],
        fallback_triggered=rag_result["fallback"],
        model_name=settings.openai_chat_model if not rag_result["fallback"] else None,
    )
    db.add(ai_msg)
    db.flush()

    # citations 保存
    for i, citation in enumerate(rag_result.get("citations", []), 1):
        mc = MessageCitation(
            message_id=ai_msg.id,
            chunk_id=UUID(citation["chunk_id"]),
            rank_order=i,
            score=citation.get("score"),
        )
        db.add(mc)

    # 会話の最終メッセージ日時を更新
    conversation.last_message_at = datetime.now(timezone.utc)
    db.commit()

    return ai_msg
