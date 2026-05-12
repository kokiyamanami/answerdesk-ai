# AnswerDesk AI AWS構築Runbook

## 1. 目的
AnswerDesk AI のMVPをAWS上に構築するための、実際の作業順に沿った手順を整理する。

---

## 2. 前提
- フロントエンド: React
- バックエンド: FastAPI
- AI: OpenAI
- DB: PostgreSQL + pgvector
- ファイル保存: S3
- 非同期処理: SQS + Worker
- API実行基盤: ECS Fargate + ALB
- フロント配信: Amplify Hosting

---

## 3. 全体構築順
1. 命名規則・リージョンを決める
2. S3バケットを作成する
3. RDS PostgreSQLを作成する
4. Secrets Managerを作成する
5. ECRを作成する
6. ECSクラスターを作成する
7. ALBを作成する
8. API用ECSサービスを作成する
9. Amplify Hostingでフロントを接続する
10. SQSキューを作成する
11. Worker用ECSサービスを作成する
12. CloudWatch監視を整える
13. ドメイン/HTTPSを設定する
14. 動作確認する

---

## 4. Step 1: 命名規則とリージョン
決めるもの:
- AWSリージョン
- 環境名（dev / stg / prod）
- リソース接頭辞

例:
- `answerdesk-dev-api`
- `answerdesk-dev-worker`
- `answerdesk-dev-db`
- `answerdesk-dev-documents`

確認項目:
- 全サービスで同じ命名規則を使う
- OpenAIやS3の利用リージョン方針を整理する

---

## 5. Step 2: S3作成
用途:
- PDF保存
- アイコン画像保存

設定:
- バケットは非公開
- Public Access Block を有効化
- SSE-S3 または SSE-KMS を有効化
- フォルダ例:
  - `documents/`
  - `icons/`

確認項目:
- APIからPUT/GETできること
- 直接公開しないこと

ハマりやすい点:
- IAM権限不足
- バケットポリシーとIAMの役割混同

---

## 6. Step 3: RDS PostgreSQL作成
用途:
- アプリデータ保存
- pgvector検索

設定:
- Private Subnet に配置
- ECSからのみ接続許可
- 自動バックアップ有効化
- `vector` extension を有効化

確認項目:
- ローカルまたはECSから接続できること
- DDL適用できること
- `CREATE EXTENSION vector;` が通ること

ハマりやすい点:
- Security Groupの向き
- Private Subnetの接続理解不足
- パラメータグループや権限不足

---

## 7. Step 4: Secrets Manager作成
登録対象:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL`
- `OPENAI_EMBEDDING_MODEL`
- `JWT_SECRET`
- `S3_BUCKET_NAME`
- `AWS_REGION`
- `SQS_QUEUE_URL`

確認項目:
- APIタスクから参照できること
- Workerタスクから参照できること

ハマりやすい点:
- task role / execution role の違い
- secrets参照権限不足

---

## 8. Step 5: ECR作成
用途:
- APIコンテナイメージ
- Workerコンテナイメージ

作成対象例:
- `answerdesk-api`
- `answerdesk-worker`

確認項目:
- GitHub Actions またはローカルから push できること

---

## 9. Step 6: ECSクラスター作成
用途:
- APIタスク実行
- Workerタスク実行

設定:
- Fargate使用
- CloudWatch Logs を有効化
- API用 / Worker用タスク定義を分ける

確認項目:
- タスク起動できること
- Secret注入できること

---

## 10. Step 7: ALB作成
用途:
- APIをHTTPSで公開する

設定:
- Public Subnet に配置
- HTTPSリスナー
- Target Group作成
- Health Check Path は `/health`

確認項目:
- `/health` が 200 を返すこと
- ターゲットが healthy になること

ハマりやすい点:
- ヘルスチェック未実装
- ポート不一致
- Security Group設定ミス

---

## 11. Step 8: API用ECSサービス作成
設定:
- Private Subnet に配置
- ALB Target Group に接続
- RDS / S3 / Secrets Manager アクセス権付与

確認項目:
- ALB経由でAPIにアクセスできること
- DB接続できること
- S3書き込みできること

---

## 12. Step 9: Amplify Hosting接続
用途:
- Reactフロント配信

設定:
- GitHub連携
- build設定
- 環境変数設定
- SPAリライト設定

確認項目:
- `/` が表示できること
- `/login` や `/c/:slug` のルーティングが崩れないこと

ハマりやすい点:
- SPA rewrite漏れ
- API URL設定漏れ

---

## 13. Step 10: SQSキュー作成
用途:
- PDF処理ジョブ投入

設定:
- visibility timeout を十分長く設定
- 必要に応じて DLQ を追加

確認項目:
- enqueue できること
- dequeue できること

ハマりやすい点:
- visibility timeout不足
- IAM不足

---

## 14. Step 11: Worker用ECSサービス作成
用途:
- PDFテキスト抽出
- チャンク化
- Embedding生成
- DB保存

設定:
- SQS polling
- S3 read
- OpenAI API呼び出し
- RDS接続

確認項目:
- キュー投入後に文書が `processed` になること
- 失敗時に `failed` になること

---

## 15. Step 12: CloudWatch監視
監視対象:
- APIログ
- Workerログ
- ECSタスク停止
- SQS滞留
- RDS CPU / 接続数

確認項目:
- ログが見えること
- 失敗時に追跡できること

---

## 16. Step 13: ドメイン/HTTPS
対象:
- フロントURL
- API URL

設定:
- Route 53
- ACM証明書
- ALB / Amplifyに紐付け

確認項目:
- HTTPSアクセス可能
- ドメインで到達可能

ハマりやすい点:
- ACM証明書のリージョン
- DNS反映待ち

---

## 17. Step 14: 最終動作確認
確認項目:
- ログイン可能
- ボット作成可能
- FAQ登録可能
- PDFアップロード可能
- Worker処理成功
- 公開チャット応答可能
- fallback動作確認

---

## 18. 構築順のおすすめ実行フェーズ
### Phase 1
- S3
- RDS
- Secrets Manager

### Phase 2
- ECR
- ECS
- ALB
- APIデプロイ

### Phase 3
- Amplify

### Phase 4
- SQS
- Worker

### Phase 5
- Domain / HTTPS
- Monitoring
