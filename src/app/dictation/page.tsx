'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Dictation, Profile } from '@/lib/types'
import Fox, { FoxMood } from '@/components/fox/Fox'

type Sentence = { id: number; text: string }
type WordResult = { word: string; correct: boolean; input: string }
type SentenceResult = { sentence: string; input: string; wordResults: WordResult[]; correct: boolean }

const REPEAT_LIMITS: Record<number, number> = { 2: 4, 3: 3, 4: 2, 5: 1 }
const CHARS_PER_SECOND: Record<number, number> = { 2: 0.7, 3: 1.0, 4: 1.4, 5: 1.8 }

export default function DictationPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [dictations, setDictations] = useState<Dictation[]>([])
  const [selected, setSelected] = useState<Dictation | null>(null)
  const [phase, setPhase] = useState<'pick' | 'play' | 'write' | 'done'>('pick')
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const [repeatsLeft, setRepeatsLeft] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const [pausing, setPausing] = useState(false)
  const [pauseProgress, setPauseProgress] = useState(0)
  const [foxMood, setFoxMood] = useState<FoxMood>('happy')
  const [fullInput, setFullInput] = useState('')
  const [results, setResults] = useState<SentenceResult[]>([])
  const [speed, setSpeed] = useState(1.0)
  const progressTimer = useRef<NodeJS.Timeout | null>(null)
  const currentAudio = useRef<HTMLAudioElement | null>(null)

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

  const stopAll = () => {
    if (currentAudio.current) {
      currentAudio.current.pause()
      currentAudio.current = null
    }
    clearInterval(progressTimer.current!)
    setSpeaking(false)
    setPausing(false)
    setPauseProgress(0)
  }

  const speak = (text: string, onDone?: () => void) => {
    if (currentAudio.current) {
      currentAudio.current.pause()
      currentAudio.current = null
    }
    setSpeaking(true)

    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, speed: 0.85 * speed, voice: 'male' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.audio) {
          const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`)
          currentAudio.current = audio
          audio.onended = () => {
            setSpeaking(false)
            currentAudio.current = null
            if (onDone) onDone()
          }
          audio.play()
        } else {
          setSpeaking(false)
          if (onDone) onDone()
        }
      })
      .catch(() => {
        setSpeaking(false)
        if (onDone) onDone()
      })
  }

  const startPause = (text: string, grade: number, onDone: () => void) => {
    const chars = text.length
    const charsPerSec = CHARS_PER_SECOND[grade] || 1.0
    const pauseMs = Math.round((chars / charsPerSec) * 1000 / speed)
    setPausing(true)
    setPauseProgress(0)
    setFoxMood('writing')

    const steps = 50
    const stepMs = pauseMs / steps
    let step = 0

    progressTimer.current = setInterval(() => {
      step++
      setPauseProgress(Math.round((step / steps) * 100))
      if (step >= steps) {
        clearInterval(progressTimer.current!)
        setPausing(false)
        setPauseProgress(0)
        onDone()
      }
    }, stepMs)
  }

  const readSentence = (sentences: Sentence[], index: number, grade: number) => {
    if (index >= sentences.length) {
      setFoxMood('happy')
      setPhase('write')
      return
    }
    setSentenceIndex(index)
    setFoxMood('happy')
    speak(sentences[index].text, () => {
      startPause(sentences[index].text, grade, () => {
        readSentence(sentences, index + 1, grade)
      })
    })
  }

  const startDictation = (d: Dictation) => {
    const grade = d.grade
    setSelected(d)
    setPhase('play')
    setSentenceIndex(0)
    setRepeatsLeft(REPEAT_LIMITS[grade] ?? 0)
    setFoxMood('happy')
    setFullInput('')
    setTimeout(() => readSentence(d.sentences as Sentence[], 0, grade), 500)
  }

  const handleRepeat = () => {
    if (!selected || repeatsLeft <= 0 || speaking) return
    clearInterval(progressTimer.current!)
    setPausing(false)
    setPauseProgress(0)
    setRepeatsLeft(r => r - 1)
    const sentences = selected.sentences as Sentence[]
    speak(sentences[sentenceIndex].text, () => {
      startPause(sentences[sentenceIndex].text, selected.grade, () => {
        readSentence(sentences, sentenceIndex + 1, selected.grade)
      })
    })
  }

  const handleBack = () => {
    stopAll()
    setPhase('pick')
    setSelected(null)
  }

  const checkSentence = (original: string, userInput: string): WordResult[] => {
    const normalize = (s: string) => s.trim().toLowerCase().replace(/[.,!?;:»«–]/g, '')
    const originalWords = original.trim().split(/\s+/)
    const inputWords = userInput.trim().split(/\s+/)
    return originalWords.map((word, i) => ({
      word,
      input: inputWords[i] || '',
      correct: normalize(word) === normalize(inputWords[i] || '')
    }))
  }

  const handleSubmit = async () => {
    if (!selected || !profile) return
    const sentences = selected.sentences as Sentence[]
    const inputSentences = fullInput.trim().split('\n').filter(s => s.trim())

    const newResults: SentenceResult[] = sentences.map((s, i) => {
      const userInput = inputSentences[i] || ''
      const wordResults = checkSentence(s.text, userInput)
      return {
        sentence: s.text,
        input: userInput,
        wordResults,
        correct: wordResults.every(r => r.correct)
      }
    })

    const score = newResults.filter(r => r.correct).length
    await supabase.from('dictation_sessions').insert({
      profile_id: profile.id,
      dictation_id: selected.id,
      dictation_title: selected.title,
      score,
      total: sentences.length,
      time_seconds: 0,
      results: newResults,
    })
    await supabase.from('profiles').update({
      total_sessions: (profile.total_sessions || 0) + 1
    }).eq('id', profile.id)
    setResults(newResults)
    setPhase('done')
  }

  // ИЗБОР
  if (phase === 'pick') return (
    <main className="min-h-screen bg-orange-50 p-6">
      <div className="max-w-md mx-auto">
        <button onClick={() => router.push('/dashboard')} className="text-orange-400 mb-6 flex items-center gap-2">
          ← Назад
        </button>
        <h1 className="text-2xl font-bold text-gray-700 mb-2">Избери диктовка</h1>

        <div className="bg-white rounded-2xl p-4 shadow mb-6">
          <p className="text-gray-500 text-sm mb-2">Скорост на четене:</p>
          <div className="grid grid-cols-2 gap-2">
            {[{label: '🐢 Бавно', val: 0.7}, {label: '🚶 Нормално', val: 1.0}].map(s => (
              <button
                key={s.val}
                onClick={() => setSpeed(s.val)}
                className={`py-3 rounded-xl font-bold border-2 transition-all ${speed === s.val ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-500 border-orange-200'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {dictations.length === 0 && <p className="text-gray-400 text-center">Няма диктовки за твоя клас.</p>}
        <div className="flex flex-col gap-4">
          {dictations.map(d => (
            <button
              key={d.id}
              onClick={() => startDictation(d)}
              className="bg-white rounded-2xl p-6 shadow text-left hover:shadow-md transition-shadow border-2 border-transparent hover:border-orange-300"
            >
              <h2 className="text-xl font-bold text-gray-700">{d.title}</h2>
              <p className="text-orange-500 mt-1">{(d.sentences as Sentence[]).length} изречения • {d.grade} клас</p>
              {d.is_premium && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full mt-2 inline-block">⭐ Premium</span>}
            </button>
          ))}
        </div>
      </div>
    </main>
  )

  // ЧЕТЕНЕ
  if (phase === 'play' && selected) {
    const sentences = selected.sentences as Sentence[]
    const repeatLimit = REPEAT_LIMITS[selected.grade] ?? 0
    return (
      <main className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <button onClick={handleBack} className="text-orange-400 mb-4 flex items-center gap-2">
            ← Спри диктовката
          </button>

          <div className="text-center mb-4">
            <p className="text-gray-400 text-sm">{selected.title}</p>
            <p className="text-orange-500 font-bold">Изречение {sentenceIndex + 1} от {sentences.length}</p>
          </div>

          <div className="w-full bg-orange-100 rounded-full h-3 mb-6">
            <div className="bg-orange-500 h-3 rounded-full transition-all" style={{ width: `${(sentenceIndex / sentences.length) * 100}%` }} />
          </div>

          <div className="flex justify-center mb-4">
            <Fox mood={foxMood} size={140} />
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-lg mb-4">
            {speaking && <p className="text-orange-500 font-bold text-lg animate-pulse">🔊 Лисицата чете...</p>}
            {pausing && (
              <div>
                <p className="text-gray-500 mb-3">✍️ Пиши на хартия...</p>
                <div className="w-full bg-gray-100 rounded-full h-4">
                  <div className="bg-orange-400 h-4 rounded-full transition-all" style={{ width: `${pauseProgress}%` }} />
                </div>
              </div>
            )}
            {!speaking && !pausing && <p className="text-gray-400">Подготвям се...</p>}
          </div>

          <button
            onClick={handleRepeat}
            disabled={repeatsLeft <= 0 || speaking || repeatLimit === 0}
            className={`w-full py-3 rounded-2xl font-bold border-2 transition-all ${
              repeatLimit === 0
                ? 'hidden'
                : repeatsLeft <= 0 || speaking
                ? 'bg-gray-100 text-gray-400 border-gray-200'
                : 'bg-white border-orange-300 text-orange-500 hover:bg-orange-50'
            }`}
          >
            🔁 Повтори {repeatLimit > 0 && `(${repeatsLeft} от ${repeatLimit})`}
          </button>
        </div>
      </main>
    )
  }

  // ВЪВЕЖДАНЕ
  if (phase === 'write' && selected) {
    const sentences = selected.sentences as Sentence[]
    return (
      <main className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <Fox mood="pointing" size={120} />
            <h2 className="text-2xl font-bold text-gray-700 mt-4">Диктовката свърши!</h2>
            <p className="text-gray-500 mt-1">Въведи всяко изречение на нов ред</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-lg mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Твоят текст</span>
              <span>{sentences.length} изречения</span>
            </div>
            <textarea
              value={fullInput}
              onChange={e => setFullInput(e.target.value)}
              rows={sentences.length + 2}
              className="w-full border-2 border-orange-200 rounded-2xl p-4 text-lg focus:outline-none focus:border-orange-400 resize-none"
              placeholder={`Изречение 1\nИзречение 2\n...`}
              autoFocus
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!fullInput.trim()}
            className="w-full bg-orange-500 text-white text-xl font-bold py-4 rounded-2xl hover:bg-orange-600 disabled:opacity-40 transition-colors"
          >
            Провери диктовката ✓
          </button>
        </div>
      </main>
    )
  }

  // РЕЗУЛТАТИ
  if (phase === 'done' && selected) {
    const sentences = selected.sentences as Sentence[]
    const score = results.filter(r => r.correct).length
    const percent = Math.round((score / sentences.length) * 100)
    const mood: FoxMood = percent >= 80 ? 'excited' : percent >= 50 ? 'wink' : 'sad'
    return (
      <main className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <Fox mood={mood} size={128} />
            <h1 className="text-3xl font-bold text-gray-700 mb-2 mt-4">
              {percent >= 80 ? '🎉 Браво!' : percent >= 50 ? '👍 Добре!' : '💪 Продължавай!'}
            </h1>
            <p className="text-6xl font-bold text-orange-500">{score}/{sentences.length}</p>
            <p className="text-gray-400">{percent}% верни изречения</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-lg mb-6">
            {results.map((r, i) => (
              <div key={i} className="py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-gray-500 text-sm flex-1">{r.sentence}</p>
                  <span className={r.correct ? 'text-green-500 text-xl' : 'text-red-500 text-xl'}>
                    {r.correct ? '✓' : '✗'}
                  </span>
                </div>
                {!r.correct && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.wordResults.map((wr, j) => (
                      <span key={j} className={`text-sm px-1 rounded ${wr.correct ? 'text-gray-600' : 'bg-red-100 text-red-600 font-bold'}`}>
                        {wr.word}
                      </span>
                    ))}
                  </div>
                )}
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