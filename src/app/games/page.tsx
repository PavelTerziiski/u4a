'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Fox from '@/components/fox/Fox'
import '../dashboard/dashboard.css'

export default function GamesPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const username = localStorage.getItem('u4a_username')
    if (!username) { router.push('/login'); return }
    supabase.from('profiles').select('*').eq('username', username).single()
      .then(({ data }) => {
        if (!data) { router.push('/login'); return }
        // gate: only Pavel sees games for now
        if (data.email !== 'pavel.impro@gmail.com') {
          router.push('/pronunciation')
          return
        }
        setProfile(data)
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <main className="u4a-dash min-h-screen flex items-center justify-center">
      <div className="u4a-dash-overlay"></div>
      <p style={{ fontFamily: 'Nunito, sans-serif', color: '#2563EB', fontWeight: 800, position: 'relative', zIndex: 1 }}>Зареждам...</p>
    </main>
  )

  return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
        <button onClick={() => router.push('/pronunciation')} style={{
          background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer',
          position: 'absolute', top: -40, left: 0, color: '#F97316',
          fontFamily: 'Nunito, sans-serif', fontWeight: 800
        }}>← Назад</button>

        <Fox mood="excited" size={150} />

        <h1 style={{
          fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '2.2rem',
          color: '#7C3AED', marginTop: 16, marginBottom: 4
        }}>☆ Игри</h1>
        <p style={{
          fontFamily: 'Nunito, sans-serif', color: '#92400E', marginBottom: 24,
          fontSize: '0.95rem'
        }}>Учи се докато играеш</p>

        <button onClick={() => router.push('/games/cube')} style={{
          width: '100%', background: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
          color: 'white', border: 'none', borderRadius: 20, padding: '1.4rem',
          fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.3rem',
          cursor: 'pointer', boxShadow: '0 8px 24px rgba(167,139,250,0.4)', marginBottom: 14
        }}>🎲 Куб Игра</button>

        <div style={{
          width: '100%', background: '#F3F4F6', border: '2px dashed #D1D5DB',
          borderRadius: 20, padding: '1.4rem', color: '#9CA3AF',
          fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.1rem'
        }}>🎡 Колелото говори (скоро)</div>
      </div>
    </main>
  )
}
