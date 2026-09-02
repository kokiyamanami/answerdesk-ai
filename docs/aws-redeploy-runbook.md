# AnswerDesk AI 再デプロイ Runbook（実績版）

2026-09-02 に App Runner + RDS + Amplify で復旧した際の実際の構成・手順の記録。
IaC は無く全て AWS CLI で構築。リージョンは `ap-northeast-1`、アカウント `389323710086`。

---

## 1. 作成済みリソース一覧

| 種別 | 名前 / ID | 備考 |
|---|---|---|
| ECR | `answerdesk-api` | `389323710086.dkr.ecr.ap-northeast-1.amazonaws.com/answerdesk-api` |
| S3 | `answerdesk-prod-documents` | 非公開・SSE(AES256)・Public Access Block 全 ON |
| RDS | `answerdesk-prod-db` | PostgreSQL 16.15 / db.t4g.micro / 20GB gp3 / 非公開 / backup 1日 |
| DB サブネットグループ | `answerdesk-subnet-group` | デフォルト VPC の 3 サブネット |
| SG (App Runner) | `answerdesk-apprunner-sg` = `sg-066ff9af74f497d55` | VPC コネクタ用。現在は未使用（§9 参照） |
| SG (RDS) | `answerdesk-rds-sg` = `sg-071495e829d280283` | **5432 を `0.0.0.0/0` から許可**（§9 参照） |
| VPC コネクタ | `answerdesk-vpc-connector` | 現在 App Runner から未使用（egress を DEFAULT に変更したため） |
| IAM ロール | `AppRunnerECRAccessRole` | `AWSAppRunnerServicePolicyForECRAccess` アタッチ（イメージ pull 用） |
| IAM ロール | `AnswerDeskAppRunnerInstanceRole` | インライン: S3(`answerdesk-prod-documents`) + `secretsmanager:GetSecretValue`(`answerdesk/prod`) |
| Secrets Manager | `answerdesk/prod` | JSON: `OPENAI_API_KEY` / `DATABASE_URL` / `JWT_SECRET` / `SEED_SECRET` / `SEED_ADMIN_PASSWORD` |
| App Runner | `answerdesk-api` | 0.25 vCPU / 0.5 GB / **egress=DEFAULT（パブリック）** / AutoDeploy ON / health `/health` |
| RDS 公開設定 | `PubliclyAccessible=true` | App Runner から OpenAI に到達させるため（§9 参照） |
| Amplify | `answerdesk-ai` (`d13qbmjdi3fays`) | 既存。`main` 自動ビルド。env `VITE_API_BASE_URL` |

フロント URL: `https://main.d13qbmjdi3fays.amplifyapp.com`
バックエンド URL: App Runner サービスの `ServiceUrl`（作り直すたびに変わる）

---

## 2. 環境変数 / シークレット

App Runner の平文環境変数（`RuntimeEnvironmentVariables`）:

```
APP_ENV=prod
LOG_LEVEL=INFO
FRONTEND_BASE_URL=https://main.d13qbmjdi3fays.amplifyapp.com
OPENAI_CHAT_MODEL=gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_REQUEST_TIMEOUT_SECONDS=30
JWT_EXPIRES_IN=86400
COOKIE_SECURE=true
COOKIE_SAMESITE=none
AWS_REGION=ap-northeast-1
S3_BUCKET_NAME=answerdesk-prod-documents
MAX_UPLOAD_FILE_SIZE_MB=20
ALLOWED_UPLOAD_MIME_TYPES=application/pdf
VECTOR_TOP_K=5
RAG_SCORE_THRESHOLD=0.75
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_NAME=Admin
```

Secrets Manager 参照（`RuntimeEnvironmentSecrets`、`answerdesk/prod` の JSON キー）:

```
OPENAI_API_KEY, DATABASE_URL, JWT_SECRET, SEED_SECRET, SEED_ADMIN_PASSWORD
```

