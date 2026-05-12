# AnswerDesk AI MVP最小構成（App Runner）

## 1. 目的
AnswerDesk AI を小さく始めるために、MVP段階で採用する最小AWS構成を定義する。

---

## 2. 結論
MVP初期は、以下の構成を正式採用とする。

- Frontend: **Amplify Hosting**
- Backend API: **AWS App Runner**
- Database: **RDS PostgreSQL**
- Vector Search: **pgvector**
- File Storage: **Amazon S3**
- AI: **OpenAI**
- Secrets: **Secrets Manager**
- Monitoring: **CloudWatch**
- Async Processing: **初期は簡略化**

---

## 3. なぜこの構成にするか
### 3.1 App Runner を採用する理由
- ECS + ALB より構築難易度が低い
- FastAPI をコンテナのまま公開しやすい
- HTTPS公開が比較的簡単
- MVP初期の運用負荷を下げられる

### 3.2 Worker / SQS を初期省略する理由
- 小規模MVPではPDF投入量がまだ少ない想定
- 初期から非同期構成を作るとAWS構築難易度が上がる
- まずは同期処理または簡易処理で立ち上げ、必要になったら分離する方が早い

---

## 4. 初期構成図イメージ
- ユーザー
  - Amplify Hosting 上のReact画面へアクセス
- React
  - App Runner 上のFastAPIへAPI呼び出し
- FastAPI
  - RDS PostgreSQL へ接続
  - S3 へPDF保存
  - OpenAI API を呼び出し
- CloudWatch
  - App Runner ログを収集

---

## 5. MVP初期の処理方針
### 5.1 PDFアップロード
- React から FastAPI にアップロード
- FastAPI が S3 に保存
- 初期は同期または簡易バックグラウンド処理でテキスト抽出・Embedding生成を実行

### 5.2 検索
- pgvector に保存したベクトルから類似検索

### 5.3 回答生成
- 検索結果を OpenAI に渡して回答生成

---

## 6. 後から追加するもの
利用増加時に以下を段階追加する。

- SQS
- Worker
- 本格的な非同期処理
- ECS Fargate 構成
- 監視アラーム強化

---

## 7. MVP正式採用結論
小さく始めるMVPでは、以下を採用する。

- Frontend: Amplify Hosting
- Backend: App Runner
- Database: RDS PostgreSQL
- Storage: S3
- AI: OpenAI
- Search: PostgreSQL + pgvector
