'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Login() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .eq('password_hash', btoa(password))
        .single()
      if (error || !data) throw new Error('Грешно име или парола')
      localStorage.setItem('u4a_username', username)
      router.push('/dashboard')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src="/images/fox.png" alt="Лисица" className="w-32 h-32 object-contain" />
        </div>
        <h1 className="text-4xl font-bold text-orange-500 text-center mb-2">u4a</h1>
        <p className="text-center text-orange-700 mb-8">Влез в профила си</p>

        <div className="bg-white rounded-3xl p-8 shadow-lg">
          <input
            type="text"
            placeholder="Потребителско име"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full border-2 border-orange-200 rounded-2xl p-4 text-lg mb-4 focus:outline-none focus:border-orange-400"
          />
          <input
            type="password"
            placeholder="Парола"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full border-2 border-orange-200 rounded-2xl p-4 text-lg mb-6 focus:outline-none focus:border-orange-400"
          />
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={!username || !password || loading}
            className="w-full bg-orange-500 text-white text-xl font-bold py-4 rounded-2xl hover:bg-orange-600 transition-colors disabled:opacity-40"
          >
            {loading ? '...' : 'Влез! 🚀'}
          </button>
        </div>

        <p className="text-center text-gray-500 mt-6">
          Нямаш профил?{' '}
          <Link href="/register" className="text-orange-500 font-bold hover:underline">
            Създай сега
          </Link>
        </p>
      </div>
    </main>
  )
}
