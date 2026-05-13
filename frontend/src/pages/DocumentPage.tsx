import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchDocuments, uploadDocument, deleteDocument } from '../lib/apiClient'
import type { Document } from '../types/api'

const STATUS_LABEL: Record<string, string> = {
  uploaded: 'アップロード済',
  processing: '処理中',
  processed: '完了',
  failed: 'エラー',
}
const STATUS_COLOR: Record<string, string> = {
  uploaded: '#64748b',
  processing: '#d97706',
  processed: '#16a34a',
  failed: '#dc2626',
}

export default function DocumentPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDocuments()
      .then(res => setDocs(res))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await deleteDocument(id)
    setDocs(d => d.filter(x => x.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22 }}>ドキュメント管理</h1>
        <button onClick={() => navigate('/app/documents/upload')} style={primaryBtn}>+ PDFアップロード</button>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>読み込み中...</p>
      ) : docs.length === 0 ? (
        <p style={{ color: '#64748b' }}>ドキュメントがありません。</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
              <Th>ファイル名</Th>
              <Th>ステータス</Th>
              <Th>チャンク数</Th>
              <Th>アップロード日</Th>
              <Th width={80}></Th>
            </tr>
          </thead>
          <tbody>
            {docs.map(doc => (
              <tr key={doc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={td}>{doc.file_name}</td>
                <td style={td}>
                  <span style={{
                    color: STATUS_COLOR[doc.status] || '#64748b',
                    fontWeight: 500,
                  }}>
                    {STATUS_LABEL[doc.status] || doc.status}
                  </span>
                </td>
                <td style={{ ...td, color: '#64748b' }}>{doc.chunk_count ?? '—'}</td>
                <td style={{ ...td, color: '#64748b' }}>
                  {new Date(doc.created_at).toLocaleDateString('ja-JP')}
                </td>
                <td style={td}>
                  <button onClick={() => handleDelete(doc.id)} style={dangerBtn}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export function DocumentUploadPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (!file) { setError('ファイルを選択してください。'); return }
    if (!file.name.toLowerCase().endsWith('.pdf')) { setError('PDFファイルのみ対応しています。'); return }
    setUploading(true); setError(null)
    try {
      await uploadDocument(file)
      navigate('/app/documents')
    } catch {
      setError('アップロードに失敗しました。')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: 22, marginBottom: 24 }}>PDFアップロード</h1>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
        PDFファイルをアップロードすると、バックグラウンドで処理されRAGの検索対象になります。
      </p>

      <div
        onClick={() => inputRef.current?.click()}
        style={{
          border: '2px dashed #cbd5e1', borderRadius: 8, padding: 40,
          textAlign: 'center', cursor: 'pointer', marginBottom: 20,
          background: file ? '#f0fdf4' : '#f8fafc',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={e => { setFile(e.target.files?.[0] ?? null); setError(null) }}
        />
        {file ? (
          <div>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <p style={{ fontWeight: 600 }}>{file.name}</p>
            <p style={{ fontSize: 12, color: '#64748b' }}>{(file.size / 1024).toFixed(0)} KB</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
            <p>クリックしてPDFを選択</p>
            <p style={{ fontSize: 12, color: '#64748b' }}>最大 10MB</p>
          </div>
        )}
      </div>

      {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={handleUpload} disabled={uploading} style={primaryBtn}>
          {uploading ? 'アップロード中...' : 'アップロード'}
        </button>
        <button onClick={() => navigate('/app/documents')} style={outlineBtn}>キャンセル</button>
      </div>
    </div>
  )
}

function Th({ children, width }: { children?: React.ReactNode; width?: number }) {
  return (
    <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, borderBottom: '2px solid #e2e8f0', width }}>
      {children}
    </th>
  )
}

const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' }
const primaryBtn: React.CSSProperties = {
  padding: '8px 20px', background: '#2563eb', color: '#fff',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14,
}
const outlineBtn: React.CSSProperties = {
  padding: '8px 18px', background: '#fff', color: '#374151',
  border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 14,
}
const dangerBtn: React.CSSProperties = {
  padding: '6px 14px', background: '#fff', color: '#dc2626',
  border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 13,
}
