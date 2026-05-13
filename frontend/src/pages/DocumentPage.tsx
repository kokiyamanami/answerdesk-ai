import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchDocuments, uploadDocument, deleteDocument } from '../lib/apiClient'
import type { Document } from '../types/api'
import UpgradeModal from '../components/UpgradeModal'

const DOC_LIMIT = 3

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  uploaded:   { label: 'アップロード済', cls: 'badge-gray' },
  processing: { label: '処理中',         cls: 'badge-amber' },
  processed:  { label: '完了',           cls: 'badge-green' },
  failed:     { label: 'エラー',         cls: 'badge-red' },
}

export default function DocumentPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDocuments().then(res => setDocs(res)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('このドキュメントを削除しますか？')) return
    await deleteDocument(id)
    setDocs(d => d.filter(x => x.id !== id))
  }

  const atLimit = docs.length >= DOC_LIMIT

  return (
    <>
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
      <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">ドキュメント管理</h1>
          <p className="page-desc">PDFをアップロードしてRAGの検索対象にします。</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: atLimit ? 'var(--red)' : 'var(--gray-400)' }}>
            {docs.length} / {DOC_LIMIT}件
          </span>
          <button className="btn btn-primary"
            onClick={() => atLimit ? setShowUpgradeModal(true) : navigate('/app/documents/upload')}>
            ＋ PDFアップロード
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ padding: 24, color: 'var(--gray-400)' }}>読み込み中...</p>
        ) : docs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <p>ドキュメントがありません。PDFをアップロードしてください。</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ファイル名</th>
                <th style={{ width: 130 }}>ステータス</th>
                <th style={{ width: 120 }}>アップロード日</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => {
                const s = STATUS_MAP[doc.status] ?? { label: doc.status, cls: 'badge-gray' }
                return (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: 500 }}>📄 {doc.file_name}</td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td style={{ color: 'var(--gray-500)' }}>{new Date(doc.created_at).toLocaleDateString('ja-JP')}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(doc.id)}>削除</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
    </>
  )
}

export function DocumentUploadPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (!file) { setAlert({ type: 'error', msg: 'ファイルを選択してください。' }); return }
    if (!file.name.toLowerCase().endsWith('.pdf')) { setAlert({ type: 'error', msg: 'PDFファイルのみ対応しています。' }); return }
    setUploading(true); setAlert(null)
    try {
      await uploadDocument(file)
      navigate('/app/documents')
    } catch {
      setAlert({ type: 'error', msg: 'アップロードに失敗しました。' })
    } finally { setUploading(false) }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">PDFアップロード</h1>
        <p className="page-desc">アップロード後、バックグラウンドで処理されます（数分かかる場合があります）。</p>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${file ? 'var(--brand)' : 'var(--gray-200)'}`,
            borderRadius: 10, padding: '40px 24px',
            textAlign: 'center', cursor: 'pointer',
            background: file ? 'var(--brand-light)' : 'var(--gray-50)',
            transition: 'all 0.15s',
          }}
        >
          <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }}
            onChange={e => { setFile(e.target.files?.[0] ?? null); setAlert(null) }} />
          {file ? (
            <>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
              <p style={{ fontWeight: 600, margin: 0, color: 'var(--brand-dark)' }}>{file.name}</p>
              <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: '4px 0 0' }}>{(file.size / 1024).toFixed(0)} KB</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📁</div>
              <p style={{ fontWeight: 600, margin: 0 }}>クリックしてPDFを選択</p>
              <p style={{ fontSize: 12, color: 'var(--gray-400)', margin: '4px 0 0' }}>最大 10MB · PDFのみ対応</p>
            </>
          )}
        </div>

        {alert && <div className={`alert alert-${alert.type}`} style={{ marginTop: 16 }}>{alert.msg}</div>}

        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'アップロード中...' : '⬆ アップロード'}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/app/documents')}>キャンセル</button>
        </div>
      </div>
    </div>
  )
}
