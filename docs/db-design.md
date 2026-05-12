# AnswerDesk AI DB設計

## 1. 前提
このDB設計は、`docs/prd/free-plan.md` をもとにした無料プラン中心の構成である。

前提:
- 1ユーザー = 1ボット
- 管理者のみ認証
- 公開チャットは匿名利用
- 無料プランでは FAQ手入力 と PDFアップロード を対象とする
- 公開URLは `https://answerdesk.ai/c/{slug}` 形式とする
- `slug` は一意である
- 回答は登録済みソースの内容のみを根拠とする
- FAQもPDFも最終的には検索用チャンクへ集約する

---

## 2. テーブル一覧
無料プラン向けに必要な主テーブルは以下とする。

1. `users`
2. `theme_presets`
3. `bots`
4. `faqs`
5. `documents`
6. `document_chunks`
7. `conversations`
8. `messages`
9. `message_citations`

---

## 3. リレーション概要
- `users` 1 - 1 `bots`
- `theme_presets` 1 - N `bots`
- `bots` 1 - N `faqs`
- `bots` 1 - N `documents`
- `bots` 1 - N `document_chunks`
- `bots` 1 - N `conversations`
- `conversations` 1 - N `messages`
- `messages` 1 - N `message_citations`
- `document_chunks` 1 - N `message_citations`

---

## 4. テーブル定義

### 4.1 users
管理者アカウント。

カラム:
- `id` UUID PK
- `email` VARCHAR(255) UNIQUE NOT NULL
- `password_hash` TEXT NOT NULL
- `display_name` VARCHAR(255) NOT NULL
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `last_login_at` TIMESTAMP NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

---

### 4.2 theme_presets
無料プラン用のプリセットテーマ。

カラム:
- `id` UUID PK
- `code` VARCHAR(50) UNIQUE NOT NULL
- `name` VARCHAR(100) NOT NULL
- `background_color` CHAR(7) NOT NULL
- `button_color` CHAR(7) NOT NULL
- `bubble_color` CHAR(7) NOT NULL
- `text_color` CHAR(7) NOT NULL
- `muted_text_color` CHAR(7) NULL
- `border_color` CHAR(7) NULL
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `sort_order` INTEGER NOT NULL DEFAULT 0
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

初期テーマ例:
- `blue`
- `green`
- `purple`
- `orange`
- `neutral`

---

### 4.3 bots
ユーザーが所有するチャットボット本体。

カラム:
- `id` UUID PK
- `user_id` UUID NOT NULL UNIQUE FK -> users.id
- `name` VARCHAR(255) NOT NULL
- `public_slug` VARCHAR(120) NOT NULL UNIQUE
- `is_public` BOOLEAN NOT NULL DEFAULT FALSE
- `chat_title` VARCHAR(255) NOT NULL
- `icon_url` TEXT NULL
- `welcome_message` TEXT NULL
- `theme_preset_id` UUID NULL FK -> theme_presets.id
- `fallback_enabled` BOOLEAN NOT NULL DEFAULT TRUE
- `fallback_message` TEXT NOT NULL
- `fallback_contact_url` TEXT NULL
- `fallback_contact_email` VARCHAR(255) NULL
- `status` VARCHAR(50) NOT NULL DEFAULT 'active'
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

補足:
- `user_id` に UNIQUE 制約をつけることで 1ユーザー1ボット を保証する
- `public_slug` は公開URL用であり、全体で一意とする

---

### 4.4 faqs
手入力FAQ。

カラム:
- `id` UUID PK
- `bot_id` UUID NOT NULL FK -> bots.id
- `question` TEXT NOT NULL
- `answer` TEXT NOT NULL
- `category` VARCHAR(100) NULL
- `sort_order` INTEGER NOT NULL DEFAULT 0
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

---

### 4.5 documents
PDFアップロード文書。

