# AnswerDesk AI API設計

## 1. 前提
このAPI設計は、無料プランPRDとDB設計をもとにしたMVP向け構成である。

前提:
- 1ユーザー = 1ボット
- 管理画面APIは認証必須
- 公開チャットAPIは匿名利用可能
- 公開URLは `https://answerdesk.ai/c/{slug}` 形式
- 学習データは FAQ と PDF を対象とする
- 回答は登録ソースに根拠がある内容のみに限定する

---

## 2. API分類

### 2.1 管理画面API
- ログイン
- 自分のボット取得/更新
- FAQ CRUD
- 文書アップロード/一覧取得
- テストチャット
- 会話ログ一覧取得

### 2.2 公開API
- slug から公開ボット取得
- 公開チャット送信
- 公開会話取得（必要最低限）

---

## 3. 認証API

### POST /api/auth/login
メールアドレスとパスワードでログインする。

Request:
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Response:
```json
{
  "access_token": "jwt-token",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "Example User"
  }
}
```

### GET /api/auth/me
ログイン中ユーザー情報を取得する。

---

## 4. ボット管理API

### GET /api/bot
自分のボット情報を取得する。

### POST /api/bot
初回ボットを作成する。

Request:
```json
{
  "name": "会社FAQボット",
  "chat_title": "会社FAQボット",
  "public_slug": "company-faq"
}
```

### PATCH /api/bot
ボット設定を更新する。

更新対象例:
- `name`
- `chat_title`
- `icon_url`
- `welcome_message`
- `theme_preset_id`
- `fallback_message`
- `fallback_contact_url`
- `fallback_contact_email`
- `public_slug`
- `is_public`

### GET /api/bot/slug/check?value=company-faq
slug の利用可否を確認する。

Response:
```json
{
  "value": "company-faq",
  "available": true
}
```

---

## 5. テーマAPI

### GET /api/theme-presets
利用可能なプリセットテーマ一覧を取得する。

Response:
```json
[
  {
    "id": "uuid",
    "code": "blue",
    "name": "Blue",
    "background_color": "#F5F9FF",
    "button_color": "#2563EB",
    "bubble_color": "#DBEAFE",
    "text_color": "#111827"
  }
]
```

---

## 6. FAQ管理API

### GET /api/faqs
FAQ一覧を取得する。

### POST /api/faqs
FAQを作成する。

Request:
```json
{
  "question": "営業時間は？",
  "answer": "平日9:00〜18:00です。",
  "category": "基本情報"
}
```

### PATCH /api/faqs/{faq_id}
FAQを更新する。

### DELETE /api/faqs/{faq_id}
FAQを削除する。

補足:
- FAQ作成/更新時には `document_chunks` への再反映処理を行う

---

## 7. 文書管理API

### GET /api/documents
文書一覧を取得する。

### POST /api/documents/upload
PDFをアップロードする。

想定:
- multipart/form-data
- ファイル保存後、非同期ジョブで解析・チャンク化・Embedding生成を行う

Response:
```json
{
  "id": "uuid",
  "file_name": "faq.pdf",
  "status": "uploaded"
}
```

### GET /api/documents/{document_id}
文書詳細を取得する。

### DELETE /api/documents/{document_id}
文書を削除する。

補足:
- 削除時は関連 `document_chunks` も無効化または削除する

---

## 8. 会話ログAPI

### GET /api/conversations
簡易会話ログ一覧を取得する。

取得項目例:
- conversation_id
- started_at
- last_message_at
- latest_user_message
- latest_assistant_message
- fallback有無

---

## 10. 公開ボット取得API

### GET /api/public/bots/{slug}
公開チャット表示用にボット情報を取得する。

Response:
```json
{
  "chat_title": "会社FAQボット",
  "icon_url": "https://...",
  "welcome_message": "ご質問を入力してください。",
  "theme": {
    "code": "blue",
    "background_color": "#F5F9FF",
    "button_color": "#2563EB",
    "bubble_color": "#DBEAFE",
    "text_color": "#111827"
  }
}
```

エラー:
- slug 不存在: 404
- 非公開: 403 または専用画面用レスポンス

---

## 11. 公開チャットAPI

### POST /api/public/bots/{slug}/conversations
公開チャットの会話を開始する。

Response:
```json
{
  "conversation_id": "uuid",
  "session_token": "session-token"
}
```

### POST /api/public/bots/{slug}/messages
公開チャットで質問を送信する。

Request:
```json
{
  "conversation_id": "uuid",
  "message": "営業時間は？"
}
```

Response:
```json
{
  "answer": "営業時間は平日9:00〜18:00です。",
  "fallback": false,
  "citations": [
    {
      "title": "FAQ: 営業時間",
      "source_kind": "faq"
    }
  ]
}
```

未ヒット時Response:
```json
{
  "answer": "回答が見つかりませんでした。お問い合わせください。",
  "fallback": true,
  "contact": {
    "url": "https://example.com/contact",
    "email": "support@example.com"
  },
  "citations": []
}
```

---

## 12. エラーハンドリング方針
- 400: リクエスト不正
- 401: 未認証
- 403: 権限不足 / 非公開アクセス
- 404: リソース未存在
- 409: slug重複などの競合
- 422: バリデーションエラー
- 500: 想定外エラー

エラーレスポンス例:
```json
{
  "error": {
    "code": "slug_already_taken",
    "message": "指定されたslugは既に使用されています。"
  }
}
```

---

## 13. 今後の有料プラン拡張API候補
- CSVアップロードAPI
- 会話ログ詳細API
- 利用量可視化API
- カスタムカラーテーマ保存API
- 独自ドメイン設定API
