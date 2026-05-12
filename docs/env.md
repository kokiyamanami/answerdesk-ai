# AnswerDesk AI 環境変数一覧

## 1. 目的
AnswerDesk AI のMVP実装およびAWSデプロイ時に必要な環境変数を整理する。

---

## 2. Backend共通
- `APP_ENV`
- `APP_BASE_URL`
- `FRONTEND_BASE_URL`
- `LOG_LEVEL`

例:
- `APP_ENV=dev`
- `APP_BASE_URL=https://api.example.com`
- `FRONTEND_BASE_URL=https://app.example.com`
- `LOG_LEVEL=INFO`

---

## 3. Database
- `DATABASE_URL`

例:
- `DATABASE_URL=postgresql://user:password@host:5432/dbname`

---

## 4. OpenAI
- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL`
- `OPENAI_EMBEDDING_MODEL`

例:
- `OPENAI_CHAT_MODEL=gpt-4.1-mini`
- `OPENAI_EMBEDDING_MODEL=text-embedding-3-small`

---

## 5. Auth
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `COOKIE_SECURE`
- `COOKIE_SAMESITE`

例:
- `JWT_EXPIRES_IN=86400`
- `COOKIE_SECURE=true`
- `COOKIE_SAMESITE=lax`

---

## 6. AWS
- `AWS_REGION`
- `S3_BUCKET_NAME`
- `SQS_QUEUE_URL`

例:
- `AWS_REGION=ap-northeast-1`
- `S3_BUCKET_NAME=answerdesk-dev-documents`

---

## 7. Upload / PDF
- `MAX_UPLOAD_FILE_SIZE_MB`
- `ALLOWED_UPLOAD_MIME_TYPES`

例:
- `MAX_UPLOAD_FILE_SIZE_MB=20`
- `ALLOWED_UPLOAD_MIME_TYPES=application/pdf`

---

## 8. RAG
- `VECTOR_TOP_K`
- `RAG_SCORE_THRESHOLD`
- `OPENAI_REQUEST_TIMEOUT_SECONDS`

例:
- `VECTOR_TOP_K=5`
- `RAG_SCORE_THRESHOLD=0.75`
- `OPENAI_REQUEST_TIMEOUT_SECONDS=30`

---

## 9. Frontend
- `VITE_API_BASE_URL`

例:
- `VITE_API_BASE_URL=https://api.example.com`

---

## 10. 運用方針
- ローカル開発では `.env` を使用
- 本番では Secrets Manager または Amplify 環境変数を利用
- 機密情報をGitに含めない