- `COOKIE_SECURE=true` + `COOKIE_SAMESITE=none` は必須（フロントと API がクロスサイトのため）
- `SQS_QUEUE_URL` は未設定 → PDF 取り込みは FastAPI 内 `BackgroundTasks` で同期実行

---

## 3. ゼロから作り直す手順（CLI）

前提: AdministratorAccess 相当の権限、Docker 稼働。

```bash
REGION=ap-northeast-1
VPC=vpc-04f50f8ae3b6d3fe6
ECR_URI=389323710086.dkr.ecr.ap-northeast-1.amazonaws.com/answerdesk-api

# 1. シークレット生成
JWT_SECRET=$(openssl rand -hex 32)
SEED_SECRET=$(openssl rand -hex 16)
DB_PASSWORD=$(openssl rand -hex 20)

# 2. ECR
aws ecr create-repository --repository-name answerdesk-api --region $REGION

# 3. S3
aws s3api create-bucket --bucket answerdesk-prod-documents --region $REGION \
  --create-bucket-configuration LocationConstraint=$REGION
aws s3api put-public-access-block --bucket answerdesk-prod-documents \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# 4. SG
APPRUNNER_SG=$(aws ec2 create-security-group --group-name answerdesk-apprunner-sg \
  --description "App Runner VPC connector" --vpc-id $VPC --query GroupId --output text --region $REGION)
RDS_SG=$(aws ec2 create-security-group --group-name answerdesk-rds-sg \
  --description "RDS Postgres" --vpc-id $VPC --query GroupId --output text --region $REGION)
aws ec2 authorize-security-group-ingress --group-id $RDS_SG --protocol tcp --port 5432 \
  --source-group $APPRUNNER_SG --region $REGION

# 5. RDS（サブネットグループ→インスタンス。10分待ち）
aws rds create-db-subnet-group --db-subnet-group-name answerdesk-subnet-group \
  --db-subnet-group-description "default vpc" --region $REGION \
  --subnet-ids subnet-0258256c2dc597ae3 subnet-0426a4d1d2b5e69b4 subnet-0446cef1bf6b45999
aws rds create-db-instance --db-instance-identifier answerdesk-prod-db --db-name answerdesk \
  --engine postgres --engine-version 16.15 --db-instance-class db.t4g.micro \
  --allocated-storage 20 --storage-type gp3 --master-username answerdesk \
  --master-user-password "$DB_PASSWORD" --vpc-security-group-ids $RDS_SG \
  --db-subnet-group-name answerdesk-subnet-group --no-publicly-accessible \
  --backup-retention-period 1 --no-multi-az --region $REGION
aws rds wait db-instance-available --db-instance-identifier answerdesk-prod-db --region $REGION
RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier answerdesk-prod-db \
  --query 'DBInstances[0].Endpoint.Address' --output text --region $REGION)

# 6. Secrets Manager
aws secretsmanager create-secret --name answerdesk/prod --region $REGION --secret-string "$(cat <<JSON
{"OPENAI_API_KEY":"sk-...","DATABASE_URL":"postgresql://answerdesk:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/answerdesk","JWT_SECRET":"${JWT_SECRET}","SEED_SECRET":"${SEED_SECRET}","SEED_ADMIN_PASSWORD":"$(openssl rand -hex 16)"}
JSON
)"

# 7. IAM ロール2つ（AppRunnerECRAccessRole / AnswerDeskAppRunnerInstanceRole）
#    - ECR: trust=build.apprunner.amazonaws.com + AWSAppRunnerServicePolicyForECRAccess
#    - Instance: trust=tasks.apprunner.amazonaws.com + inline(S3, secretsmanager:GetSecretValue)

# 8. VPC コネクタ
aws apprunner create-vpc-connector --vpc-connector-name answerdesk-vpc-connector --region $REGION \
  --subnets subnet-0258256c2dc597ae3 subnet-0426a4d1d2b5e69b4 subnet-0446cef1bf6b45999 \
  --security-groups $APPRUNNER_SG

# 9. イメージ build & push
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin ${ECR_URI%/*}
docker build --platform linux/amd64 -t $ECR_URI:latest ./backend
docker push $ECR_URI:latest

# 10. App Runner サービス作成（apprunner-service.json は §2 の env を反映）
aws apprunner create-service --region $REGION --cli-input-json file://apprunner-service.json

# 11. Amplify を新 URL に向けて再ビルド
APPRUNNER_URL=$(aws apprunner describe-service --region $REGION \
  --service-arn <ARN> --query 'Service.ServiceUrl' --output text)
aws amplify update-app --app-id d13qbmjdi3fays --region $REGION \
  --environment-variables VITE_API_BASE_URL=https://$APPRUNNER_URL
aws amplify start-job --app-id d13qbmjdi3fays --branch-name main --job-type RELEASE --region $REGION

# 12. テーマプリセット投入（DB スキーマは起動時 entrypoint.sh の alembic upgrade head で作成済み）
curl -X POST https://$APPRUNNER_URL/api/admin/seed -H "X-Seed-Secret: $SEED_SECRET"
```

