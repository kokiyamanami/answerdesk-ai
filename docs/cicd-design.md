# AnswerDesk AI CI/CD設計

## 1. 目的
AnswerDesk AI の継続的インテグレーション / 継続的デプロイの方針を整理する。

---

## 2. 基本方針
- Runbook は人が初回構築や手動対応を行うための手順書
- CI/CD はコード変更後の反復作業を自動化する仕組み
- 初回のAWS環境構築はRunbookベースで行い、その後の更新をCI/CDで自動化する

---

## 3. 対象範囲
### CI
- Lint
- Test
- Build確認

### CD
- API Docker build
- ECR push
- ECS deploy
- Frontend build / deploy

---

## 4. 想定構成
### 4.1 Backend
- GitHub Actions を利用
- `main` への push を契機に build / test / deploy

### 4.2 Frontend
- Amplify Hosting の GitHub連携を利用
- `main` への push を契機に build / deploy

---

## 5. Backend CIフロー
1. GitHub Actions 起動
2. Python依存関係インストール
3. Lint実行
4. Test実行
5. Docker image build
6. Docker image push to ECR
7. ECS service update

---

## 6. Frontend CI/CDフロー
1. `main` push
2. Amplify が自動build
3. Amplify が自動deploy

補足:
- FrontendはAmplify側の標準機能を活用するため、GitHub Actionsを必須にしない

---

## 7. Secrets管理
GitHub Actions 側で必要なもの:
- AWSアクセス権限
- ECR push権限
- ECS deploy権限

アプリケーション実行時の機密情報:
- OpenAI API Key
- DB接続情報
- JWT Secret

これらは Secrets Manager で管理し、ECS実行時に注入する。

---

## 8. デプロイ方針
### Backend
- Docker image tag は commit SHA を利用
- ECS service update で新しいtask definitionに切替
- health check 成功を確認する

### Frontend
- Amplifyがビルド後に自動反映

---

## 9. migration方針
MVPでは以下のどちらかを採用する。
- deploy前に手動実行
- 別jobで明示的に実行

初期段階では **自動deployとmigrationを完全自動連結しない** 方が安全。

---

## 10. rollback方針
### Backend
- 直前のECR image tagへ戻す
- ECS task definition を前バージョンへ切り替える

### Frontend
- Amplifyの過去デプロイへ戻す

---

## 11. 将来拡張
- PR時CI追加
- staging環境追加
- migrationの自動化
- Canary deploy
- Slack通知連携
