'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Dictation, Profile } from '@/lib/types'
import Fox, { FoxMood } from '@/components/fox/Fox'

type Result = { word: string; correct: boolean; input: string }

export default function DictationPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [dictations, setDictations] = useState<Dictation[]>([])
  const [selected, setSelected] = useState<Dictation | null>(null)
  const [phase, setPhase] = useState<'pick' | 'play' | 'done'>('pick')
  const [wordIndex, setWordIndex] = useState(0)
  const [input, setInput] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [speaking, setSpeaking] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [foxMood, setFoxMood] = useState<FoxMood>('happy')

  useEffect(() => {
    const username = localStorage.getItem('u4a_username')
    if (!username) { router.push('/login'); return }
    supabase.from('profiles').select('*').eq('username', username).single()
      .then(({ data }) => {
        if (!data) { router.push('/login'); return }
        setProfile(data)
        supabase.from('dictations').select('*').eq('grade', data.grade)
          .then(({ data: d }) => setDictations(d || []))
      })
  }, [])

  const speak = (text: string) => {
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'bg-BG'
    utt.rate = 0.85

    const voices = window.speechSynthesis.getVoices()
    const daria = voices.find(v => v.name.toLowerCase().includes('daria'))
    if (daria) utt.voice = daria

    setSpeaking(true)
    utt.onend = () => setSpeaking(false)
    window.speechSynthesis.speak(utt)
  }

  const startDictation = (d: Dictation) => {
    setSelected(d)
    setPhase('play')
    setWordIndex(0)
    setResults([])
    setInput('')
    setStartTime(Date.now())
    setTimeout(() => speak(d.words[0]), 500)
  }

  const handleCheck = async () => {
    if (!selected || !profile) return
    const word = selected.words[wordIndex]
    const correct = input.trim().toLowerCase() === word.toLowerCase()
    setFoxMood(correct ? 'excited' : 'sad')
    setTimeout(() => setFoxMood('happy'), 1500)
    const newResults = [...results, { word, correct, input: input.trim() }]
    setResults(newResults)
    setInput('')

    if (wordIndex + 1 < selected.words.length) {
      setWordIndex(wordIndex + 1)
      setTimeout(() => speak(selected.words[wordIndex + 1]), 300)
    } else {
      const score = newResults.filter(r => r.correct).length
      const timeSeconds = Math.round((Date.now() - startTime) / 1000)
      await supabase.from('dictation_sessions').insert({
        profile_id: profile.id,
        dictation_id: selected.id,
        dictation_title: selected.title,
        score,
        total: selected.words.length,
        time_seconds: timeSeconds,
        results: newResults,
      })
      await supabase.from('profiles').update({
        total_sessions: (profile.total_sessions || 0) + 1
      }).eq('id', profile.id)
      setPhase('done')
    }
  }

  const doneMood: FoxMood = (() => {
    const score = results.filter(r => r.correct).length
    const percent = selected ? Math.round((score / selected.words.length) * 100) : 0
    return percent >= 80 ? 'excited' : percent >= 50 ? 'wink' : 'sad'
  })()

  if (phase === 'pick') return (
    <main className="min-h-screen bg-orange-50 p-6">
      <div className="max-w-md mx-auto">
        <button onClick={() => router.push('/dashboard')} className="text-orange-400 mb-6 flex items-center gap-2">
          ← Назад
        </button>
        <h1 className="text-2xl font-bold text-gray-700 mb-6">Избери диктовка</h1>
        {dictations.length === 0 && (
          <p className="text-gray-400 text-center">Няма диктовки за твоя клас.</p>
        )}
        <div className="flex flex-col gap-4">
          {dictations.map(d => (
            <button
              key={d.id}
              onClick={() => startDictation(d)}
              className="bg-white rounded-2xl p-6 shadow text-left hover:shadow-md transition-shadow border-2 border-transparent hover:border-orange-300"
            >
              <h2 className="text-xl font-bold text-gray-700">{d.title}</h2>
              <p className="text-orange-500 mt-1">{d.words.length} думи • {d.grade} клас</p>
              {d.is_premium && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full mt-2 inline-block">⭐ Premium</span>}
            </button>
          ))}
        </div>
      </div>
    </main>
  )

  if (phase === 'play' && selected) return (
    <main className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-4">
          <p className="text-gray-400 text-sm">{selected.title}</p>
          <p className="text-orange-500 font-bold">{wordIndex + 1} / {selected.words.length}</p>
        </div>

        <div className="w-full bg-orange-100 rounded-full h-3 mb-8">
          <div
            className="bg-orange-500 h-3 rounded-full transition-all"
            style={{ width: `${(wordIndex / selected.words.length) * 100}%` }}
          />
        </div>

        <div className="flex justify-center mb-6">
          <Fox mood={foxMood} size={128} />
        </div>

        <div className="flex justify-center mb-8">
          <button
            onClick={() => speak(selected.words[wordIndex])}
            disabled={speaking}
            className="bg-orange-500 text-white text-lg font-bold px-8 py-4 rounded-2xl hover:bg-orange-600 disabled:opacity-60 transition-all shadow-lg"
          >
            {speaking ? '🔊 Слушай...' : '🔊 Чуй думата'}
          </button>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <p className="text-gray-500 text-center mb-4">Напиши думата:</p>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && input.trim() !== '' && handleCheck()}
            autoFocus
            className="w-full border-2 border-orange-200 rounded-2xl p-4 text-xl text-center focus:outline-none focus:border-orange-400"
            placeholder="..."
          />
          <button
            onClick={handleCheck}
            disabled={!input.trim()}
            className="w-full mt-4 bg-orange-500 text-white text-xl font-bold py-4 rounded-2xl hover:bg-orange-600 disabled:opacity-40 transition-colors"
          >
            Проверка ✓
          </button>
        </div>
      </div>
    </main>
  )

  if (phase === 'done' && selected) {
    const score = results.filter(r => r.correct).length
    const percent = Math.round((score / selected.words.length) * 100)
    return (
      <main className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <Fox mood={doneMood} size={128} />
            <h1 className="text-3xl font-bold text-gray-700 mb-2 mt-4">
              {percent >= 80 ? '🎉 Браво!' : percent >= 50 ? '👍 Добре!' : '💪 Продължавай!'}
            </h1>
            <p className="text-6xl font-bold text-orange-500">{score}/{selected.words.length}</p>
            <p className="text-gray-400">{percent}% верни</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-lg mb-6">
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-gray-600">{r.word}</span>
                <div className="flex items-center gap-2">
                  {!r.correct && <span className="text-red-400 text-sm">{r.input}</span>}
                  <span className={r.correct ? 'text-green-500 text-xl' : 'text-red-500 text-xl'}>
                    {r.correct ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-orange-500 text-white text-xl font-bold py-4 rounded-2xl hover:bg-orange-600 transition-colors"
          >
            Към началото 🏠
          </button>
        </div>
      </main>
    )
  }

  return null
}