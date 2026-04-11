'use client'
import Link from 'next/link'
import './dashboard/dashboard.css'

export default function Home() {
  return (
    <div className="u4a-dash" style={{ minHeight: '100vh' }}>
      <div className="u4a-dash-overlay"></div>

      <div className="falling-leaf leaf-1"><img src="/leaves/vec_red.png" alt="" /></div>
      <div className="falling-leaf leaf-2"><img src="/leaves/vec_yellow.png" alt="" /></div>
      <div className="falling-leaf leaf-3"><img src="/leaves/vec_green.png" alt="" /></div>
      <div className="falling-leaf leaf-4"><img src="/leaves/vec_puhche1.png" alt="" /></div>
      <div className="falling-leaf leaf-5"><img src="/leaves/vec_rasp.png" alt="" /></div>
      <div className="falling-leaf leaf-6"><img src="/leaves/vec_puhche2.png" alt="" /></div>
      <div className="falling-leaf leaf-7"><img src="/leaves/vec_brown.png" alt="" /></div>
      <div className="falling-leaf leaf-8"><img src="/leaves/vec_green2.png" alt="" /></div>
      <div className="falling-leaf leaf-9"><img src="/leaves/vec_strwb.png" alt="" /></div>
      <div className="falling-leaf leaf-10"><img src="/leaves/vec_blckbr.png" alt="" /></div>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', padding: '24px'
      }}>
        <img src="/fox-logo.png" style={{ height: 160, objectFit: 'contain', marginBottom: 8 }} alt="u4a" />

        <p style={{
          fontFamily: 'Nunito, sans-serif', fontWeight: 700,
          color: '#92400E', fontSize: '1.1rem', marginBottom: 32,
          textAlign: 'center'
        }}>Диктовки за деца 2–5 клас 🌰</p>

        <div className="greeting-card" style={{ width: '100%', maxWidth: 400, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🦊</div>
          <div style={{
            fontFamily: 'Nunito, sans-serif', fontWeight: 700,
            color: '#92400E', fontSize: '1rem', lineHeight: 1.6
          }}>
            Здравей! Аз съм твоята горска лисица.<br/>
            Заедно ще учим правопис! 🎉
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href="/register" style={{ textDecoration: 'none' }}>
            <button className="main-btn" style={{ width: '100%' }}>
              🚀 Започни сега!
            </button>
          </Link>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button className="secondary-btn" style={{ width: '100%', textAlign: 'center' }}>
              Вече имам профил
            </button>
          </Link>
        </div>

        <div style={{
          marginTop: 24, fontFamily: 'Nunito, sans-serif',
          fontSize: '0.72rem', color: '#92400E', textAlign: 'center'
        }}>
          🔒 Данните ти са защитени и никога не се споделят с трети страни.
        </div>
      </div>
    </div>
  )
}
