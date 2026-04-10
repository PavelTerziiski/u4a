'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import Fox from '@/components/fox/Fox'

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const username = localStorage.getItem('u4a_username')
    if (!username) { router.push('/login'); return }
    supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()
      .then(({ data }) => {
        if (!data) { router.push('/login'); return }
        setProfile(data)
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFF8F0 0%, #FEF3E2 100%)' }}>
      <div className="text-center">
        <div className="text-5xl mb-3 animate-bounce">🦊</div>
        <p style={{ color: '#F97316', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '1.2rem' }}>Зареждам...</p>
      </div>
    </main>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap');
        
        .u4a-dash {
          min-height: 100vh;
          background: linear-gradient(160deg, #FFF8F0 0%, #FEF3E2 50%, #FFF0E0 100%);
          position: relative;
          overflow-x: hidden;
        }

        .u4a-dash::before {
          content: '';
          position: fixed;
          top: -100px;
          right: -100px;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(251,146,60,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .u4a-dash::after {
          content: '';
          position: fixed;
          bottom: -100px;
          left: -100px;
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .dash-header {
          background: white;
          border-bottom: 2px solid #FED7AA;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 10;
          box-shadow: 0 2px 12px rgba(249,115,22,0.08);
        }

        .dash-logo {
          font-family: 'Fredoka One', cursive;
          font-size: 1.8rem;
          color: #F97316;
          letter-spacing: -0.5px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .icon-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 2px solid #FED7AA;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.1rem;
          transition: all 0.2s;
        }

        .icon-btn:hover {
          background: #FFF7ED;
          border-color: #F97316;
          transform: scale(1.05);
        }

        .dash-content {
          max-width: 480px;
          margin: 0 auto;
          padding: 20px 16px 100px;
          font-family: 'Nunito', sans-serif;
        }

        .greeting-card {
          background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
          border-radius: 24px;
          padding: 20px;
          color: white;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(249,115,22,0.3);
        }

        .greeting-card::before {
          content: '';
          position: absolute;
          top: -30px;
          right: -30px;
          width: 120px;
          height: 120px;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
        }

        .greeting-name {
          font-family: 'Fredoka One', cursive;
          font-size: 1.6rem;
          margin-bottom: 2px;
        }

        .greeting-sub {
          font-size: 0.9rem;
          opacity: 0.85;
          font-weight: 600;
        }

        .streak-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(255,255,255,0.2);
          border-radius: 99px;
          padding: 4px 12px;
          font-size: 0.85rem;
          font-weight: 700;
          margin-top: 10px;
          backdrop-filter: blur(4px);
        }

        .fox-section {
          display: flex;
          justify-content: center;
          margin: -10px 0 16px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .stat-card {
          background: white;
          border-radius: 20px;
          padding: 16px;
          text-align: center;
          border: 2px solid #FEE2E2;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          transition: transform 0.2s;
        }

        .stat-card:hover { transform: translateY(-2px); }
        .stat-card.green { border-color: #BBF7D0; }

        .stat-number {
          font-family: 'Fredoka One', cursive;
          font-size: 2.2rem;
          color: #F97316;
          line-height: 1;
          margin-bottom: 4px;
        }

        .stat-card.green .stat-number { color: #22C55E; }

        .stat-label {
          font-size: 0.8rem;
          color: #9CA3AF;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .premium-banner {
          background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%);
          border: 2px solid #FED7AA;
          border-radius: 20px;
          padding: 14px 16px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .premium-title { font-weight: 800; color: #92400E; font-size: 0.95rem; }
        .premium-sub { font-size: 0.8rem; color: #B45309; }

        .main-btn {
          width: 100%;
          background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
          color: white;
          font-family: 'Fredoka One', cursive;
          font-size: 1.3rem;
          padding: 18px;
          border-radius: 20px;
          border: none;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(249,115,22,0.35);
          transition: all 0.2s;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .main-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(249,115,22,0.4);
        }

        .secondary-btn {
          width: 100%;
          background: white;
          color: #F97316;
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          padding: 14px;
          border-radius: 16px;
          border: 2px solid #FED7AA;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .secondary-btn:hover { background: #FFF7ED; border-color: #F97316; }

        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 2px solid #FEE2E2;
          display: flex;
          justify-content: space-around;
          padding: 10px 0 16px;
          box-shadow: 0 -4px 16px rgba(0,0,0,0.06);
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          cursor: pointer;
          padding: 6px 16px;
          border-radius: 12px;
          transition: all 0.15s;
          font-family: 'Nunito', sans-serif;
          font-size: 0.7rem;
          font-weight: 700;
          color: #D1D5DB;
        }

        .nav-item.active { color: #F97316; background: #FFF7ED; }
        .nav-item:hover { color: #F97316; }
        .nav-icon { font-size: 1.3rem; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .fade-up { animation: fadeUp 0.4s ease both; }
        .fade-up-1 { animation-delay: 0.05s; }
        .fade-up-2 { animation-delay: 0.1s; }
        .fade-up-3 { animation-delay: 0.15s; }
        .fade-up-4 { animation-delay: 0.2s; }
        .fade-up-5 { animation-delay: 0.25s; }
      `}</style>

      <div className="u4a-dash">
        <div className="dash-header">
          <div className="dash-logo">u4a 🦊</div>
          <div className="header-actions">
            {profile?.is_premium && (
              <div style={{
                background: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)',
                border: '1.5px solid #FED7AA',
                borderRadius: '99px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#92400E',
                fontFamily: 'Nunito, sans-serif'
              }}>⭐ Premium</div>
            )}
            <button className="icon-btn" onClick={() => router.push('/voice-setup')} title="Настройки">⚙️</button>
            <button className="icon-btn" onClick={() => { localStorage.removeItem('u4a_username'); router.push('/') }} title="Излез">👋</button>
          </div>
        </div>

        <div className="dash-content">
          <div className="greeting-card fade-up">
            <div className="greeting-name">Здравей, {profile?.username}! 👋</div>
            <div className="greeting-sub">Лисицата ти се казва <strong>{profile?.fox_name}</strong></div>
            <div className="streak-badge">
              🔥 {profile?.streak} дни поред · {profile?.grade} клас
            </div>
          </div>

          <div className="fox-section fade-up fade-up-1">
            <Fox mood="happy" size={150} />
          </div>

          <div className="stats-grid fade-up fade-up-2">
            <div className="stat-card">
              <div className="stat-number">{profile?.total_sessions || 0}</div>
              <div className="stat-label">Диктовки</div>
            </div>
            <div className="stat-card green">
              <div className="stat-number">🔥 {profile?.streak || 0}</div>
              <div className="stat-label">Дни Streak</div>
            </div>
          </div>

          {!profile?.is_premium && (
            <div className="premium-banner fade-up fade-up-3">
              <div style={{ fontSize: '1.8rem' }}>⭐</div>
              <div style={{ flex: 1 }}>
                <div className="premium-title">Стани Premium</div>
                <div className="premium-sub">Неограничени диктовки · Калина & Борислав · 4.50€/мес</div>
              </div>
              <button onClick={() => router.push('/dictation')} style={{
                background: '#F97316', color: 'white', border: 'none',
                borderRadius: '10px', padding: '7px 12px',
                fontFamily: 'Nunito, sans-serif', fontWeight: 800,
                fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0
              }}>→</button>
            </div>
          )}

          <button className="main-btn fade-up fade-up-3" onClick={() => router.push('/dictation')}>
            ✏️ Започни диктовка!
          </button>

          <div className="fade-up fade-up-4">
            <button className="secondary-btn" onClick={() => router.push('/scan-dictation')}>
              📷 Снимай текст и лисицата го чете
            </button>
          </div>

          <div className="fade-up fade-up-5">
            <button className="secondary-btn" onClick={() => router.push('/voice-setup')}>
              ⚙️ Настройки
            </button>
          </div>
        </div>

        <div className="bottom-nav">
          <div className="nav-item active">
            <span className="nav-icon">🏠</span>
            Начало
          </div>
          <div className="nav-item" onClick={() => router.push('/dictation')}>
            <span className="nav-icon">📝</span>
            Диктовки
          </div>
          <div className="nav-item">
            <span className="nav-icon">👥</span>
            Приятели
          </div>
          <div className="nav-item" onClick={() => router.push('/voice-setup')}>
            <span className="nav-icon">⚙️</span>
            Настройки
          </div>
        </div>
      </div>
    </>
  )
}