---

## 4. コード更新時の再デプロイ（CI/CD）

`main` へ push すると:
- **フロント**: Amplify が自動ビルド・デプロイ（設定不要、既存）
- **バックエンド**: GitHub Actions [`.github/workflows/deploy-backend.yml`](../.github/workflows/deploy-backend.yml) が
  `backend/**` の変更を検知して発火 → イメージを build して ECR に push → App Runner が
  `AutoDeploymentsEnabled=true` で自動ロールアウト → ワークフローが完了と `/health` を待つ。

AWS 認証は GitHub OIDC（長期キー無し）:
- OIDC プロバイダ: `token.actions.githubusercontent.com`
- IAM ロール: `answerdesk-github-actions`（信頼: `repo:kokiyamanami/answerdesk-ai:*` / 権限: ECR push + `apprunner:StartDeployment`・`DescribeService`・`ListOperations`）

手動でやる場合:
```bash
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin 389323710086.dkr.ecr.ap-northeast-1.amazonaws.com
docker build --platform linux/amd64 -t $ECR_URI:latest ./backend
docker push $ECR_URI:latest   # push で App Runner が自動再デプロイ
```

DB マイグレーションはコンテナ起動時に `alembic upgrade head`（[backend/entrypoint.sh](../backend/entrypoint.sh)）が自動実行。

---

## 5. コスト対策：使わないときは止める

```bash
# 一時停止（App Runner の課金停止。DNS は残る）
aws apprunner pause-service --service-arn <ARN> --region ap-northeast-1
# 再開
aws apprunner resume-service --service-arn <ARN> --region ap-northeast-1

# RDS 停止（最大7日で自動再開される点に注意）
aws rds stop-db-instance --db-instance-identifier answerdesk-prod-db --region ap-northeast-1
aws rds start-db-instance --db-instance-identifier answerdesk-prod-db --region ap-northeast-1
```

概算: RDS db.t4g.micro ≈ $12–14/月 + ストレージ ≈ $2/月、App Runner 稼働時 0.25vCPU/0.5GB ≈ $5/月〜。

---

## 6. 全部消す（コスト完全ゼロ）

```bash
aws apprunner delete-service --service-arn <ARN> --region ap-northeast-1
aws rds delete-db-instance --db-instance-identifier answerdesk-prod-db \
  --skip-final-snapshot --delete-automated-backups --region ap-northeast-1
aws apprunner delete-vpc-connector --vpc-connector-arn <ARN> --region ap-northeast-1
aws ecr delete-repository --repository-name answerdesk-api --force --region ap-northeast-1
aws secretsmanager delete-secret --secret-id answerdesk/prod --force-delete-without-recovery --region ap-northeast-1
aws s3 rb s3://answerdesk-prod-documents --force
# SG / サブネットグループ / IAM ロールも不要なら削除
# Amplify アプリは残しておけば無料（ホスティング従量のみ）
```