カラム:
- `id` UUID PK
- `bot_id` UUID NOT NULL FK -> bots.id
- `source_type` VARCHAR(50) NOT NULL
- `file_name` VARCHAR(255) NOT NULL
- `storage_url` TEXT NOT NULL
- `mime_type` VARCHAR(100) NOT NULL
- `file_size_bytes` BIGINT NOT NULL
- `status` VARCHAR(50) NOT NULL DEFAULT 'uploaded'
- `error_message` TEXT NULL
- `processed_at` TIMESTAMP NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

想定値:
- `source_type`: `pdf`
- `status`: `uploaded`, `processing`, `processed`, `failed`

---

### 4.6 document_chunks
RAG検索対象チャンク。

FAQもPDFも、検索対象としてここに集約する。

カラム:
- `id` UUID PK
- `bot_id` UUID NOT NULL FK -> bots.id
- `source_kind` VARCHAR(50) NOT NULL
- `source_id` UUID NOT NULL
- `chunk_index` INTEGER NOT NULL
- `title` VARCHAR(255) NULL
- `content` TEXT NOT NULL
- `metadata_json` JSONB NULL
- `embedding` vector NOT NULL
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

想定値:
- `source_kind`: `faq`, `document`

補足:
- FAQ登録時もチャンク化して保存する
- pgvector利用を前提とする

---

### 4.7 conversations
公開チャットの会話単位。

カラム:
- `id` UUID PK
- `bot_id` UUID NOT NULL FK -> bots.id
- `session_token` VARCHAR(255) NOT NULL
- `channel` VARCHAR(50) NOT NULL DEFAULT 'public_web'
- `started_at` TIMESTAMP NOT NULL
- `last_message_at` TIMESTAMP NOT NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

補足:
- 匿名利用のため `user_id` は持たない

---

### 4.8 messages
会話内のメッセージ。

カラム:
- `id` UUID PK
- `conversation_id` UUID NOT NULL FK -> conversations.id
- `bot_id` UUID NOT NULL FK -> bots.id
- `role` VARCHAR(20) NOT NULL
- `message_type` VARCHAR(30) NOT NULL DEFAULT 'normal'
- `content` TEXT NOT NULL
- `retrieval_score` NUMERIC(8,5) NULL
- `fallback_triggered` BOOLEAN NOT NULL DEFAULT FALSE
- `model_name` VARCHAR(100) NULL
- `created_at` TIMESTAMP NOT NULL

想定値:
- `role`: `user`, `assistant`, `system`
- `message_type`: `normal`, `fallback`

---

### 4.9 message_citations
AI回答時に参照したソース。

カラム:
- `id` UUID PK
- `message_id` UUID NOT NULL FK -> messages.id
- `chunk_id` UUID NOT NULL FK -> document_chunks.id
- `rank_order` INTEGER NOT NULL
- `score` NUMERIC(8,5) NULL
- `created_at` TIMESTAMP NOT NULL

補足:
- 回答の根拠表示に利用する
- 1回答に複数ソースを紐づけ可能とする

---

## 5. 重要な設計判断

### 5.1 users と bots を分ける
1ユーザー1ボット前提でも、将来の拡張性を考えて分離する。

### 5.2 FAQも document_chunks に入れる
検索対象を統一し、RAG実装を簡潔にする。

### 5.3 無料プランは theme_preset_id のみ持つ
色の個別設定は有料プラン対象とし、無料プランDBには持たせない。

### 5.4 fallback設定は bots に持つ
問い合わせ導線はボット単位で管理する。

---

## 6. 将来の有料プラン拡張候補
将来有料プラン対応時に追加を検討するカラム例:

- `custom_background_color`
- `custom_button_color`
- `custom_bubble_color`
- `custom_text_color`
- `custom_border_color`
- `custom_muted_text_color`

追加テーブル候補:
- `usage_events`
- `plan_subscriptions`
- `csv_import_jobs`

---

## 7. 備考
- `bots.public_slug` は `https://answerdesk.ai/c/{slug}` の `{slug}` に対応する
- `public_slug` は自動生成 + 手動編集可の要件を前提とする
- 公開後の slug 変更時は、アプリ側でURL変更警告を表示する
