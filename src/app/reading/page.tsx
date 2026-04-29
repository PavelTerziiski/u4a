'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import Fox from '@/components/fox/Fox'
import '../dashboard/dashboard.css'

type ReadingText = {
  id: string
  title: string
  grade: number
  level: string
  sentences: { id: number; text: string }[]
}

export default function ReadingPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [texts, setTexts] = useState<ReadingText[]>([])
  const [selected, setSelected] = useState<ReadingText | null>(null)
  const [phase, setPhase] = useState<'pick' | 'ready' | 'play' | 'done'>('pick')
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const [recording, setRecording] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [score, setScore] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingStartRef = useRef<number>(0)
  const chunksRef = useRef<Blob[]>([])
  const audioCtx = useRef<AudioContext | null>(null)

  useEffect(() => {
    const username = localStorage.getItem('u4a_username')
    if (!username) { router.push('/login'); return }
    supabase.from('profiles').select('*').eq('username', username).single()
      .then(({ data }) => {
        if (!data) { router.push('/login'); return }
        setProfile(data)
        supabase.from('reading_texts')
          .select('*')
          .eq('grade', data.grade)
          .then(({ data: t }) => setTexts(t || []))
      })
  }, [])

  const playAzureTTS = async (text: string, onDone?: () => void) => {
    const res = await fetch('/api/tts-azure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: 'kalina', speed: 1 })
    })
    const blob = await res.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const ctx = audioCtx.current || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    audioCtx.current = ctx
    ctx.decodeAudioData(arrayBuffer, (decoded) => {
      const source = ctx.createBufferSource()
      source.buffer = decoded
      source.connect(ctx.destination)
      source.onended = () => { if (onDone) onDone() }
      source.start(0)
    })
  }
  const startRecording = async () => {
    setFeedback('')
    chunksRef.current = []
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    mediaRecorderRef.current = mr
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.start()
    recordingStartRef.current = Date.now()
    setRecording(true)
    const sentence = selected?.sentences[sentenceIndex]?.text || ''
    const wordCount = sentence.split(' ').length
    const duration = Math.round((wordCount * 0.7 + 1.5) * 1000)
    setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        handleRecord()
      }
    }, duration)
  }












  const stopRecordingAndTranscribe = async () => {
    return new Promise<string>((resolve) => {
      const mr = mediaRecorderRef.current
      if (!mr) { resolve(''); return }
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('file', blob, 'audio.webm')
        formData.append('model', 'whisper-1')
        formData.append('language', 'bg')
        const res = await fetch('/api/whisper', {
          method: 'POST',
          body: formData
        })
        const data = await res.json()
        resolve(data.text || '')
      }
      mr.stop()
      mr.stream.getTracks().forEach(t => t.stop())
      setRecording(false)
    })
  }

  const handleRecord = async () => {
    if (recording) {
      setFeedbackLoading(true)
      const elapsed = Date.now() - recordingStartRef.current
      if (elapsed < 1500) { setFeedbackLoading(false); return }
      const text = await stopRecordingAndTranscribe()
      // transcript not used
      const original = selected!.sentences[sentenceIndex].text
      const res = await fetch('/api/reading-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original, transcript: text, grade: profile?.grade })
      })
      const data = await res.json()
      const msg = data.correct ? 'Браво!' : 'Опитай пак!'
      setFeedback(msg)
      setFeedbackLoading(false)
      if (data.correct) setScore(s => s + 1)
      await playAzureTTS(msg)
      setTimeout(() => {
        // transcript not used
        setFeedback('')
        if (data.correct) {
          if (sentenceIndex + 1 >= selected!.sentences.length) {
            setPhase('done')
          } else {
            setSentenceIndex(i => i + 1)
            startRecording()
          }
        } else {
          startRecording()
        }
      }, 1500)
    } else {
      await startRecording()
    }
  }

  const nextSentence = () => {
    if (!selected) return
    // transcript not used
    setFeedback('')
    if (sentenceIndex + 1 >= selected.sentences.length) {
      setPhase('done')
    } else {
      setSentenceIndex(i => i + 1)
    }
  }

  if (phase === 'pick') return (
    <main className="u4a-dash min-h-screen p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="max-w-md mx-auto">
        <button onClick={() => router.push('/dashboard')} className="text-orange-400 mb-6 flex items-center gap-2">← Назад</button>
        <h1 className="text-2xl font-bold text-gray-700 mb-6">📖 Четене на глас</h1>
        {texts.length === 0 && <p className="text-gray-400 text-center">Няма текстове за твоя клас.</p>}
        {texts.map(t => (
          <button key={t.id} onClick={() => { setSelected(t); setPhase('ready'); setSentenceIndex(0); setScore(0) }}
            className="w-full bg-white rounded-2xl p-5 shadow text-left hover:shadow-md transition-shadow border-2 border-transparent hover:border-orange-300 mb-3">
            <h2 className="text-lg font-bold text-gray-700">{t.title}</h2>
            <p className="text-orange-500 text-sm mt-1">{t.sentences.length} изречения · {t.level === 'easy' ? '🟢 Лесно' : t.level === 'medium' ? '🟡 Средно' : '🔴 Трудно'}</p>
          </button>
        ))}
      </div>
    </main>
  )

  if (phase === 'ready' && selected) return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center">
        <Fox mood="happy" size={160} />
        <h2 className="text-2xl font-bold text-gray-700 mt-6 mb-2">{selected.title}</h2>
        <p className="text-gray-500 mb-2">{selected.sentences.length} изречения · Чети на глас, лисицата слуша!</p>
        <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#F97316', fontSize: '0.9rem', marginBottom: 24 }}>🎤 Говори близо до устройството за по-добро разпознаване</p>
        <button onClick={() => {
          if (!audioCtx.current) {
            const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
            audioCtx.current = new AC()
          }
          setPhase('play')
          playAzureTTS('Започвай!')
        }}
          className="w-full bg-orange-500 text-white text-2xl font-bold py-6 rounded-2xl hover:bg-orange-600 transition-colors shadow-lg">
          Готов съм! 🎤
        </button>
        <button onClick={() => setPhase('pick')} className="mt-4 text-orange-400">← Назад</button>
      </div>
    </main>
  )

  if (phase === 'play' && selected) {
    const sentence = selected.sentences[sentenceIndex]
    return (
      <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
        <div className="u4a-dash-overlay"></div>
        <div className="w-full max-w-md">
          <button onClick={() => { if (mediaRecorderRef.current) { try { mediaRecorderRef.current.stop() } catch {} mediaRecorderRef.current = null } setRecording(false); setPhase('pick') }} className="text-orange-400 mb-4">← Спри</button>
          <div className="text-center mb-4">
            <p className="text-gray-400 text-sm">{selected.title}</p>
            <p className="text-orange-500 font-bold">Изречение {sentenceIndex + 1} от {selected.sentences.length}</p>
          </div>
          <div className="w-full bg-orange-100 rounded-full h-3 mb-6">
            <div className="bg-orange-500 h-3 rounded-full transition-all" style={{ width: `${((sentenceIndex) / selected.sentences.length) * 100}%` }} />
          </div>
          <div className="flex justify-center mb-6">
            <Fox mood={recording ? 'wink' : feedback ? (score > sentenceIndex ? 'excited' : 'sad') : 'happy'} size={140} />
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-lg mb-4 text-center">
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#92400E', lineHeight: 1.4, fontFamily: 'Nunito, sans-serif' }}>
              {sentence.text}
            </p>
          </div>
          {feedback && (
            <div className="bg-orange-50 rounded-2xl p-4 mb-4 border border-orange-200">
              <p className="text-orange-600 font-bold text-sm">🦊 {feedback}</p>
            </div>
          )}
          {feedbackLoading && (
            <div className="bg-orange-50 rounded-2xl p-4 mb-4 text-center">
              <p className="text-orange-500 animate-pulse">🦊 Лисицата слуша...</p>
            </div>
          )}
          <button onClick={handleRecord} disabled={feedbackLoading}
            className={`w-full py-4 rounded-2xl font-bold text-white text-xl transition-all mb-3 ${recording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-orange-500 hover:bg-orange-600'}`}>
            {recording ? '⏹ Спри записа' : '🎤 Чети на глас'}
          </button>
          {feedback && (
            <button onClick={nextSentence} className="w-full py-3 rounded-2xl font-bold border-2 border-orange-300 text-orange-500 hover:bg-orange-50">
              {sentenceIndex + 1 >= selected.sentences.length ? 'Завърши →' : 'Следващо →'}
            </button>
          )}
        </div>
      </main>
    )
  }

  if (phase === 'done' && selected) return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center">
        <Fox mood={score >= selected.sentences.length * 0.8 ? 'excited' : 'happy'} size={160} />
        <h1 className="text-3xl font-bold text-gray-700 mt-6 mb-2">
          {score >= selected.sentences.length * 0.8 ? '🎉 Браво!' : '👍 Добре!'}
        </h1>
        <p className="text-6xl font-bold text-orange-500 mb-2">{score}/{selected.sentences.length}</p>
        <p className="text-gray-400 mb-8">верни изречения</p>
        <button onClick={() => router.push('/dashboard')}
          className="w-full bg-orange-500 text-white text-xl font-bold py-4 rounded-2xl hover:bg-orange-600 transition-colors">
          Към началото 🏠
        </button>
      </div>
    </main>
  )

  return null
}