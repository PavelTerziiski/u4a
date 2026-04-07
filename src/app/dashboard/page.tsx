'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'

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
    <main className="min-h-screen bg-orange-50 flex items-center justify-center">
      <p className="text-orange-500 text-2xl">Зареждам...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-orange-50 p-6">
      <div className="max-w-md mx-auto">

        {/* Хедър */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-700">Здравей, {profile?.username}! 👋</h1>
            <p className="text-orange-500">Лисицата ти се казва <strong>{profile?.fox_name}</strong></p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">{profile?.grade} клас</p>
            <p className="text-orange-500 font-bold">🔥 {profile?.streak} дни</p>
          </div>
        </div>

        {/* Лисица */}
        <div className="flex justify-center mb-6">
          <img src="/images/fox.png" alt="Лисица" className="w-40 h-40 object-contain" />
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow text-center">
            <p className="text-3xl font-bold text-orange-500">{profile?.total_sessions}</p>
            <p className="text-gray-500 text-sm">диктовки</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow text-center">
            <p className="text-3xl font-bold text-orange-500">🔥 {profile?.streak}</p>
            <p className="text-gray-500 text-sm">дни streak</p>
          </div>
        </div>

        {/* Бутон за диктовка */}
        <button
          onClick={() => router.push('/dictation')}
          className="w-full bg-orange-500 text-white text-xl font-bold py-5 rounded-2xl hover:bg-orange-600 transition-colors shadow-lg mb-4"
        >
          Започни диктовка! 📝
        </button>

        <button
          onClick={() => { localStorage.removeItem('u4a_username'); router.push('/') }}
          className="w-full bg-white text-orange-400 py-3 rounded-2xl border-2 border-orange-200 hover:bg-orange-50 transition-colors"
        >
          Излез
        </button>

      </div>
    </main>
  )
}
