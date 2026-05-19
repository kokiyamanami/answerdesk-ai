from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App
    app_env: str = "dev"
    app_base_url: str = "http://localhost:8000"
    frontend_base_url: str = "http://localhost:5173"
    log_level: str = "INFO"

    # Database
    database_url: str

    # OpenAI
    openai_api_key: str
    openai_chat_model: str = "gpt-4.1-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_request_timeout_seconds: int = 30

    # Auth
    jwt_secret: str
    jwt_expires_in: int = 86400  # 1 day in seconds
    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    # AWS
    aws_region: str = "ap-northeast-1"
    s3_bucket_name: str = "answerdesk-dev-documents"
    sqs_queue_url: Optional[str] = None

    # Upload
    max_upload_file_size_mb: int = 20
    allowed_upload_mime_types: str = "application/pdf"

    # RAG
    vector_top_k: int = 5
    rag_score_threshold: float = 0.75

    @field_validator("database_url", "aws_region", "s3_bucket_name", "openai_api_key",
                     "openai_chat_model", "openai_embedding_model", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if v.startswith("postgresql+asyncpg"):
            raise ValueError("Use postgresql:// or postgresql+psycopg2:// for sync driver")
        return v


settings = Settings()
