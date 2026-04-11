/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import '../dashboard/dashboard.css'

export default function Friends() {
  const router = useRouter()
  const [_profile, setProfile] = useState<any | null>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const username = localStorage.getItem('u4a_username')
    if (!username) { router.push('/login'); return }
    supabase.from('profiles').select('*').eq('username', username).single()
      .then(async ({ data }) => {
        if (!data) { router.push('/login'); return }
        setProfile(data as any)
        const { data: sess } = await supabase
          .from('dictation_sessions').select('*')
          .eq('profile_id', data.id)
          .eq('is_scan', false)
          .order('created_at', { ascending: false }).limit(20)
        setSessions(sess || [])
        setLoading(false)
      })
  }, [])

  const totalPoints = sessions.reduce((acc, s) => acc + Math.round(Math.round((s.score / s.total) * 100) / 10), 0)
  const avgPercent = sessions.length > 0 ? Math.round(sessions.reduce((acc, s) => acc + Math.round((s.score / s.total) * 100), 0) / sessions.length) : 0

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFF8F0 0%, #FEF3E2 100%)' }}>
      <div className="text-center">
        <div className="text-5xl mb-3 animate-bounce">🦊</div>
        <p style={{ color: '#F97316', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '1.2rem' }}>Зареждам...</p>
      </div>
    </main>
  )

  return (
    <div className="u4a-dash">
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

      <div className="dash-header">
        <img src="/logo-letters.png" style={{ height: 36, objectFit: 'contain' }} />
        <div style={{ width: 40 }}></div>
      </div>

      <div className="dash-content" style={{ paddingBottom: 100 }}>
        <div className="greeting-card fade-up" style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'Russo One, sans-serif', fontSize: '1.1rem', color: '#92400E', marginBottom: 12 }}>
            🏆 Твоят резултат
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.6)', borderRadius: 14, padding: 12, textAlign: 'center', border: '2px solid #FED7AA' }}>
              <div style={{ fontSize: '2rem', fontFamily: 'Russo One, sans-serif', color: '#F97316' }}>{avgPercent}%</div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#92400E' }}>Среден резултат</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.6)', borderRadius: 14, padding: 12, textAlign: 'center', border: '2px solid #FED7AA' }}>
              <div style={{ fontSize: '2rem', fontFamily: 'Russo One, sans-serif', color: '#D97706' }}>🌰 {totalPoints}</div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#92400E' }}>Жълъди</div>
            </div>
          </div>
          {sessions.length === 0 ? (
            <div style={{ textAlign: 'center', fontFamily: 'Nunito, sans-serif', color: '#7C2D12', fontSize: '0.9rem', padding: '16px 0', fontWeight: 700 }}>
              Все още няма диктовки. Започни първата си! 🦊
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.map((s, i) => {
                const percent = Math.round((s.score / s.total) * 100)
                const points = Math.round(percent / 10)
                const color = percent >= 80 ? '#16A34A' : percent >= 50 ? '#D97706' : '#EF4444'
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.5)', borderRadius: 12, padding: '8px 12px', border: '1.5px solid #FED7AA' }}>
                    <div style={{ fontSize: '1.3rem' }}>{percent >= 80 ? '🥇' : percent >= 50 ? '🥈' : '🥉'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#92400E' }}>Диктовка #{sessions.length - i}</div>
                      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: '0.75rem', color: '#D97706' }}>{s.score}/{s.total} верни · {new Date(s.created_at).toLocaleDateString('bg-BG')}</div>
                    </div>
                    <div style={{ fontFamily: 'Russo One, sans-serif', fontSize: '1.1rem', color }}>{percent}%</div>
                    <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: '0.8rem', color: '#D97706', fontWeight: 800 }}>🌰{points}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="greeting-card fade-up fade-up-1" style={{ textAlign: 'center', opacity: 0.85 }}>
          <div style={{display:"flex",justifyContent:"center",width:"100%",marginBottom:8}}><img src="/icons/friends2.png" style={{width:140,height:140,objectFit:"contain"}} /></div>
          <div style={{ fontFamily: 'Russo One, sans-serif', fontSize: '1rem', color: '#92400E', marginBottom: 8 }}>Приятели — скоро!</div>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: '0.88rem', color: '#92400E', lineHeight: 1.5 }}>
            Скоро ще можеш да последваш свой приятел, който също като теб прави диктовки, и да следиш неговия резултат. 🌰🦊
          </div>
        </div>
      </div>

      <div className="bottom-nav">
        <div className="nav-item" onClick={() => router.push('/dashboard')}>
          <span style={{background:'white',borderRadius:'50%',width:56,height:56,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:2,boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
            <img src="/icons/home.png" style={{width:36,height:36,objectFit:'contain'}} />
          </span>
          Начало
        </div>
        <div className="nav-item" onClick={() => router.push('/dictation')}>
          <span style={{background:'white',borderRadius:'50%',width:56,height:56,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:2,boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
            <img src="/icons/dictations.png" style={{width:36,height:36,objectFit:'contain'}} />
          </span>
          Диктовки
        </div>
        <div className="nav-item active">
          <span style={{background:'white',borderRadius:'50%',width:56,height:56,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:2,boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
            <img src="/icons/friends.png" style={{width:36,height:36,objectFit:'contain'}} />
          </span>
          Приятели
        </div>
        <div className="nav-item" onClick={() => router.push('/settings')}>
          <span style={{background:'white',borderRadius:'50%',width:56,height:56,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:2,boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
            <img src="/icons/settings.png" style={{width:36,height:36,objectFit:'contain'}} />
          </span>
          Настройки
        </div>
      </div>
    </div>
  )
}
