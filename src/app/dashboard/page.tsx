'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import Fox from '@/components/fox/Fox'
import './dashboard.css'

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
      <div className="u4a-dash">
        <div className="u4a-dash-overlay"></div>
        {/* Падащи листа */}
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
        </div>

        <div className="bottom-nav">
          <div className="nav-item active">
            <span style={{background:"white",borderRadius:"50%",width:96,height:96,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:2,boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}><img src="/icons/home.png" style={{width:60,height:60,objectFit:"contain"}} /></span>
            Начало
          </div>
          <div className="nav-item" onClick={() => router.push('/dictation')}>
            <span style={{background:"white",borderRadius:"50%",width:96,height:96,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:2,boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}><img src="/icons/dictations.png" style={{width:60,height:60,objectFit:"contain"}} /></span>
            Диктовки
          </div>
          <div className="nav-item">
            <span style={{background:"white",borderRadius:"50%",width:96,height:96,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:2,boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}><img src="/icons/friends.png" style={{width:60,height:60,objectFit:"contain"}} /></span>
            Приятели
          </div>
          <div className="nav-item" onClick={() => router.push('/settings')}>
            <span style={{background:"white",borderRadius:"50%",width:96,height:96,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:2,boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}><img src="/icons/settings.png" style={{width:60,height:60,objectFit:"contain"}} /></span>
            Настройки
          </div>
        </div>
      </div>
    </>
  )
}
