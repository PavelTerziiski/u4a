'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Fox from '@/components/fox/Fox'

const TEST_SENTENCE = 'Мама мие ръцете си преди да готви вкусна супа.'

export default function VoiceSetupPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<'kalina' | 'borisslav' | null>(null)
  const [playing, setPlaying] = useState<'kalina' | 'borisslav' | null>(null)
  const [saving, setSaving] = useState(false)
  const currentAudio = useRef<HTMLAudioElement | null>(null)

  const playVoice = async (voice: 'kalina' | 'borisslav') => {
    if (currentAudio.current) {
      currentAudio.current.pause()
      currentAudio.current = null
    }
    setPlaying(voice)
    try {
      const res = await fetch('/api/tts-azure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: TEST_SENTENCE, voice })
      })
      const data = await res.json()
      if (data.audio) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`)
        currentAudio.current = audio
        audio.onended = () => setPlaying(null)
        audio.play()
      }
    } catch {
      setPlaying(null)
    }
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    const username = localStorage.getItem('u4a_username')
    if (username) {
      await supabase
        .from('profiles')
        .update({ preferred_voice: selected })
        .eq('username', username)
    }
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <Fox mood="excited" size={140} />
        <h1 className="text-2xl font-bold text-gray-700 mt-6 mb-2">Избери своя глас</h1>
        <p className="text-gray-500 mb-8">Натисни бутона за да чуеш и избереш 🎧</p>

        <div className="flex flex-col gap-4 mb-8">
          {/* Калина */}
          <div className={`bg-white rounded-2xl p-5 shadow border-2 transition-all ${selected === 'kalina' ? 'border-orange-500' : 'border-transparent'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-left">
                <p className="font-bold text-gray-700 text-lg">🎀 Калина</p>
                <p className="text-gray-400 text-sm">Женски глас</p>
              </div>
              <button
                onClick={() => { setSelected('kalina'); playVoice('kalina') }}
                disabled={playing === 'kalina'}
                className="bg-orange-100 text-orange-600 font-bold px-4 py-2 rounded-xl hover:bg-orange-200 transition-colors disabled:opacity-50"
              >
                {playing === 'kalina' ? '🔊 Слушай...' : '▶ Чуй'}
              </button>
            </div>
            {selected === 'kalina' && (
              <p className="text-orange-500 text-sm font-bold">✓ Избран</p>
            )}
          </div>

          {/* Борислав */}
          <div className={`bg-white rounded-2xl p-5 shadow border-2 transition-all ${selected === 'borisslav' ? 'border-orange-500' : 'border-transparent'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-left">
                <p className="font-bold text-gray-700 text-lg">🎙 Борислав</p>
                <p className="text-gray-400 text-sm">Мъжки глас</p>
              </div>
              <button
                onClick={() => { setSelected('borisslav'); playVoice('borisslav') }}
                disabled={playing === 'borisslav'}
                className="bg-orange-100 text-orange-600 font-bold px-4 py-2 rounded-xl hover:bg-orange-200 transition-colors disabled:opacity-50"
              >
                {playing === 'borisslav' ? '🔊 Слушай...' : '▶ Чуй'}
              </button>
            </div>
            {selected === 'borisslav' && (
              <p className="text-orange-500 text-sm font-bold">✓ Избран</p>
            )}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!selected || saving}
          className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl hover:bg-orange-600 transition-colors disabled:opacity-40 text-lg"
        >
          {saving ? '⏳ Запазване...' : 'Запази и продължи →'}
        </button>
      </div>
    </main>
  )
}