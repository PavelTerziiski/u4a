'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ForgotPassword() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleReset = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://u4a.vercel.app/reset-password',
    })
    if (error) {
      setError('Грешка. Провери имейла.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 80 }}>🦊</div>
        <h1 className="text-3xl font-bold text-gray-700 mt-4 mb-3">Провери пощата си!</h1>
        <div className="bg-white rounded-3xl p-6 shadow-lg mb-6">
          <p className="text-gray-600 mb-2">Изпратихме линк за смяна на паролата до:</p>
          <p className="text-orange-500 font-bold text-lg mb-4">{email}</p>
          <p className="text-gray-500 text-sm">🌲 Кликни на линка в имейла за да смениш паролата си.</p>
        </div>
        <button onClick={() => router.push('/login')}
          className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl text-lg hover:bg-orange-600">
          ← Към входа
        </button>
      </div>
    </main>
  )

  return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 80 }}>🔑</div>
        <h1 className="text-3xl font-bold text-gray-700 mt-4 mb-6">Забравена парола</h1>
        <div className="bg-white rounded-3xl p-6 shadow-lg mb-6">
          <p className="text-gray-500 text-sm mb-4">Въведи имейла си и ще ти изпратим линк за смяна на паролата.</p>
          <input
            type="email"
            placeholder="Имейл адрес"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border-2 border-orange-200 rounded-xl p-3 mb-4 focus:border-orange-400 outline-none"
          />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button onClick={handleReset} disabled={!email || loading}
            className="w-full bg-orange-500 text-white font-bold py-3 rounded-2xl hover:bg-orange-600 disabled:opacity-50">
            {loading ? '⏳ Изпращам...' : '📧 Изпрати линк'}
          </button>
        </div>
        <button onClick={() => router.push('/login')}
          className="w-full bg-white text-orange-500 border-2 border-orange-300 font-bold py-3 rounded-2xl">
          ← Назад
        </button>
      </div>
    </main>
  )
}
