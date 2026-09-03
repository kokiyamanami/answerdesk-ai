# answerdesk-ai

## ローカル開発環境の起動手順

### 前提

- Docker / Docker Compose がインストール済みであること

### 1. 環境変数の準備

```bash
cp .env.example .env
# .env を開いて OPENAI_API_KEY と JWT_SECRET を設定する
```

### 2. コンテナ起動

```bash
docker compose up -d
```

### 3. DBマイグレーション

```bash
docker compose exec backend alembic upgrade head
```

### 4. シードデータ投入（初期管理者ユーザー + テーマ）

```bash
docker compose exec backend python -m seeds.seed
```

デフォルトの管理者アカウント:

- Email: `admin@example.com`
- Password: `changeme1234`

`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` 環境変数で変更可能。

### 5. アクセス

| サービス         | URL                        |
| ---------------- | -------------------------- |
| フロントエンド   | http://localhost:5173      |
| バックエンド API | http://localhost:8000      |
| API ドキュメント | http://localhost:8000/docs |

---

## ディレクトリ構成

```
answerdesk-ai/
├── backend/
│   ├── app/
│   │   ├── api/          # ルーター・依存性注入
│   │   ├── core/         # 設定・セキュリティ
│   │   ├── db/           # DB セッション
│   │   ├── models/       # SQLAlchemy モデル
│   │   ├── services/     # PDF・Embedding サービス
│   │   ├── worker/       # 非同期ジョブ（SQS Worker）
│   │   └── main.py
│   ├── migrations/       # Alembic マイグレーション
│   ├── seeds/            # シードスクリプト
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── lib/          # API クライアント
│   │   └── pages/        # 画面コンポーネント
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## よく使うコマンド

```bash
# ログ確認
docker compose logs -f backend
docker compose logs -f worker

# マイグレーション新規作成
docker compose exec backend alembic revision --autogenerate -m "description"

# コンテナ再ビルド
docker compose up -d --build

# DB リセット（開発時）
docker compose down -v && docker compose up -d
```

---

## Docs

- [DB設計](docs/db-design.md)
- [DDL](docs/ddl.sql)
- [API設計](docs/api-design.md)
- [AIサービス採用方針](docs/ai-service-decision.md)
- [技術選定確定版](docs/tech-stack-decision.md)
- [AWSアーキテクチャ設計](docs/aws-architecture.md)
- [AWS構築Runbook](docs/aws-build-runbook.md)
- [MVP最小構成（App Runner）](docs/aws-mvp-minimal-architecture.md)
- [MVP最小構成Runbook（App Runner）](docs/aws-build-runbook-minimal.md)
- [CI/CD設計](docs/cicd-design.md)
- [環境変数一覧](docs/env.md)
- [RAG処理設計](docs/rag-design.md)
- [画面設計・画面遷移設計](docs/screen-design.md)
- [認証設計](docs/auth-design.md)
- [非同期ジョブ設計](docs/async-job-design.md)
- [エラーUX設計](docs/error-ux-design.md)
- [テスト方針](docs/test-strategy.md)
- [実装タスク分解](docs/implementation-tasks.md)
