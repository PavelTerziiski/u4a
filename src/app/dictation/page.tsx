'use client'
import ReactMarkdown from 'react-markdown'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import '../dashboard/dashboard.css'
import { Dictation, Profile } from '@/lib/types'
import Fox, { FoxMood } from '@/components/fox/Fox'

type Sentence = { id: number; text: string }
type WordResult = { word: string; correct: boolean; input: string; errorType: 'none' | 'spelling' | 'punctuation' | 'capitalization' }
type SentenceResult = { sentence: string; input: string; wordResults: WordResult[]; correct: boolean }

const REPEAT_LIMITS: Record<number, number> = { 2: 4, 3: 3, 4: 2, 5: 1 }
const CHARS_PER_SECOND: Record<number, number> = { 2: 0.7, 3: 1.0, 4: 1.4, 5: 1.8 }
const FREE_WEEKLY_LIMIT = 2

export default function DictationPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [dictations, setDictations] = useState<Dictation[]>([])
  const [selected, setSelected] = useState<Dictation | null>(null)
  const [phase, setPhase] = useState<'pick' | 'ready' | 'play' | 'write' | 'done' | 'limit'>('pick')
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const [repeatsLeft, setRepeatsLeft] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const [pausing, setPausing] = useState(false)
  const [pauseProgress, setPauseProgress] = useState(0)
  const [foxMood, setFoxMood] = useState<FoxMood>('happy')
  const [fullInput, setFullInput] = useState('')
  const [results, setResults] = useState<SentenceResult[]>([])
  // session tracking removed
  // hasParent removed
  const [speed, setSpeed] = useState(1.0)
  const [weeklyCount, setWeeklyCount] = useState(0)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [explanations, setExplanations] = useState<Record<number, string>>({})
  const [loadingExplanations, setLoadingExplanations] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const progressTimer = useRef<NodeJS.Timeout | null>(null)
  const currentAudio = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const username = localStorage.getItem('u4a_username')
    if (!username) { router.push('/login'); return }
    supabase.from('profiles').select('*').eq('username', username).single()
      .then(({ data }) => {
        if (!data) { router.push('/login'); return }
        if (data.is_parent) { router.push('/parent-dashboard'); return }
        setProfile(data)

        supabase.from('dictations').select('*').eq('grade', data.grade)
          .then(({ data: d }) => setDictations(d || []))

        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        weekStart.setHours(0, 0, 0, 0)
        supabase
          .from('dictation_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', data.id)
          .gte('created_at', weekStart.toISOString())
          .then(({ count }) => setWeeklyCount(count ?? 0))
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

  useEffect(() => {
    return () => {
      if (currentAudio.current) {
        currentAudio.current.pause()
        currentAudio.current = null
      }
      clearInterval(progressTimer.current!)
    }
  }, [])

  const speak = (text: string, onDone?: () => void) => {
    if (currentAudio.current) {
      currentAudio.current.pause()
      currentAudio.current = null
    }
    setSpeaking(true)
    fetch(profile?.is_premium ? '/api/tts-azure' : '/api/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(
    profile?.is_premium 
      ? { text, voice: profile?.preferred_voice || 'kalina', speed } 
      : { text, speed: 0.85 * speed, voice: 'male' }
  )
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
    // При 3-тото изречение записваме в базата и броим към лимита
    if (index === 2 && profile && selected) {
      const autoConfirm = true
      supabase.from('dictation_sessions').insert({
        profile_id: profile.id,
        dictation_id: selected.id,
        dictation_title: selected.title,
        score: 0,
        total: sentences.length,
        time_seconds: 0,
        results: [],
        parent_confirmed: autoConfirm,
        is_started_only: true,
      }).then(() => {
        setWeeklyCount(c => c + 1)
        const today = new Date().toISOString().slice(0, 10)
        const lastDate = profile.last_session_date
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        const newStreak = lastDate === today
          ? (profile.streak || 0)
          : lastDate === yesterday
          ? (profile.streak || 0) + 1
          : 1
        supabase.from('profiles').update({
          streak: newStreak,
          last_session_date: today
        }).eq('id', profile.id)
        setProfile(p => p ? { ...p, streak: newStreak, last_session_date: today } : p)
      })
    }
    speak(sentences[index].text, () => {
      startPause(sentences[index].text, grade, () => {
        readSentence(sentences, index + 1, grade)
      })
    })
  }

  const startDictation = (d: Dictation) => {
    if (!profile) return
    if (!profile.is_premium && weeklyCount >= FREE_WEEKLY_LIMIT) {
      setPhase('limit')
      return
    }
    const grade = d.grade
    setSelected(d)
    setPhase('ready')
    setSentenceIndex(0)
    setRepeatsLeft(REPEAT_LIMITS[grade] ?? 0)
    setFoxMood('happy')
    setFullInput('')
    setExplanations({})
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

  const handleOCR = async (file: File) => {
    if (!profile?.is_premium) return
    setOcrLoading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const img = new Image()
        img.onload = async () => {
          const canvas = document.createElement('canvas')
          const maxSize = 800
          let w = img.width, h = img.height
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize }
            else { w = Math.round(w * maxSize / h); h = maxSize }
          }
          canvas.width = w; canvas.height = h
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
          const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1]
          const res = await fetch('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64 })
          })
          const data = await res.json()
          if (data.text) setFullInput(data.text)
          setOcrLoading(false)
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    } catch {
      setOcrLoading(false)
    }
  }

  const fetchExplanations = async (newResults: SentenceResult[]) => {
    if (!profile?.is_premium) return
    setLoadingExplanations(true)
    const newExplanations: Record<number, string> = {}
    await Promise.all(
      newResults.map(async (r, i) => {
        if (!r.correct) {
          const wrongWords = r.wordResults.filter(w => !w.correct).map(w => w.word)
          try {
            const res = await fetch('/api/explain', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sentence: r.sentence, userInput: r.input, wrongWords })
            })
            const data = await res.json()
            if (data.explanation) newExplanations[i] = data.explanation
          } catch {
            // ignore
          }
        }
      })
    )
    setExplanations(newExplanations)
    setLoadingExplanations(false)
    // Записваме обясненията в базата
    const updatedResults = newResults.map((r, i) => ({
      ...r,
      explanation: newExplanations[i] || null
    }))
    const lastSession = await supabase
      .from('dictation_sessions')
      .select('id')
      .eq('profile_id', profile?.id || '')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (lastSession.data) {
      await supabase
        .from('dictation_sessions')
        .update({ results: updatedResults })
        .eq('id', lastSession.data.id)
    }
  }

  const checkSentence = (original: string, userInput: string): WordResult[] => {
    const onlyPunct = (s: string) => s.replace(/[^.,!?;:»«–]/g, '')
    const onlyLetters = (s: string) => s.replace(/[.,!?;:»«–]/g, '')
    const originalWords = original.trim().split(/\s+/)
    const inputWords = userInput.trim().split(/\s+/)
    return originalWords.map((word, i) => {
      const input = inputWords[i] || ''
      const wordLetters = onlyLetters(word).toLowerCase()
      const inputLetters = onlyLetters(input).toLowerCase()
      const wordPunct = onlyPunct(word)
      const inputPunct = onlyPunct(input)
      const lettersMatch = wordLetters === inputLetters
      const punctMatch = wordPunct === inputPunct
      const caseMatch = onlyLetters(word)[0] === onlyLetters(input)[0]
      const correct = lettersMatch && punctMatch && caseMatch
      let errorType: WordResult['errorType'] = 'none'
      if (!correct) {
        if (lettersMatch && !punctMatch) {
          errorType = 'punctuation'
        } else if (lettersMatch && punctMatch && !caseMatch) {
          errorType = 'capitalization'
        } else {
          errorType = 'spelling'
        }
      }
      return { word, input, correct, errorType }
    })
  }

  const handleSubmit = async () => {
    if (!selected || !profile) return
    const sentences = selected.sentences as Sentence[]
    const inputSentences = fullInput.trim().split('\n').filter(s => s.trim())
    const newResults: SentenceResult[] = sentences.map((s, i) => {
      const userInput = inputSentences[i] || ''
      const wordResults = checkSentence(s.text, userInput)
      return { sentence: s.text, input: userInput, wordResults, correct: wordResults.every(r => r.correct) }
    })
    const score = newResults.filter(r => r.correct).length
    const { data: parentLink } = await supabase
      .from('parent_children')
      .select('parent_id')
      .eq('child_id', profile.id)
      .single()
    const autoConfirm = !parentLink
    await supabase.from('dictation_sessions').insert({
      profile_id: profile.id,
      dictation_id: selected.id,
      dictation_title: selected.title,
      score,
      total: sentences.length,
      time_seconds: 0,
      results: newResults,
      parent_confirmed: autoConfirm,
    }).select('id').single()

    const today = new Date().toISOString().slice(0, 10)
    const lastDate = profile.last_session_date
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const newStreak = lastDate === today
      ? (profile.streak || 0)
      : lastDate === yesterday
      ? (profile.streak || 0) + 1
      : 1
    await supabase.from('profiles').update({
      total_sessions: (profile.total_sessions || 0) + 1,
      streak: newStreak,
      last_session_date: today
    }).eq('id', profile.id)
    setProfile(p => p ? { ...p, streak: newStreak, last_session_date: today } : p)
    setWeeklyCount(c => c + 1)
    setResults(newResults)
    setPhase('done')
    fetchExplanations(newResults)
  }

  const handleStripeCheckout = async () => {
    if (!profile) return
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, username: profile.username }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setCheckoutLoading(false)
    }
  }

  // ЛИМИТ
  if (phase === 'limit') return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center">
        <Fox mood="sad" size={160} />
        <h2 className="text-2xl font-bold text-gray-700 mt-6 mb-2">Достигна седмичния лимит</h2>
        <p className="text-gray-500 mb-2">Безплатният план включва {FREE_WEEKLY_LIMIT} диктовки седмично.</p>
        <p className="text-gray-500 mb-8">Нова седмица — нови диктовки! 🗓️</p>
        <div className="bg-orange-100 rounded-2xl p-6 mb-6">
          <p className="text-orange-700 font-bold text-lg mb-2">⭐ Premium — 4.50€/месец</p>
          <p className="text-orange-600 text-sm mb-4">Неограничени диктовки + качествен глас + обяснения на грешките</p>
          <button
            onClick={handleStripeCheckout}
            disabled={checkoutLoading}
            className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {checkoutLoading ? '⏳ Зареждане...' : '⭐ Стани Premium →'}
          </button>
        </div>
        <button onClick={() => setPhase('pick')} className="w-full bg-white text-orange-500 border-2 border-orange-300 font-bold py-4 rounded-2xl hover:bg-orange-50 transition-colors">
          ← Назад
        </button>
      </div>
    </main>
  )

  // ИЗБОР
  if (phase === 'pick') return (
    <main className="u4a-dash min-h-screen p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="max-w-md mx-auto">
        <button onClick={() => router.push('/dashboard')} className="text-orange-400 mb-6 flex items-center gap-2">← Назад</button>
        {profile?.is_premium && (
          <button onClick={() => router.push('/scan-dictation')}
            className="w-full bg-white border-2 border-orange-300 text-orange-500 font-bold py-3 rounded-2xl hover:bg-orange-50 transition-colors mb-4 flex items-center justify-center gap-2">
            📷 Снимай текст и лисицата го чете
          </button>
        )}
        <h1 className="text-2xl font-bold text-gray-700 mb-2">Избери диктовка</h1>
        {!profile?.is_premium && (
          <div className="bg-orange-100 rounded-2xl p-3 mb-4 flex items-center justify-between">
            <p className="text-orange-700 text-sm">Безплатни диктовки тази седмица:</p>
            <p className="text-orange-700 font-bold">{weeklyCount}/{FREE_WEEKLY_LIMIT}</p>
          </div>
        )}
        <div className="bg-white rounded-2xl p-4 shadow mb-6">
          <p className="text-gray-500 text-sm mb-2">Скорост на четене:</p>
          <div className="grid grid-cols-2 gap-2">
            {[{label: '🐢 Бавно', val: 0.7}, {label: '🚶 Нормално', val: 1.0}].map(s => (
              <button key={s.val} onClick={() => setSpeed(s.val)}
                className={`py-3 rounded-xl font-bold border-2 transition-all ${speed === s.val ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-500 border-orange-200'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        {dictations.length === 0 && <p className="text-gray-400 text-center">Няма диктовки за твоя клас.</p>}
        <div className="flex flex-col gap-4">
          {dictations.map(d => (
            <button key={d.id} onClick={() => startDictation(d)}
              className="bg-white rounded-2xl p-6 shadow text-left hover:shadow-md transition-shadow border-2 border-transparent hover:border-orange-300">
              <h2 className="text-xl font-bold text-gray-700">{d.title}</h2>
              <p className="text-orange-500 mt-1">{(d.sentences as Sentence[]).length} изречения • {d.grade} клас</p>
              {d.is_premium && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full mt-2 inline-block">⭐ Premium</span>}
            </button>
          ))}
        </div>
      </div>
    </main>
  )

  // ГОТОВ
  if (phase === 'ready' && selected) return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center">
        <Fox mood="happy" size={160} />
        <h2 className="text-2xl font-bold text-gray-700 mt-6 mb-2">{selected.title}</h2>
        <p className="text-gray-500 mb-2">{(selected.sentences as Sentence[]).length} изречения</p>
        <p className="text-gray-500 mb-8">Вземи молив и хартия. Когато си готов, натисни бутона!</p>
        <button onClick={() => { setPhase('play'); setTimeout(() => readSentence(selected.sentences as Sentence[], 0, selected.grade), 300) }}
          className="w-full bg-orange-500 text-white text-2xl font-bold py-6 rounded-2xl hover:bg-orange-600 transition-colors shadow-lg">
          Готов съм! ✏️
        </button>
        <button onClick={handleBack} className="mt-4 text-orange-400">← Назад</button>
      </div>
    </main>
  )

  // ЧЕТЕНЕ
  if (phase === 'play' && selected) {
    const sentences = selected.sentences as Sentence[]
    const repeatLimit = REPEAT_LIMITS[selected.grade] ?? 0
    return (
      <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
        <div className="w-full max-w-md">
          <button onClick={handleBack} className="text-orange-400 mb-4 flex items-center gap-2">← Спри диктовката</button>
          <div className="text-center mb-4">
            <p className="text-gray-400 text-sm">{selected.title}</p>
            <p className="text-orange-500 font-bold">Изречение {sentenceIndex + 1} от {sentences.length}</p>
          </div>
          <div className="w-full bg-orange-100 rounded-full h-3 mb-6">
            <div className="bg-orange-500 h-3 rounded-full transition-all" style={{ width: `${(sentenceIndex / sentences.length) * 100}%` }} />
          </div>
          <div className="flex justify-center mb-4"><Fox mood={foxMood} size={140} /></div>
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
          <button onClick={handleRepeat} disabled={repeatsLeft <= 0 || speaking || repeatLimit === 0}
            className={`w-full py-3 rounded-2xl font-bold border-2 transition-all ${
              repeatLimit === 0 ? 'hidden'
              : repeatsLeft <= 0 || speaking ? 'bg-gray-100 text-gray-400 border-gray-200'
              : 'bg-white border-orange-300 text-orange-500 hover:bg-orange-50'}`}>
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
      <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <Fox mood="pointing" size={120} />
            <h2 className="text-2xl font-bold text-gray-700 mt-4">Диктовката свърши!</h2>
            <p className="text-gray-500 mt-1">Въведи всяко изречение на нов ред</p>
          </div>
          {profile?.is_premium && (
            <div className="bg-white rounded-2xl p-4 shadow mb-4">
              <p className="text-gray-500 text-sm mb-3">⭐ Premium: Снимай написаното и лисицата ще го прочете!</p>
              <p style={{ fontSize: '0.75rem', color: '#92400E', fontStyle: 'italic', marginBottom: 8, lineHeight: 1.5 }}>💡 <em>u4a.bg ползва AI за разпознаване на ръкопис. Разпознаването не винаги е точно — работим всекидневно за подобрението му. За по-добро разпознаване, пиши през ред.</em></p>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { if (e.target.files?.[0]) { handleOCR(e.target.files[0]); e.target.value = '' } }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={ocrLoading}
                className="w-full bg-orange-100 text-orange-600 font-bold py-3 rounded-xl hover:bg-orange-200 transition-colors disabled:opacity-40">
                {ocrLoading ? '📷 Разпознавам...' : '📷 Снимай написаното'}
              </button>
            </div>
          )}
          <div className="bg-white rounded-3xl p-6 shadow-lg mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Твоят текст</span>
              <span>{sentences.length} изречения</span>
            </div>
            <textarea value={fullInput} onChange={e => setFullInput(e.target.value)}
              rows={sentences.length + 2}
              className="w-full border-2 border-orange-200 rounded-2xl p-4 text-lg focus:outline-none focus:border-orange-400 resize-none"
              placeholder={`Изречение 1\nИзречение 2\n...`} autoFocus />
          </div>
          <button onClick={handleSubmit} disabled={!fullInput.trim()}
            className="w-full bg-orange-500 text-white text-xl font-bold py-4 rounded-2xl hover:bg-orange-600 disabled:opacity-40 transition-colors mb-3">
            ✏️ Провери диктовката
          </button>
          <button onClick={async () => {
            if (!selected || !profile) return
            const { data: parentLink } = await supabase.from('parent_children').select('parent_id').eq('child_id', profile.id).maybeSingle()
            const autoConfirm = !parentLink
            await supabase.from('dictation_sessions').insert({
              profile_id: profile.id,
              dictation_id: selected.id,
              dictation_title: selected.title,
              score: null,
              total: (selected.sentences as Sentence[]).length,
              time_seconds: 0,
              results: null,
              parent_confirmed: autoConfirm,
              is_started_only: false,
            })
            setWeeklyCount(c => c + 1)
            router.push('/dashboard')
          }}
            className="w-full bg-white text-orange-500 border-2 border-orange-300 font-bold py-4 rounded-2xl hover:bg-orange-50 transition-colors">
            ➡️ Продължи без оценяване
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
      <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <Fox mood={mood} size={128} />
            <h1 className="text-3xl font-bold text-gray-700 mb-2 mt-4">
              {percent >= 80 ? '🎉 Браво!' : percent >= 50 ? '👍 Добре!' : '💪 Продължавай!'}
            </h1>
            <p className="text-6xl font-bold text-orange-500">{score}/{sentences.length}</p>
            <p className="text-gray-400">{percent}% верни изречения</p>
          </div>

          {loadingExplanations && (
            <div className="bg-orange-50 rounded-2xl p-4 mb-4 text-center">
              <p className="text-orange-500 animate-pulse">🦊 Лисицата анализира грешките...</p>
            </div>
          )}
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
                  <>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.wordResults.map((wr, j) => (
                        <span key={j} className={`text-sm px-1 rounded ${wr.correct ? 'text-gray-600' : wr.errorType === 'punctuation' ? 'bg-orange-100 text-orange-600 font-bold' : wr.errorType === 'capitalization' ? 'bg-yellow-100 text-yellow-600 font-bold' : 'bg-red-100 text-red-600 font-bold'}`}>
                          {wr.word}
                        </span>
                      ))}
                    </div>
                    {explanations[i] && (
                      <div className="mt-3 bg-orange-50 rounded-xl p-3 border border-orange-200">
                        <p className="text-xs text-orange-500 font-bold mb-1">🦊 Лисицата обяснява:</p>
                        <div className="text-sm text-gray-600 prose prose-sm max-w-none"><ReactMarkdown>{explanations[i]}</ReactMarkdown></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <button onClick={() => router.push('/dashboard')}
            className="w-full bg-orange-500 text-white text-xl font-bold py-4 rounded-2xl hover:bg-orange-600 transition-colors">
            Към началото 🏠
          </button>
        </div>
      </main>
    )
  }

  return null
}