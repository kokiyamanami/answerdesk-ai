from fastapi import APIRouter

from app.api.routers import auth, bot, theme, faq, document, test_chat, public, conversation, form_submission

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(bot.router)
api_router.include_router(theme.router)
api_router.include_router(faq.router)
api_router.include_router(document.router)
api_router.include_router(test_chat.router)
api_router.include_router(public.router)
api_router.include_router(conversation.router)
api_router.include_router(form_submission.router)
