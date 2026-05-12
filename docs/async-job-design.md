# AnswerDesk AI 非同期ジョブ設計

## 1. 目的
PDFアップロード後の文書解析、チャンク化、Embedding生成を安全に非同期処理するための設計を定義する。

---

## 2. 対象ジョブ
MVPでは以下を対象とする。
- PDF解析ジョブ
- チャンク生成ジョブ
- Embedding生成ジョブ

実装上は1つの文書処理ジョブにまとめてもよい。

前提:
- PDF抽出ライブラリは **PyMuPDF** を採用する
- MVPでは **テキスト抽出可能なPDFのみ対応** とする
- OCR前提PDFや画像中心PDFは対象外とする

---

## 3. 状態遷移
`documents.status` の想定値:
- `uploaded`
- `processing`
- `processed`
- `failed`

遷移:
- upload完了 → `uploaded`
- worker取得 → `processing`
- 正常終了 → `processed`
- 失敗 → `failed`

---

## 4. ジョブフロー
1. APIがPDFを受け取る
2. FastAPI から S3 に保存する
3. `documents` レコード作成
4. キューへジョブ投入
5. Workerがジョブ取得
6. `processing` に更新
7. PyMuPDF でテキスト抽出
8. テキスト抽出失敗時は `failed`
9. チャンク化
10. OpenAI Embedding API でEmbedding生成
11. `document_chunks` 保存
12. `processed` に更新

失敗時:
- `failed` に更新
- `error_message` 保存

---

## 5. 再実行方針
- failed文書は再処理可能にする
- 再実行時は旧チャンクを削除または無効化してから再投入する
- 二重実行防止のため document 単位で排他制御を検討する

---

## 6. 整合性方針
- 文書処理中は既存チャンクを残すか、再処理時のみ置換する
- 中途半端なチャンク登録を避ける
- 可能ならトランザクション単位で保存する
- 難しい場合は `is_active = false` で旧データを退避し、最後に切替する

---

## 7. 監視
- ジョブ失敗数
- 処理時間
- キュー滞留数
- 文書ごとの最終状態

---

## 8. エラー分類
- PDF読取失敗
- 非対応PDF
- テキスト抽出失敗
- Embedding API失敗
- DB保存失敗
- タイムアウト

---

## 9. 将来拡張
- OCR対応
- CSVインポートジョブ
- 再試行回数制御
- デッドレターキュー
- ジョブ進捗率表示
