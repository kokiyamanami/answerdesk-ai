import { useEffect } from 'react'

interface Props {
  onClose: () => void
}

export default function UpgradeModal({ onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16,
          padding: '36px 32px', maxWidth: 420, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,.2)',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 12, textAlign: 'center' }}>⭐</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, textAlign: 'center', color: 'var(--gray-900)', marginBottom: 8 }}>
          有料プランの機能です
        </h2>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', textAlign: 'center', marginBottom: 24, lineHeight: 1.7 }}>
          この機能は有料プランでご利用いただけます。<br />アップグレードすると以下の機能が使えるようになります。
        </p>

        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: '🤖', text: 'GPT-4.1 / GPT-4o など高精度モデルの利用' },
            { icon: '🎨', text: 'カラーテーマのカスタマイズ' },
            { icon: '📊', text: '詳細な会話ログ・利用状況の分析' },
            { icon: '📥', text: 'CSVによるFAQ一括インポート' },
          ].map(item => (
            <li key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--gray-700)' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {item.text}
            </li>
          ))}
        </ul>

        <div style={{
          background: 'var(--gray-50)', borderRadius: 10,
          padding: '12px 16px', fontSize: 12, color: 'var(--gray-500)',
          textAlign: 'center', marginBottom: 20,
        }}>
          有料プランは現在準備中です。公開をお楽しみに。
        </div>

        <button
          onClick={onClose}
          className="btn btn-secondary"
          style={{ width: '100%' }}
        >
          閉じる
        </button>
      </div>
    </div>
  )
}
