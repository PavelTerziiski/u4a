'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const FOX_NAMES = ['Лисиче', 'Лисан', 'Лиско', 'Фокси']
const GRADES = [2, 3, 4, 5]
const AVATARS = ['🦊', '🐱', '🐶', '🐸', '🐼', '🐨']

export default function Register() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [foxName, setFoxName] = useState('')
  const [customFoxName, setCustomFoxName] = useState('')
  const [grade, setGrade] = useState<number | null>(null)
  const [avatarId, setAvatarId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    setLoading(true)
    setError('')
    const finalFoxName = foxName === 'свое' ? customFoxName : foxName
    try {
      const { error } = await supabase.from('profiles').insert({
        username,
        password_hash: btoa(password),
        fox_name: finalFoxName,
        grade,
        avatar_id: avatarId,
        display_name: username,
      })
      if (error) throw error
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
        <h1 className="text-4xl font-bold text-orange-500 text-center mb-2">u4a</h1>
        <p className="text-center text-orange-700 mb-8">Създай своя профил</p>

        {step === 1 && (
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">Как се казваш?</h2>
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
              className="w-full border-2 border-orange-200 rounded-2xl p-4 text-lg mb-6 focus:outline-none focus:border-orange-400"
            />
            <button
              onClick={() => username && password && setStep(2)}
              className="w-full bg-orange-500 text-white text-xl font-bold py-4 rounded-2xl hover:bg-orange-600 transition-colors disabled:opacity-40"
              disabled={!username || !password}
            >
              Напред →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">В кой клас си?</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {GRADES.map(g => (
                <button
                  key={g}
                  onClick={() => setGrade(g)}
                  className={`py-6 rounded-2xl text-2xl font-bold border-2 transition-all ${
                    grade === g
                      ? 'bg-orange-500 text-white border-orange-500 scale-105'
                      : 'bg-white text-orange-500 border-orange-200 hover:border-orange-400'
                  }`}
                >
                  {g} клас
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-2xl border-2 border-orange-200 text-orange-500 font-bold hover:bg-orange-50">
                ← Назад
              </button>
              <button
                onClick={() => grade && setStep(3)}
                disabled={!grade}
                className="flex-1 py-4 rounded-2xl bg-orange-500 text-white font-bold hover:bg-orange-600 disabled:opacity-40"
              >
                Напред →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">Избери аватар</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {AVATARS.map((avatar, i) => (
                <button
                  key={i}
                  onClick={() => setAvatarId(i + 1)}
                  className={`py-6 rounded-2xl text-4xl border-2 transition-all ${
                    avatarId === i + 1
                      ? 'bg-orange-100 border-orange-500 scale-105'
                      : 'bg-white border-orange-200 hover:border-orange-400'
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-2xl border-2 border-orange-200 text-orange-500 font-bold hover:bg-orange-50">
                ← Назад
              </button>
              <button
                onClick={() => avatarId && setStep(4)}
                disabled={!avatarId}
                className="flex-1 py-4 rounded-2xl bg-orange-500 text-white font-bold hover:bg-orange-600 disabled:opacity-40"
              >
                Напред →
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-700 mb-2 text-center">Как ще се казва</h2>
            <h2 className="text-2xl font-bold text-orange-500 mb-6 text-center">твоята лисица?</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {FOX_NAMES.map(name => (
                <button
                  key={name}
                  onClick={() => setFoxName(name)}
                  className={`py-5 rounded-2xl text-lg font-bold border-2 transition-all ${
                    foxName === name
                      ? 'bg-orange-500 text-white border-orange-500 scale-105'
                      : 'bg-white text-orange-500 border-orange-200 hover:border-orange-400'
                  }`}
                >
                  {name}
                </button>
              ))}
              <button
                onClick={() => setFoxName('свое')}
                className={`col-span-2 py-5 rounded-2xl text-lg font-bold border-2 transition-all ${
                  foxName === 'свое'
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-orange-500 border-orange-200 hover:border-orange-400'
                }`}
              >
                Свое име ✏️
              </button>
            </div>
            {foxName === 'свое' && (
              <input
                type="text"
                placeholder="Напиши името..."
                value={customFoxName}
                onChange={e => setCustomFoxName(e.target.value)}
                className="w-full border-2 border-orange-200 rounded-2xl p-4 text-lg mb-4 focus:outline-none focus:border-orange-400"
              />
            )}
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 py-4 rounded-2xl border-2 border-orange-200 text-orange-500 font-bold hover:bg-orange-50">
                ← Назад
              </button>
              <button
                onClick={handleRegister}
                disabled={!foxName || (foxName === 'свое' && !customFoxName) || loading}
                className="flex-1 py-4 rounded-2xl bg-orange-500 text-white font-bold hover:bg-orange-600 disabled:opacity-40"
              >
                {loading ? '...' : 'Готово! 🎉'}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-2 mt-6">
          {[1,2,3,4].map(s => (
            <div key={s} className={`w-3 h-3 rounded-full transition-all ${step >= s ? 'bg-orange-500' : 'bg-orange-200'}`} />
          ))}
        </div>
      </div>
    </main>
  )
}
