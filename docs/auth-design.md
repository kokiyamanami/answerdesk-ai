# AnswerDesk AI 認証設計

## 1. 目的
管理画面にアクセスする管理者認証の方式、セッション管理、セキュリティ要件を整理する。

---

## 2. 前提
- 管理画面は認証必須
- 公開チャットは匿名利用
- 無料プランでは単一管理者利用を前提とする

---

## 3. 推奨方式
MVPでは **FastAPI + JWT** を採用し、**HttpOnly Secure Cookie** に保存する。

理由:
- 実装が比較的シンプル
- React + FastAPI 構成と相性が良い
- localStorage より安全性が高い
- 将来的に Cognito へ移行可能

---

## 4. ログインフロー
1. 管理者がメールアドレスとパスワードを入力
2. APIが資格情報を検証
3. 正常時、アクセストークンを発行
4. アクセストークンを HttpOnly Secure Cookie に保存する
5. フロントエンドは cookie 付きでAPI呼び出しを行う

---

## 5. トークン設計
### 5.1 MVP推奨
- Access Token のみで開始
- 保存先は HttpOnly Secure Cookie
- `SameSite=Lax` を基本とする
- 有効期限は短め（例: 1日）

### 5.2 将来拡張
- Refresh Token 導入
- CSRF対策強化
- Cognito 移行

---

## 6. パスワード設計
- 平文保存禁止
- `bcrypt` または同等安全なハッシュ化方式を利用
- パスワード再設定機能はMVPでは省略可

---

## 7. API保護
認証必須API:
- `/api/auth/me`
- `/api/bot`
- `/api/faqs`
- `/api/documents`
- `/api/conversations`

認可要件:
- 自分の bot のみ操作可能
- 他ユーザーの bot / FAQ / document / conversation へアクセス不可

---

## 8. エラー方針
- 未ログイン: 401
- 無効トークン: 401
- 権限不足: 403
- フロントはログイン画面へ誘導

---

## 9. 将来候補
- Amazon Cognito
- Googleログイン
- パスワードリセット
- 多要素認証
