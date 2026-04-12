'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleReset = async () => {
    if (password !== password2) { setError('Паролите не съвпадат.'); return }
    if (password.length < 6) { setError('Паролата трябва да е поне 6 символа.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('Грешка при смяна на парола. Опитай отново.')
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  if (done) return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 80 }}>🎉</div>
        <h1 className="text-3xl font-bold text-gray-700 mt-4 mb-6">Паролата е сменена!</h1>
        <button onClick={() => router.push('/login')}
          className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl text-lg hover:bg-orange-600">
          🌲 Влез в гората
        </button>
      </div>
    </main>
  )

  return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 80 }}>🔒</div>
        <h1 className="text-3xl font-bold text-gray-700 mt-4 mb-6">Нова парола</h1>
        <div className="bg-white rounded-3xl p-6 shadow-lg mb-6">
          <input
            type="password"
            placeholder="Нова парола"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border-2 border-orange-200 rounded-xl p-3 mb-3 focus:border-orange-400 outline-none"
          />
          <input
            type="password"
            placeholder="Повтори паролата"
            value={password2}
            onChange={e => setPassword2(e.target.value)}
            className="w-full border-2 border-orange-200 rounded-xl p-3 mb-4 focus:border-orange-400 outline-none"
          />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button onClick={handleReset} disabled={!password || !password2 || loading}
            className="w-full bg-orange-500 text-white font-bold py-3 rounded-2xl hover:bg-orange-600 disabled:opacity-50">
            {loading ? '⏳ Сменям...' : '✓ Смени паролата'}
          </button>
        </div>
      </div>
    </main>
  )
}
