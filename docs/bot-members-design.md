# 複数ユーザーでのボット編集（bot_members）

## 目的
1つのチャットボットを複数ユーザーで編集できるようにする（社内チーム運用）。

## モデル
- 新テーブル `bot_members(id, bot_id, user_id, role, created_at)` / `UNIQUE(bot_id, user_id)`
- ロールは2段階:
  - `owner` … ボット内容の編集 + **メンバー管理**（招待/ロール変更/削除）
  - `editor` … ボット内容の編集のみ
- `bots.user_id`（作成者）はそのまま残す。認可の判定は `bot_members` に一本化
- migration `0010` で既存ボットの `user_id` を `owner` としてバックフィル

## 認可の解決（`app/api/deps.py`）
- `get_user_membership()` … ユーザーが編集権を持つボット + 所属を返す（owner 優先→参加順）。無ければ 404
- `get_user_bot()` / `find_user_bot()` … 上のボットのみ（404 / None）
- `require_bot_owner()` … owner でなければ 403

全 admin ルーター（faq / document / bot / conversation / form_submission / test_chat / test_question）の
「`Bot.user_id == current_user.id` で引く」処理をこれらに差し替え。**1ユーザー＝1ボット**の前提は維持
（複数所属時は owner のものを優先して返す）。

## API（`/api/bot/members`）
| メソッド | パス | 権限 | 説明 |
|---|---|---|---|
| GET | `/bot/members` | メンバー | 一覧 |
| POST | `/bot/members` | owner | `{email, role}` で追加。**対象は登録済みユーザーのみ**（未登録は 404） |
| PATCH | `/bot/members/{user_id}` | owner | ロール変更。最後の owner は editor にできない |
| DELETE | `/bot/members/{user_id}` | owner | 削除。最後の owner は削除不可 |

## フロント
- 新ページ `/app/members`（サイドバー「👥 メンバー」）
- owner のみ招待フォーム・ロール変更・削除が見える。editor は一覧のみ

## 今回やらなかったこと（要判断 / follow-up）
- **未登録ユーザーへの招待（pending invite）**: 現状は「先に登録して」で弾く。招待リンク/メールが必要なら `bot_invites` テーブルを追加
- **登録制限**: 登録は今も誰でも可能。内部ツールとして「招待経由のみ登録可」にするかは別途
- **同時編集の競合**: Bot 行は last-write-wins。必要になったら `updated_at` で楽観ロック
- editor が自分のボットを新規作成することは不可（既にメンバーのため 409）。共有ボット運用の想定通りだが、要確認
