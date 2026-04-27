'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import '../dashboard/dashboard.css'

const AVATARS = [
  { id: 1, file: 'fox.png', name: 'Лисиче' },
  { id: 2, file: 'bear.png', name: 'Мече' },
  { id: 3, file: 'owl.png', name: 'Бухалче' },
  { id: 4, file: 'squirrel.png', name: 'Катеричка' },
  { id: 5, file: 'deer.png', name: 'Еленче' },
  { id: 6, file: 'rabbit.png', name: 'Зайче' },
  { id: 7, file: 'hedgehog.png', name: 'Ежко Бежко' },
  { id: 8, file: 'wolf.png', name: 'Вълче' },
]

const PLAN_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  free: { label: 'Пробен период', emoji: '🎯', color: '#F97316' },
  premium: { label: 'Premium', emoji: '⭐', color: '#F97316' },
  max: { label: 'Max', emoji: '👑', color: '#7C3AED' },
}

export default function Settings() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<number>(1)
  const [selectedVoice, setSelectedVoice] = useState<string>('kalina')
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

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
        if (data.is_parent) { router.push('/parent-dashboard'); return }
        setProfile(data)
        setDisplayName(data.fox_name || data.username)
        setSelectedAvatar(data.avatar_id || 1)
        setSelectedVoice(data.preferred_voice || 'kalina')
        setLoading(false)
      })
  }, [])

  const playVoicePreview = async (voice: string) => {
    if (playingVoice) return
    setPlayingVoice(voice)
    try {
      const res = await fetch('/api/tts-azure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: voice === 'borisslav' ? 'Здравей! Аз съм Твоят Горски Учител и ще те науча да пишеш без грешки.' : 'Здравей, мило дете! Аз съм твоят горски учител. Готово ли си да учим днес?',
          voice,
          speed: 1
        })
      })
      const blob = await res.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const ctx = new (window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext)()
      ctx.decodeAudioData(arrayBuffer, (decoded) => {
        const source = ctx.createBufferSource()
        source.buffer = decoded
        source.connect(ctx.destination)
        source.onended = () => setPlayingVoice(null)
        source.start(0)
      }, () => setPlayingVoice(null))
    } catch {
      setPlayingVoice(null)
    }
  }

  const handleUpgrade = async () => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile?.id, username: profile?.username })
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  const handlePortal = async () => {
    if (!profile) return
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      // ignore
    }
    setPortalLoading(false)
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        fox_name: displayName,
        avatar_id: selectedAvatar,
        preferred_voice: selectedVoice,
      })
      .eq('id', profile.id)
    setSaving(false)
    if (!error) {
      setSavedMsg('Запазено! ✅')
      setTimeout(() => setSavedMsg(''), 2500)
      setProfile({ ...profile, fox_name: displayName, avatar_id: selectedAvatar, preferred_voice: selectedVoice })
    }
  }

  const currentPlan = profile?.plan_type || 'free'
  const isTrial = !profile?.is_premium && (profile?.total_sessions || 0) < 6
  const planInfo = PLAN_LABELS[currentPlan] || PLAN_LABELS['free']


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
        <button className="icon-btn" onClick={() => router.push('/dashboard')} title="Назад">←</button>
        <div className="dash-logo" style={{display:"flex",alignItems:"center",gap:8}}><img src="/logo.png" style={{height:40,objectFit:"contain"}} /><span>Настройки {currentPlan === 'max' ? '🌍 Max' : currentPlan === 'premium' ? '⭐ Premium' : ''}</span></div>
        <div style={{ width: 40 }}></div>
      </div>

      <div className="dash-content" style={{ paddingBottom: 100 }}>

        {/* ПЛАНОВЕ */}
        <div className="greeting-card fade-up" style={{ marginBottom: 16, background: currentPlan === 'max' ? 'linear-gradient(135deg, #EDE9FE, #F5F3FF)' : 'white', border: currentPlan === 'max' ? '2px solid #A78BFA' : '2px solid #FED7AA' }}>
          <div style={{ fontFamily: 'Russo One, sans-serif', fontSize: '1rem', color: currentPlan === 'max' ? '#5B21B6' : '#92400E', marginBottom: 12 }}>
            💳 Моят план
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '2rem' }}>{planInfo.emoji}</span>
              <div>
                <div style={{ fontFamily: 'Russo One, sans-serif', fontSize: '1.2rem', color: planInfo.color }}>{planInfo.label}</div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: '0.75rem', color: '#92400E' }}>
                  {currentPlan === 'free' && '6 безплатни диктовки'}
                  {currentPlan === 'premium' && 'Неограничени диктовки'}
                  {currentPlan === 'max' && 'Всичко + чужди езици'}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {currentPlan !== 'max' && (
              <button onClick={() => router.push('/plans')} style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', background: currentPlan === 'max' ? '#7C3AED' : '#F97316', color: 'white', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>
                ⬆️ Смени план
              </button>
            )}
            {currentPlan !== 'free' && (
              <button onClick={handlePortal} disabled={portalLoading} style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: '2px solid #FED7AA', background: 'white', color: '#92400E', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', opacity: portalLoading ? 0.6 : 1 }}>
                {portalLoading ? '⏳...' : '⚙️ Управлявай'}
              </button>
            )}
          </div>
        </div>

        {/* ИМЕ */}
        <div className="greeting-card fade-up" style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'Russo One, sans-serif', fontSize: '1rem', color: '#92400E', marginBottom: 10 }}>
            ✏️ Показвано име
          </div>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            maxLength={20}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 12,
              border: '2px solid #FED7AA', fontFamily: 'Nunito, sans-serif',
              fontWeight: 700, fontSize: '1rem', color: '#92400E',
              background: '#FFFBF5', outline: 'none', boxSizing: 'border-box'
            }}
          />
          <div style={{ fontSize: '0.75rem', color: '#D97706', marginTop: 6, fontFamily: 'Nunito, sans-serif' }}>
            Това е името на твоята лисица
          </div>
        </div>

        {/* АВАТАР */}
        <div className="greeting-card fade-up fade-up-1" style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'Russo One, sans-serif', fontSize: '1rem', color: '#92400E', marginBottom: 12 }}>
            🐾 Избери аватар
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {AVATARS.map(av => (
              <div
                key={av.id}
                onClick={() => setSelectedAvatar(av.id)}
                style={{
                  borderRadius: 14, padding: 6,
                  border: selectedAvatar === av.id ? '3px solid #F97316' : '3px solid transparent',
                  background: selectedAvatar === av.id ? '#FFF7ED' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s'
                }}
              >
                <img src={`/avatars/${av.file}`} alt={av.name} style={{ width: '100%', borderRadius: 10 }} />
                <div style={{ fontSize: '0.65rem', fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#92400E', marginTop: 3 }}>
                  {av.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ГЛАСОВЕ */}
        <div className="greeting-card fade-up fade-up-2" style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'Russo One, sans-serif', fontSize: '1rem', color: '#92400E', marginBottom: 12 }}>
            🎙️ Глас на лисицата
          </div>

          <div
            onClick={() => (profile?.is_premium || isTrial) && setSelectedVoice('kalina')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 14,
              border: selectedVoice === 'kalina' ? '2.5px solid #F97316' : '2px solid #FED7AA',
              background: selectedVoice === 'kalina' ? '#FFF7ED' : 'rgba(255,255,255,0.5)',
              marginBottom: 10,
              cursor: (profile?.is_premium || isTrial) ? 'pointer' : 'default',
              opacity: (profile?.is_premium || isTrial) ? 1 : 0.6
            }}
          >
            <div style={{ fontSize: '1.8rem' }}>🦊</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#92400E', fontSize: '0.95rem' }}>Госпожа Лисица</div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: '0.75rem', color: '#D97706' }}>Женски глас · топъл и приказен</div>
            </div>
            {(profile?.is_premium || isTrial) ? (
              <button
                onClick={e => { e.stopPropagation(); playVoicePreview('kalina') }}
                style={{
                  background: playingVoice === 'kalina' ? '#FED7AA' : '#F97316',
                  color: 'white', border: 'none', borderRadius: 99,
                  padding: '6px 12px', fontFamily: 'Nunito, sans-serif',
                  fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer'
                }}
              >
                {playingVoice === 'kalina' ? '▶ ...' : '▶ Чуй'}
              </button>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#F97316', fontFamily: 'Nunito, sans-serif', fontWeight: 800 }}>🔒</div>
            )}
          </div>

          <div
            onClick={() => (profile?.is_premium || isTrial) && setSelectedVoice('borisslav')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 14,
              border: selectedVoice === 'borisslav' ? '2.5px solid #F97316' : '2px solid #FED7AA',
              background: selectedVoice === 'borisslav' ? '#FFF7ED' : 'rgba(255,255,255,0.5)',
              marginBottom: 10,
              cursor: (profile?.is_premium || isTrial) ? 'pointer' : 'default',
              opacity: (profile?.is_premium || isTrial) ? 1 : 0.6
            }}
          >
            <div style={{ fontSize: '1.8rem' }}>🦉</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#92400E', fontSize: '0.95rem' }}>Господин Бухал</div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: '0.75rem', color: '#D97706' }}>Мъжки глас · мъдър и спокоен</div>
            </div>
            {(profile?.is_premium || isTrial) ? (
              <button
                onClick={e => { e.stopPropagation(); playVoicePreview('borisslav') }}
                style={{
                  background: playingVoice === 'borisslav' ? '#FED7AA' : '#F97316',
                  color: 'white', border: 'none', borderRadius: 99,
                  padding: '6px 12px', fontFamily: 'Nunito, sans-serif',
                  fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer'
                }}
              >
                {playingVoice === 'borisslav' ? '▶ ...' : '▶ Чуй'}
              </button>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#F97316', fontFamily: 'Nunito, sans-serif', fontWeight: 800 }}>🔒</div>
            )}
          </div>

          {/* Max гласове */}
          <div
            onClick={() => (profile?.plan_type === 'max' || isTrial) && setSelectedVoice('koala')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 14,
              border: selectedVoice === 'koala' ? '2.5px solid #7C3AED' : '2px solid #DDD6FE',
              background: selectedVoice === 'koala' ? '#EDE9FE' : 'rgba(255,255,255,0.5)',
              marginBottom: 10,
              cursor: (profile?.plan_type === 'max' || isTrial) ? 'pointer' : 'default',
              opacity: (profile?.plan_type === 'max' || isTrial) ? 1 : 0.5
            }}
          >
            <div style={{ fontSize: '1.8rem' }}>🐨</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#5B21B6', fontSize: '0.95rem' }}>Госпожа Коала</div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: '0.75rem', color: '#7C3AED' }}>Многоезичен женски глас · EN & DE</div>
            </div>
            {(profile?.plan_type === 'max' || isTrial) ? (
              <button
                onClick={e => { e.stopPropagation(); playVoicePreview('koala') }}
                style={{
                  background: playingVoice === 'koala' ? '#DDD6FE' : '#7C3AED',
                  color: 'white', border: 'none', borderRadius: 99,
                  padding: '6px 12px', fontFamily: 'Nunito, sans-serif',
                  fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer'
                }}
              >
                {playingVoice === 'koala' ? '▶ ...' : '▶ Чуй'}
              </button>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#7C3AED', fontFamily: 'Nunito, sans-serif', fontWeight: 800 }}>🔒 Max</div>
            )}
          </div>

          <div
            onClick={() => (profile?.plan_type === 'max' || isTrial) && setSelectedVoice('straus')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 14,
              border: selectedVoice === 'straus' ? '2.5px solid #7C3AED' : '2px solid #DDD6FE',
              background: selectedVoice === 'straus' ? '#EDE9FE' : 'rgba(255,255,255,0.5)',
              marginBottom: 10,
              cursor: (profile?.plan_type === 'max' || isTrial) ? 'pointer' : 'default',
              opacity: (profile?.plan_type === 'max' || isTrial) ? 1 : 0.5
            }}
          >
            <div style={{ fontSize: '1.8rem' }}>🦒</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#5B21B6', fontSize: '0.95rem' }}>Господин Жираф</div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: '0.75rem', color: '#7C3AED' }}>Многоезичен мъжки глас · EN & DE</div>
            </div>
            {(profile?.plan_type === 'max' || isTrial) ? (
              <button
                onClick={e => { e.stopPropagation(); playVoicePreview('straus') }}
                style={{
                  background: playingVoice === 'straus' ? '#DDD6FE' : '#7C3AED',
                  color: 'white', border: 'none', borderRadius: 99,
                  padding: '6px 12px', fontFamily: 'Nunito, sans-serif',
                  fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer'
                }}
              >
                {playingVoice === 'koala' ? '▶ ...' : '▶ Чуй'}
              </button>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#7C3AED', fontFamily: 'Nunito, sans-serif', fontWeight: 800 }}>🔒 Max</div>
            )}
          </div>

          {!profile?.is_premium && !isTrial && (
            <button onClick={handleUpgrade} style={{
              background: '#F97316', color: 'white', border: 'none',
              borderRadius: 12, padding: '10px 0', width: '100%',
              fontFamily: 'Nunito, sans-serif', fontWeight: 800,
              fontSize: '0.95rem', cursor: 'pointer', marginTop: 8
            }}>🌰 Стани Premium · 4.50€/мес</button>
          )}
        </div>

        <button
          className="main-btn fade-up fade-up-3"
          onClick={handleSave}
          disabled={saving}
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {saving ? '⏳ Запазвам...' : '💾 Запази промените'}
        </button>

        {savedMsg && (
          <div style={{
            textAlign: 'center', fontFamily: 'Nunito, sans-serif',
            fontWeight: 800, fontSize: '1rem', color: '#16A34A',
            marginTop: 12
          }}>
            {savedMsg}
          </div>
        )}

      </div>

      <div style={{ textAlign: 'center', padding: '16px 0 8px', color: '#92400E', fontFamily: 'Nunito, sans-serif', fontSize: '0.85rem' }}>
        Въпроси? Пишете ни на <a href="mailto:roditelyat@gmail.com" style={{ color: '#F97316', fontWeight: 700 }}>roditelyat@gmail.com</a>
      </div>
      <div className="bottom-nav">
        <div className="nav-item" onClick={() => router.push('/dashboard')}>
          <span style={{background:'white',borderRadius:'50%',width:72,height:72,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:2,boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
            <img src="/icons/home.png" style={{width:44,height:44,objectFit:'contain'}} />
          </span>
          Начало
        </div>
        <div className="nav-item" onClick={() => router.push('/dictation')}>
          <span style={{background:'white',borderRadius:'50%',width:72,height:72,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:2,boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
            <img src="/icons/dictations.png" style={{width:44,height:44,objectFit:'contain'}} />
          </span>
          Диктовки
        </div>
        <div className="nav-item" onClick={() => router.push('/friends')}>
          <span style={{background:'white',borderRadius:'50%',width:72,height:72,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:2,boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
            <img src="/icons/friends.png" style={{width:44,height:44,objectFit:'contain'}} />
          </span>
          Приятели
        </div>
        <div className="nav-item active">
          <span style={{background:'white',borderRadius:'50%',width:72,height:72,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:2,boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
            <img src="/icons/settings.png" style={{width:44,height:44,objectFit:'contain'}} />
          </span>
          Настройки
        </div>
        <div className="nav-item" onClick={() => router.push('/parent-view')}>
          <span style={{background:'white',borderRadius:'50%',width:56,height:56,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:2,boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
            <span style={{fontSize:28}}>👨‍👩‍👧</span>
          </span>
          За родителя
        </div>
      </div>
    </div>
  )
}
