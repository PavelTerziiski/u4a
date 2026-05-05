'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Pronunciation() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const username = localStorage.getItem('u4a_username')
    if (!username) { router.push('/login'); return }
    supabase.from('profiles').select('*').eq('username', username).single()
      .then(({ data }) => {
        if (!data) { router.push('/login'); return }
        setProfile(data)
      })
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FFF8F0 0%, #FEF3E2 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', marginBottom: '1rem' }}>←</button>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: '#7C3AED', marginBottom: '0.5rem' }}>🗣️ Правоговор</h1>
        <p style={{ fontFamily: 'Nunito, sans-serif', color: '#92400E', marginBottom: '2rem' }}>Избери ниво:</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: 'white', border: 'none', borderRadius: 16, padding: '1.2rem', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>
            🔤 Азбука и звуци
          </button>
          <button style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: 'white', border: 'none', borderRadius: 16, padding: '1.2rem', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', opacity: 0.5 }}>
            📝 Думи (скоро)
          </button>
          <button style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: 'white', border: 'none', borderRadius: 16, padding: '1.2rem', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', opacity: 0.5 }}>
            💬 Изречения (скоро)
          </button>
        </div>
      </div>
    </main>
  )
}
