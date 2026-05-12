# AnswerDesk AI MVP最小構成Runbook（App Runner）

## 1. 目的
App Runner を利用した小規模MVP最小構成を、実際の作業順で構築するための手順を整理する。

---

## 2. 全体構築順
1. リージョンと命名規則を決める
2. S3バケットを作る
3. RDS PostgreSQL を作る
4. Secrets Manager を作る
5. ECR を作る
6. App Runner サービスを作る
7. Amplify Hosting を接続する
8. CloudWatch でログ確認する
9. ドメイン/HTTPS を設定する
10. 動作確認する

---

## 3. Step 1: リージョンと命名規則
決めるもの:
- AWSリージョン
- 環境名
- リソース名接頭辞

例:
- `answerdesk-dev-api`
- `answerdesk-dev-db`
- `answerdesk-dev-documents`

---

## 4. Step 2: S3バケット作成
用途:
- PDF保存
- アイコン保存

設定:
- 非公開
- Public Access Block 有効
- SSE有効

確認:
- アプリからアップロード可能
- 直接公開されない

---

## 5. Step 3: RDS PostgreSQL作成
設定:
- PostgreSQL
- pgvector利用前提
- 自動バックアップ有効

確認:
- DB接続できる
- DDL適用できる
- `vector` extension 有効化できる

注意:
- App Runner から接続できるネットワーク設定を確認する

---

## 6. Step 4: Secrets Manager作成
登録対象:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL`
- `OPENAI_EMBEDDING_MODEL`
- `JWT_SECRET`
- `S3_BUCKET_NAME`
- `AWS_REGION`

確認:
- App Runner から参照できる

---

## 7. Step 5: ECR作成
用途:
- FastAPIコンテナの格納

確認:
- Docker image pushできる

---

## 8. Step 6: App Runnerサービス作成
設定:
- ECR イメージ指定
- CPU / Memory 設定
- 環境変数 / Secret設定
- Auto Deploy 必要に応じて有効化

確認:
- `/health` が200になる
- DB接続できる
- S3アクセスできる

ハマりやすい点:
- VPC接続設定
- RDSへの接続許可
- Secret参照権限

---

## 9. Step 7: Amplify Hosting接続
設定:
- GitHub連携
- build設定
- `VITE_API_BASE_URL` 設定
- SPA rewrite設定

確認:
- トップ表示
- `/login` 表示
- `/c/:slug` 表示

---

## 10. Step 8: CloudWatchログ確認
確認:
- App Runner のアプリログが見える
- エラー発生時に追える

---

## 11. Step 9: ドメイン/HTTPS設定
設定:
- Route 53
- ACM
- App Runner / Amplify のカスタムドメイン

確認:
- HTTPSアクセス可能
- API/Frontendともに独自ドメインで到達可能

---

## 12. Step 10: 動作確認
確認項目:
- ログインできる
- ボット設定できる
- FAQ登録できる
- PDFアップロードできる
- チャット応答できる
- fallback動作する

---

## 13. 後から追加するもの
- SQS
- Worker
- 非同期PDF処理
- ECS Fargate への移行検討
