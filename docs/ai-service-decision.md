# AnswerDesk AI AIサービス採用方針

## 1. 結論
AnswerDesk AI のMVPでは、以下の構成を採用する。

- 回答生成: **OpenAI**
- Embedding生成: **OpenAI**
- 検索: **PostgreSQL + pgvector**

---

## 2. 採用理由

### 2.1 OpenAI を回答生成に採用する理由
- 実装情報が多く、MVP開発速度を高めやすい
- FastAPI との相性がよい
- RAG構成の実装例が豊富
- 初期段階で高品質な回答生成を行いやすい

### 2.2 OpenAI を Embedding に採用する理由
- テキストのベクトル化APIが提供されている
- FAQ、PDFチャンク、ユーザー質問を同じ方式で埋め込みできる
- pgvector と組み合わせやすい
- MVP段階で構成をシンプルに保てる

### 2.3 PostgreSQL + pgvector を検索に採用する理由
- 既存DBにベクトル検索を統合できる
- FAQ、PDF、会話参照情報を同一DBで管理できる
- MVPとして構成がわかりやすい
- 将来的に検索戦略を拡張しやすい

---

## 3. Embedding とは何か
Embedding とは、テキストを数値ベクトルに変換したものを指す。  
意味が近い文章ほど、ベクトル空間でも近くなるように変換される。

たとえば:
- 「営業時間は何時ですか？」
- 「何時から何時まで営業していますか？」

この2つは表現が違っても意味が近いため、Embeddingでも近い位置になりやすい。

RAGでは、以下をEmbedding化する。
- FAQの質問と回答
- PDFから抽出したチャンク
- ユーザーの質問

そして、ユーザー質問のEmbeddingと、保存済みチャンクのEmbeddingを比較して、意味的に近い情報を検索する。

---

## 4. OpenAI に Embedding API はあるか
ある。  
OpenAI には、テキストをEmbeddingへ変換するためのAPIがある。

用途:
- 文書チャンクのEmbedding生成
- ユーザー質問のEmbedding生成
- 類似検索用ベクトルの作成

AnswerDesk AI では、このEmbedding APIを利用して、FAQやPDFチャンクをベクトル化し、pgvector に保存する想定とする。

---

## 5. AnswerDesk AI における使い分け

### 5.1 回答生成
- OpenAI のチャット系モデルを利用する
- 検索で得たチャンクを根拠として渡す
- 根拠がない内容は回答しないようプロンプトで制御する

### 5.2 Embedding生成
- OpenAI の Embedding API を利用する
- FAQ登録時にEmbedding生成
- PDF処理時に各チャンクのEmbedding生成
- ユーザー質問時にもEmbedding生成

### 5.3 検索
- PostgreSQL + pgvector を利用する
- bot単位で検索対象を絞る
- 類似度上位のチャンクを取得する

---

## 6. 実装方針
- OpenAI 呼び出しはアプリケ��ション内でラッパー層を作る
- 回答生成クライアントとEmbedding生成クライアントを分離する
- モデル名は設定値で切り替えられるようにする
- 将来的に Bedrock 等へ差し替えできるよう抽象化する

例:
- `LLMClient`
- `EmbeddingClient`
- `VectorSearchRepository`

---

## 7. 将来拡張
将来的には以下を検討できる。

- OpenAI から AWS Bedrock への切り替え
- Embeddingモデル差し替え
- ハイブリッド検索導入
- 再ランキング導入
- キャッシュ導入

---

## 8. MVP時点の結論
MVPでは、スピードと実装容易性を優先し、以下を正式採用とする。

- 回答生成: **OpenAI**
- Embedding生成: **OpenAI**
- 検索: **PostgreSQL + pgvector**
