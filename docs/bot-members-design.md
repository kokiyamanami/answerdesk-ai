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

## 保留招待（pending invite）— 実装済み 2026-09-03
- `bot_invites(bot_id, email, role, invited_by)` テーブル（migration 0011）
- 招待時に未登録なら 404 ではなく pending invite として保存
- その人が register / login した時点で `_consume_pending_invites` が bot_members へ変換
- `GET /bot/members` は active + pending をまとめて返す（`status`, `user_id`/`invite_id`）
- `DELETE /bot/members/invites/{invite_id}` で取消
- メンバー画面に「招待中（未登録）」行を表示

## 今回やらなかったこと（要判断 / follow-up）
- **登録制限**: 登録は今も誰でも可能。内部ツールとして「招待経由のみ登録可」にするかは別途
- **同時編集の競合**: Bot 行は last-write-wins。必要になったら `updated_at` で楽観ロック
- editor が自分のボットを新規作成することは不可（既にメンバーのため 409）。共有ボット運用の想定通りだが、要確認

## 既知の制限: 1ユーザー = 1ボットのまま（2026-09-03 時点）

`bot_members` は「1つのボットを複数人で編集」を可能にしたが、「1人が複数のボットを編集」は**未対応**。

- `GET /api/bot` はじめ全 admin エンドポイントは `bot_id` を受け取らず、`get_user_membership` が
  「そのユーザーの所属ボットを1つだけ」返す（owner 優先 → 参加順）
- そのため、あるユーザーが複数の `bot_members` 行を持っても、UI に出るのは1つだけ。
  残りの所属は事実上見えない
- **複数のボットから招待された場合**: 行は複数できるが、編集できるのは owner のボット、
  無ければ最初に参加したボットのみ
- `create_bot` は「所属ボットが既にある」ユーザーをブロックするため、他人のボットに editor
  招待された新規ユーザーは自分のボットを作れない

### ちゃんと対応するには（別タスク）
- ルーティングを `/app/bots/:botId/...` にするか、ヘッダに「編集中のボット」セレクタを置く
- 全 admin ルーターに `bot_id` を渡し、`get_user_membership(bot_id)` でその所属を検証
- `GET /api/bots`（複数形・自分の所属一覧）を追加
- `create_bot` のブロック条件を「owner 所属が既にある」に緩める
- フロントに「現在のボット」コンテキスト（localStorage 等）

規模が大きいので、複数ボット運用が実際に必要になった段階で着手する。
