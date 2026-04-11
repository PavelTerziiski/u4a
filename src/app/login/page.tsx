'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import '../dashboard/dashboard.css'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      })
      if (error || !data.user) throw new Error('Грешен имейл или парола')
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', data.user.id)
        .single()
      if (!profile) throw new Error('Профилът не е намерен')
      localStorage.setItem('u4a_username', profile.username)
      router.push('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка')
    } finally {
      setLoading(false)
    }
  }

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
        <img src="/fox-logo.png" style={{ height: 150, objectFit: 'contain', marginBottom: 4 }} alt="u4a" />
        <p style={{
          fontFamily: 'Nunito, sans-serif', fontWeight: 700,
          color: '#92400E', fontSize: '1rem', marginBottom: 28
        }}>Влез в горската школа 🌰</p>

        <div className="greeting-card" style={{ width: '100%', maxWidth: 400 }}>
          <div style={{
            fontFamily: 'Russo One, sans-serif', fontSize: '1.2rem',
            color: '#92400E', marginBottom: 20, textAlign: 'center'
          }}>
            Добре дошъл обратно! 🦊
          </div>

          <input
            type="email"
            placeholder="Имейл адрес"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12,
              border: '2px solid #FED7AA', fontFamily: 'Nunito, sans-serif',
              fontWeight: 700, fontSize: '1rem', color: '#92400E',
              background: '#FFFBF5', outline: 'none',
              boxSizing: 'border-box', marginBottom: 12
            }}
          />
          <input
            type="password"
            placeholder="Парола"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12,
              border: '2px solid #FED7AA', fontFamily: 'Nunito, sans-serif',
              fontWeight: 700, fontSize: '1rem', color: '#92400E',
              background: '#FFFBF5', outline: 'none',
              boxSizing: 'border-box', marginBottom: 20
            }}
          />

          {error && (
            <div style={{
              background: '#FEE2E2', border: '1.5px solid #FECACA',
              borderRadius: 10, padding: '8px 12px', marginBottom: 12,
              fontFamily: 'Nunito, sans-serif', fontWeight: 700,
              fontSize: '0.85rem', color: '#DC2626', textAlign: 'center'
            }}>{error}</div>
          )}

          <button
            onClick={handleLogin}
            disabled={!email || !password || loading}
            className="main-btn"
            style={{ opacity: !email || !password || loading ? 0.5 : 1, marginBottom: 16 }}
          >
            {loading ? '⏳ Влизам...' : '🚀 Влез!'}
          </button>

          <div style={{
            textAlign: 'center', fontFamily: 'Nunito, sans-serif',
            fontSize: '0.72rem', color: '#92400E', lineHeight: 1.6
          }}>
            🔒 Данните ти са защитени и никога не се споделят с трети страни.
          </div>
        </div>

        <p style={{
          fontFamily: 'Nunito, sans-serif', fontWeight: 700,
          color: '#92400E', fontSize: '0.9rem', marginTop: 20
        }}>
          Нямаш профил?{' '}
          <Link href="/register" style={{ color: '#F97316', fontWeight: 800 }}>
            Създай сега
          </Link>
        </p>
      </div>
    </div>
  )
}
