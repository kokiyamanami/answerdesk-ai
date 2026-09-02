import { Link } from 'react-router-dom'
import '../admin.css'

const FEATURES = [
  { icon: '💬', title: 'FAQを登録するだけ', desc: 'よくある質問を手入力するだけで、AIが自動で回答できるようになります。' },
  { icon: '📄', title: 'PDFをそのままアップロード', desc: 'マニュアルや資料のPDFをアップロードするだけで学習データになります。' },
  { icon: '🔗', title: 'URLですぐ公開', desc: '専用URLを発行するだけで、すぐにチャットボットを公開できます。' },
  { icon: '🎨', title: 'テーマで見た目を変更', desc: 'プリセットテーマから選ぶだけで、チャット画面のデザインを変えられます。' },
  { icon: '📬', title: '未回答は問い合わせへ誘導', desc: '答えられない質問は、設定した問い合わせURLやメールへ自動で誘導します。' },
  { icon: '📱', title: 'スマホでも使いやすい', desc: '公開チャット画面はスマホ・タブレット・PCすべてに対応しています。' },
]

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'Inter','Hiragino Sans','Noto Sans JP',system-ui,sans-serif", color: 'var(--gray-800)', background: '#fff' }}>

      {/* ===== Nav ===== */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--gray-100)',
        padding: '0 16px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 30, height: 30, background: 'var(--brand)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#fff', fontWeight: 700, flexShrink: 0,
          }}>✦</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
            AnswerDesk AI
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <Link to="/login" className="btn btn-secondary" style={{ fontSize: 13, padding: '6px 14px', whiteSpace: 'nowrap' }}>
            ログイン
          </Link>
          <Link to="/register" className="btn btn-primary" style={{ fontSize: 13, padding: '6px 14px', whiteSpace: 'nowrap' }}>
            無料で始める
          </Link>
        </div>
      </nav>

      {/* ===== Hero ===== */}
      <section style={{
        background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 60%, #f0fdf4 100%)',
        padding: '96px 32px 80px',
        textAlign: 'center',
      }}>
        <span className="badge badge-indigo" style={{ marginBottom: 20, fontSize: 12 }}>
          🚀 社内向けAIチャットボット
        </span>
        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800,
          color: 'var(--gray-900)', lineHeight: 1.2,
          letterSpacing: '-1px', margin: '0 auto 20px',
          maxWidth: 700,
        }}>
          FAQとPDFだけで<br />
          <span style={{ color: 'var(--brand)' }}>AIチャットボット</span>を作ろう
        </h1>
        <p style={{
          fontSize: 18, color: 'var(--gray-500)', lineHeight: 1.7,
          maxWidth: 520, margin: '0 auto 40px',
        }}>
          専門知識は不要。FAQを登録してPDFをアップロードするだけで、
          RAG搭載のチャットボットが完成します。
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary" style={{ fontSize: 15, padding: '12px 32px' }}>
            無料で始める →
          </Link>
          <Link to="/login" style={{
            fontSize: 15, padding: '12px 32px',
            border: '1px solid var(--gray-200)', borderRadius: 8,
            color: 'var(--gray-700)', textDecoration: 'none', fontWeight: 500,
            background: '#fff',
          }}>
            ログイン
          </Link>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section style={{ padding: '80px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 700, color: 'var(--gray-900)', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
            できること
          </h2>
          <p style={{ fontSize: 15, color: 'var(--gray-500)' }}>シンプルな操作で、本格的なFAQチャットボットが構築できます。</p>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {FEATURES.map(f => (
            <div key={f.title} className="card" style={{ padding: '28px 24px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-900)', margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--gray-500)', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section style={{ background: 'var(--gray-50)', padding: '80px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 700, color: 'var(--gray-900)', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
            3ステップで公開まで
          </h2>
          <p style={{ fontSize: 15, color: 'var(--gray-500)', marginBottom: 52 }}>最短5分でチャットボットを公開できます。</p>
          <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { step: '01', icon: '📝', title: 'FAQを登録', desc: 'よくある質問と回答を入力するか、PDFをアップロードします。' },
              { step: '02', icon: '🎨', title: 'デザインを設定', desc: 'テーマを選び、タイトルと初期メッセージを設定します。' },
              { step: '03', icon: '🚀', title: 'URLで公開', desc: '公開ボタンを押すだけ。専用URLをシェアして完了です。' },
            ].map((s, i) => (
              <div key={s.step} style={{ flex: '1 1 200px', padding: '0 24px 32px', position: 'relative' }}>
                {i < 2 && (
                  <div style={{
                    position: 'absolute', top: 24, right: -12,
                    fontSize: 20, color: 'var(--gray-300)',
                    display: 'none',
                  }} className="step-arrow">→</div>
                )}
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'var(--brand)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, margin: '0 auto 16px',
                }}>
                  {s.step}
                </div>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: 'var(--gray-900)' }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--gray-500)', lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Contact ===== */}
      <section id="contact" style={{ background: 'var(--gray-50)', padding: '80px 32px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 700, color: 'var(--gray-900)', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
          お問い合わせ
        </h2>
        <p style={{ fontSize: 15, color: 'var(--gray-500)', marginBottom: 32 }}>
          ご不明点やカスタマイズのご相談はお気軽にどうぞ。
        </p>
        <a
          href="mailto:info@answerdesk.ai"
          className="btn btn-primary"
          style={{ fontSize: 15, padding: '12px 32px', textDecoration: 'none' }}
        >
          メールで問い合わせる
        </a>
      </section>

      {/* ===== Footer ===== */}
      <footer style={{
        borderTop: '1px solid var(--gray-100)', padding: '28px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, background: 'var(--brand)', borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: '#fff',
          }}>✦</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>AnswerDesk AI</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--gray-400)', margin: 0 }}>
          © 2026 AnswerDesk AI. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
