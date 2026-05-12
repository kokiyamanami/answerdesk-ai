# AnswerDesk AI AWSアーキテクチャ設計

## 1. 目的
AnswerDesk AI の無料プランをAWS上で安定運用するための基本アーキテクチャを定義する。  
対象は、管理画面、公開チャット、API、ファイル保存、非同期文書処理、DB、監視である。

---

## 2. 前提
- フロントエンド: React
- バックエンド: FastAPI
- DB: PostgreSQL + pgvector
- ファイル保存: S3
- 非同期処理あり
- 公開チャットは匿名アクセス
- 管理画面は認証必須
- 1ユーザー = 1ボット

---

## 3. 全体構成

### 3.1 フロントエンド
- **AWS Amplify Hosting** または **S3 + CloudFront** でReactアプリを配信
- 管理画面とLPを同一フロントエンドで構成可能
- 公開チャット画面も同一フロントエンド内ルーティングで提供可能

### 3.2 API
- **Amazon ECS Fargate** 上で FastAPI を稼働
- **Application Load Balancer (ALB)** 経由でHTTPS公開
- 管理画面APIと公開APIを同一サービス内で提供可能

### 3.3 データベース
- **Amazon RDS for PostgreSQL** を利用
- pgvector拡張を有効化
- アプリケーションデータとベクトルデータを同一DBで管理

### 3.4 ファイル保存
- **Amazon S3** にPDFやアイコン画像を保存
- アップロード文書、公開画像、必要に応じて生成物を保存

### 3.5 非同期処理
- **Amazon SQS** に文書処理ジョブを投入
- **ECS Fargate Worker** または **AWS Lambda** でジョブを処理
- 処理内容:
  - PDFテキスト抽出
  - チャンク分割
  - Embedding生成
  - DB保存

### 3.6 監視
- **Amazon CloudWatch Logs** でAPI/Workerログを収集
- **CloudWatch Metrics / Alarms** で異常検知
- 必要に応じて **AWS X-Ray** でトレーシング

---

## 4. 推奨構成

### 4.1 MVP向け最小構成
- フロント: Amplify Hosting
- API: ECS Fargate + ALB
- DB: RDS PostgreSQL
- ストレージ: S3
- 非同期: SQS + ECS Worker
- 監視: CloudWatch

この構成は以下の理由でMVPに向く。
- 構成がわかりやすい
- FastAPIと相性が良い
- 将来のスケールに対応しやすい
- PDF処理のような非同期ワークロードを分離できる

---

## 5. ネットワーク構成

### 5.1 VPC
- 1つのVPCを作成
- 2 Availability Zones 以上を利用

### 5.2 サブネット
- Public Subnet
  - ALB
- Private Subnet
  - ECS Fargate API
  - ECS Worker
  - RDS PostgreSQL

### 5.3 セキュリティ
- RDSはPrivate Subnetのみ
- ECSからRDSへのみ接続許可
- S3はIAMポリシーで制御
- Secretsは **AWS Secrets Manager** で管理

---

## 6. リクエストフロー

### 6.1 管理画面アクセス
1. ユーザーがフロントエンドへアクセス
2. ReactアプリがCloudFront/Amplifyから配信される
3. 管理画面からAPIへHTTPSリクエスト
4. ALB経由でFastAPIへ到達
5. FastAPIがRDS/S3にアクセス

### 6.2 PDFアップロード
1. 管理画面からPDFアップロード
2. APIがS3へ保存
3. APIがSQSへ文書処理ジョブを投入
4. Workerがジョブを取得
5. PDFを解析し、チャンク生成・Embedding生成
6. RDS PostgreSQL に保存

### 6.3 公開チャット
1. 匿名ユーザーが公開URLへアクセス
2. Reactアプリが公開チャット画面を表示
3. フロントが slug を使って公開ボット情報取得APIを呼ぶ
4. メッセージ送信時に公開チャットAPIを呼ぶ
5. APIがRDSからボット設定・チャンクを参照し応答生成

---

## 7. 認証設計

### 7.1 管理画面
候補:
- FastAPIアプリ内JWT認証
- **Amazon Cognito** 利用

MVPでは以下のどちらかを推奨:
- 実装スピード重視: FastAPI + JWT
- AWS統合重視: Cognito

### 7.2 公開チャット
- 匿名利用のため認証なし
- 必要に応じてレート制限を導入

---

## 8. セキュリティ設計
- ALBでHTTPS終端
- AWS WAF の導入を検討
- S3バケットは非公開
- アップロードファイルのMIME/typeチェック
- Secrets Managerで機密情報管理
- IAM最小権限
- RDS自動バックアップ有効化

---

## 9. スケーリング方針

### 9.1 API
- ECS Fargate Auto Scaling を設定
- CPU/メモリ/ALBリクエスト数でスケール

### 9.2 Worker
- SQSキュー長に応じてWorker数を調整

### 9.3 DB
- 初期はシングルAZでもよいが、本番はMulti-AZ推奨
- 読み負荷増加時はリードレプリカ検討

---

## 10. 監視・運用
- APIエラーレート監視
- Worker失敗ジョブ監視
- SQS滞留監視
- RDS CPU/接続数/ストレージ監視
- CloudWatch Alarm で通知
- 重要イベントは将来的に Slack 通知連携

---

## 11. 今後の拡張
- 独自ドメイン対応時の Route 53 / ACM 連携
- 埋め込みウィジェット向け配信構成追加
- OpenSearch 等の導入検討
- ElastiCache によるキャッシュ追加
- 分析基盤の分離

---

## 12. 推奨結論
無料プランMVPとしては、以下の構成を推奨する。

- フロントエンド: Amplify Hosting
- API: ECS Fargate + ALB
- DB: RDS PostgreSQL + pgvector
- ストレージ: S3
- 非同期処理: SQS + ECS Worker
- 監視: CloudWatch
- シークレット管理: Secrets Manager

この構成は、実装・運用・将来拡張のバランスがよい。 
