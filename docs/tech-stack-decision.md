# AnswerDesk AI 技術選定確定版

## 1. 目的
AnswerDesk AI のMVP実装に向けて、未確定だった主要技術選定を確定する。

---

## 2. 採用技術一覧

### 2.1 フロントエンド
- React

### 2.2 バックエンド
- Python
- FastAPI

### 2.3 DB / 検索
- PostgreSQL
- pgvector

### 2.4 AI
- 回答生成: OpenAI `gpt-4.1-mini`
- Embedding生成: OpenAI `text-embedding-3-small`

### 2.5 PDF処理
- PyMuPDF
- MVPではテキスト抽出可能なPDFのみ対応
- OCR前提PDFは対象外とする

### 2.6 認証
- JWT
- 保存方式は HttpOnly Secure Cookie

### 2.7 ファイルアップロード
- MVPでは API経由でアップロードし、FastAPI から S3 に保存する
- 将来的に presigned URL 方式を検討する

### 2.8 ストレージ
- Amazon S3

### 2.9 非同期処理
- Amazon SQS
- Worker でPDF処理、チャンク生成、Embedding生成を実行

### 2.10 インフラ
- フロントエンド: Amplify Hosting
- API: ECS Fargate + ALB
- DB: RDS PostgreSQL
- ログ/監視: CloudWatch
- シークレット管理: Secrets Manager

---

## 3. 採用理由

### 3.1 OpenAI
- MVPで実装速度を優先できる
- RAG実装例が多い
- 回答生成とEmbeddingを同一系統で揃えられる

### 3.2 PyMuPDF
- 実装がシンプル
- PDFテキスト抽出ライブラリとして扱いやすい
- MVP用途に適している

### 3.3 HttpOnly Secure Cookie
- localStorage より安全性が高い
- 管理画面認証として自然な方式

### 3.4 API経由S3アップロード
- 初期実装がシンプル
- バックエンド側でバリデーションや保存処理を一元化できる

---

## 4. 追加方針
- モデル名は環境変数で切り替え可能にする
- PDF対応範囲はMVPでは限定し、将来OCRを追加する
- アップロード方式は将来 presigned URL に変更可能とする
- AIクライアントは抽象化する

---

## 5. MVPでの正式採用結論
- 回答生成: OpenAI `gpt-4.1-mini`
- Embedding生成: OpenAI `text-embedding-3-small`
- PDF抽出: PyMuPDF
- JWT保存方式: HttpOnly Secure Cookie
- S3アップロード方式: API経由
- 検索: PostgreSQL + pgvector
