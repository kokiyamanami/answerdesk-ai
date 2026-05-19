import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

logger = logging.getLogger(__name__)

from app.api.router import api_router
from app.core.config import settings

app = FastAPI(
    title="AnswerDesk AI API",
    version="0.1.0",
    docs_url="/docs" if settings.app_env != "prod" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_base_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# dev環境のみローカルストレージを公開
if settings.app_env != "prod":
    _static_dir = "/app/uploads"
    os.makedirs(_static_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=_static_dir), name="uploads")


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "internal_error", "message": "予期しないエラーが発生しました。"}},
    )


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(api_router, prefix="/api")