---

## 7. ボットアイコンの公開設定（対応済み 2026-09-02）

[bot.py](../backend/app/api/routers/bot.py) はアイコンを `https://<bucket>.s3.<region>.amazonaws.com/icons/<botID>/<file>` の
公開 URL として返す。バケットは Public Access Block で全ブロックだったため 403 で画像が表示されなかった。
以下で `icons/*` のみ匿名読み取りを許可（`documents/*` の PDF は非公開のまま）。

```bash
BUCKET=answerdesk-prod-documents
aws s3api put-public-access-block --bucket "$BUCKET" --region ap-northeast-1 \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false
aws s3api put-bucket-policy --bucket "$BUCKET" --region ap-northeast-1 --policy '{
  "Version":"2012-10-17",
  "Statement":[{"Sid":"PublicReadIconsOnly","Effect":"Allow","Principal":"*",
    "Action":"s3:GetObject","Resource":"arn:aws:s3:::answerdesk-prod-documents/icons/*"}]
}'
```

検証: `icons/*` は匿名 GET 200 / `documents/*` は 403 / バケット一覧は 403。

## 9. App Runner の外部通信（対応済み 2026-09-02）

**症状**: チャットだけ約90秒ハング（health / login / DB は正常）。App Runner ログに
`httpcore.ConnectTimeout` → `openai.APITimeoutError`。

**原因**: App Runner に VPC コネクタを付けると全 egress が VPC 経由になる。デフォルト VPC の
サブネットは Internet Gateway ルートのみで、App Runner の ENI にパブリック IP が付かないため
`api.openai.com` に到達不能。RDS は VPC 内なので DB 系は正常だった。回避には NAT Gateway が必須
（Tokyo で ~$45/月）。コスト回避のため以下の構成に変更:

```bash
# 1. RDS をパブリックアクセス可に（エンドポイント不変 = DATABASE_URL 変更不要）
aws rds modify-db-instance --region ap-northeast-1 \
  --db-instance-identifier answerdesk-prod-db --publicly-accessible --apply-immediately

# 2. RDS SG に 5432 インバウンド（App Runner に固定 IP が無いため 0.0.0.0/0）
aws ec2 authorize-security-group-ingress --region ap-northeast-1 \
  --group-id sg-071495e829d280283 --protocol tcp --port 5432 --cidr 0.0.0.0/0

# 3. App Runner の egress をパブリックに戻す（再デプロイ ~5分）
aws apprunner update-service --region ap-northeast-1 \
  --service-arn arn:aws:apprunner:ap-northeast-1:389323710086:service/answerdesk-api/876bf55254954f2dbaac4ca06ae2dff0 \
  --network-configuration 'EgressConfiguration={EgressType=DEFAULT}'
```

結果: チャット応答 挨拶 ~1-2秒 / RAG 質問 ~3-8秒。RDS はネット露出だが 80bit パスワード + TLS で保護。
本番でデータを持つ段階になったら NAT Gateway 構成（VPC コネクタ + private サブネット）に戻すこと。
`answerdesk-vpc-connector` と `answerdesk-apprunner-sg` は現在未使用（将来のために残置）。

## 10. 既知の課題

- **App Runner の自動デプロイ**はコード push ではなく ECR push 契機。GitHub 直結にしたい場合は App Runner のソースベース + コネクタ握手が必要。
- **RDS がインターネット露出**（§9）。パスワード認証 + TLS のみが防御。
- チャットの RAG パイプラインは最大 4 回の OpenAI 逐次呼び出し（意図分類 → embedding → 回答可否判定 → 回答生成）。0.25vCPU も相まって回答まで数秒かかる。高速化するなら意図分類/回答可否判定の統合や並列化を検討。
- 疎通確認で作成した捨てユーザー（`deploycheck@example.com` / `e2e-check@example.com` / `perf-*@example.com`）が users テーブルに残存。
