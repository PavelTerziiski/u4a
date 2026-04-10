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
      const data = await res.json()
      const audioBuffer = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => setPlayingVoice(null)
      audio.play()
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
        <div className="dash-logo">Настройки ⚙️</div>
        <div style={{ width: 40 }}></div>
      </div>

      <div className="dash-content" style={{ paddingBottom: 100 }}>

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

        <div className="greeting-card fade-up fade-up-2" style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'Russo One, sans-serif', fontSize: '1rem', color: '#92400E', marginBottom: 12 }}>
            🎙️ Глас на лисицата
          </div>

          <div
            onClick={() => profile?.is_premium && setSelectedVoice('kalina')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 14,
              border: selectedVoice === 'kalina' ? '2.5px solid #F97316' : '2px solid #FED7AA',
              background: selectedVoice === 'kalina' ? '#FFF7ED' : 'rgba(255,255,255,0.5)',
              marginBottom: 10,
              cursor: profile?.is_premium ? 'pointer' : 'default',
              opacity: profile?.is_premium ? 1 : 0.6
            }}
          >
            <div style={{ fontSize: '1.8rem' }}>🦊</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#92400E', fontSize: '0.95rem' }}>Госпожа Лисица</div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: '0.75rem', color: '#D97706' }}>Женски глас · топъл и приказен</div>
            </div>
            {profile?.is_premium ? (
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
            onClick={() => profile?.is_premium && setSelectedVoice('borisslav')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 14,
              border: selectedVoice === 'borisslav' ? '2.5px solid #F97316' : '2px solid #FED7AA',
              background: selectedVoice === 'borisslav' ? '#FFF7ED' : 'rgba(255,255,255,0.5)',
              marginBottom: 10,
              cursor: profile?.is_premium ? 'pointer' : 'default',
              opacity: profile?.is_premium ? 1 : 0.6
            }}
          >
            <div style={{ fontSize: '1.8rem' }}>🦉</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#92400E', fontSize: '0.95rem' }}>Господин Бухал</div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: '0.75rem', color: '#D97706' }}>Мъжки глас · мъдър и спокоен</div>
            </div>
            {profile?.is_premium ? (
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

          {!profile?.is_premium && (
            <>

              <button onClick={handleUpgrade} style={{
                background: '#F97316', color: 'white', border: 'none',
                borderRadius: 12, padding: '10px 0', width: '100%',
                fontFamily: 'Nunito, sans-serif', fontWeight: 800,
                fontSize: '0.95rem', cursor: 'pointer', marginTop: 8
              }}>🌰 Стани Premium · 4.50€/мес</button>
            </>
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
        <div className="nav-item">
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
      </div>
    </div>
  )
}
