import { useEffect, useState } from 'react'
import {
  fetchTestQuestions, createTestQuestion, deleteTestQuestion, runTestQuestions, extractApiError,
} from '../lib/apiClient'
import type { TestQuestion } from '../types/api'

export default function AccuracyTestPage() {
  const [items, setItems] = useState<TestQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [question, setQuestion] = useState('')
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    fetchTestQuestions().then(setItems).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleAdd = async () => {
    const q = question.trim()
    if (!q || adding) return
    setAdding(true)
    setAlert(null)
    try {
      const created = await createTestQuestion({ question: q, note: note.trim() || undefined })
      setItems(x => [...x, created])
      setQuestion('')
      setNote('')
    } catch (err) {
      setAlert({ type: 'error', msg: extractApiError(err, '追加に失敗しました。') })
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このテスト質問を削除しますか？')) return
    await deleteTestQuestion(id)
    setItems(x => x.filter(i => i.id !== id))
  }

  const handleRun = async () => {
    if (running || items.length === 0) return
    setRunning(true)
    setAlert(null)
    try {
      const updated = await runTestQuestions()
      setItems(updated)
      const fb = updated.filter(i => i.last_fallback).length
      setAlert({
        type: fb ? 'error' : 'success',
        msg: `${updated.length}件を実行しました。回答なし（フォールバック）: ${fb}件`,
      })
    } catch (err) {
      setAlert({ type: 'error', msg: extractApiError(err, '実行に失敗しました。') })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">精度テスト</h1>
        <p className="page-desc">
          想定質問を登録して一括実行し、公開前にチャットボットの回答精度を確認します。実行結果は会話ログには残りません。
        </p>
      </div>

      {alert && <div className={`alert alert-${alert.type}`} style={{ marginBottom: 16 }}>{alert.msg}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-field" style={{ marginBottom: 12 }}>
          <label className="form-label">想定質問</label>
          <input className="form-input" value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            placeholder="例: 返金はできますか？" />
        </div>
        <div className="form-field" style={{ marginBottom: 12 }}>
          <label className="form-label">メモ（任意）</label>
          <input className="form-input" value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="期待する回答の要点など" />
        </div>
        <button className="btn btn-secondary" onClick={handleAdd} disabled={adding || !question.trim()}>
          ＋ 質問を追加
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{items.length}件の質問</span>
        <button className="btn btn-primary" onClick={handleRun} disabled={running || items.length === 0}>
          {running ? '実行中…' : '▶ 一括実行'}
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ padding: 24, color: 'var(--gray-400)' }}>読み込み中...</p>
        ) : items.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🧪</div>
            想定質問を追加してください。
          </div>
        ) : (
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '28%' }}>想定質問</th>
                <th>直近の回答</th>
                <th style={{ width: 90 }}>判定</th>
                <th style={{ width: 80 }}>スコア</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id}>
                  <td style={{ verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{i.question}</div>
                    {i.note && <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{i.note}</div>}
                  </td>
                  <td style={{ verticalAlign: 'top', whiteSpace: 'pre-wrap', color: 'var(--gray-600)', fontSize: 13 }}>
                    {i.last_answer ?? <span style={{ color: 'var(--gray-300)' }}>未実行</span>}
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    {i.last_fallback == null ? (
                      <span style={{ color: 'var(--gray-300)' }}>-</span>
                    ) : i.last_fallback ? (
                      <span className="badge badge-red">回答なし</span>
                    ) : (
                      <span className="badge badge-green">回答あり</span>
                    )}
                  </td>
                  <td style={{ verticalAlign: 'top', fontVariantNumeric: 'tabular-nums', color: 'var(--gray-600)' }}>
                    {i.last_score == null ? '-' : i.last_score.toFixed(3)}
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(i.id)}>削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
