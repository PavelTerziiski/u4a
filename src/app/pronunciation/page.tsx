'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Fox from '@/components/fox/Fox'
import '../dashboard/dashboard.css'

const ALPHABET = [
  { letter: 'А', word: 'Автобус', emoji: '🚌' },
  { letter: 'Б', word: 'Банан', emoji: '🍌' },
  { letter: 'В', word: 'Вълк', emoji: '🐺' },
  { letter: 'Г', word: 'Гора', emoji: '🌲' },
  { letter: 'Д', word: 'Дъга', emoji: '🌈' },
  { letter: 'Е', word: 'Елен', emoji: '🦌' },
  { letter: 'Ж', word: 'Жаба', emoji: '🐸' },
  { letter: 'З', word: 'Заек', emoji: '🐰' },
  { letter: 'И', word: 'Игла', emoji: '🪡' },
  { letter: 'Й', word: 'Йогурт', emoji: '🥛' },
  { letter: 'К', word: 'Куче', emoji: '🐶' },
  { letter: 'Л', word: 'Лисица', emoji: '🦊' },
  { letter: 'М', word: 'Мечка', emoji: '🐻' },
  { letter: 'Н', word: 'Небе', emoji: '☁️' },
  { letter: 'О', word: 'Орел', emoji: '🦅' },
  { letter: 'П', word: 'Пеперуда', emoji: '🦋' },
  { letter: 'Р', word: 'Риба', emoji: '🐟' },
  { letter: 'С', word: 'Слон', emoji: '🐘' },
  { letter: 'Т', word: 'Тигър', emoji: '🐯' },
  { letter: 'У', word: 'Утка', emoji: '🦆' },
  { letter: 'Ф', word: 'Фар', emoji: '🏮' },
  { letter: 'Х', word: 'Хляб', emoji: '🍞' },
  { letter: 'Ц', word: 'Цвете', emoji: '🌸' },
  { letter: 'Ч', word: 'Черешa', emoji: '🍒' },
  { letter: 'Ш', word: 'Шапка', emoji: '🎩' },
  { letter: 'Щ', word: 'Щъркел', emoji: '🦢' },
  { letter: 'Ъ', word: 'Ъгъл', emoji: '📐' },
  { letter: 'Ю', word: 'Юла', emoji: '🌀' },
  { letter: 'Я', word: 'Ябълка', emoji: '🍎' },
]

const OWL_REACTIONS = {
  correct: ['Браво!', 'Чудесно!', 'Страхотно!', 'Перфектно!', 'Супер!'],
  wrong: ['Опитай пак!', 'Почти!', 'Хайде още веднъж!'],
}

export default function PronunciationPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [phase, setPhase] = useState<'menu' | 'play' | 'done'>('menu')
  const [index, setIndex] = useState(0)
  const [recording, setRecording] = useState(false)
  const [, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | ''>('')
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [showEmoji, setShowEmoji] = useState(false)
  const [owlSays, setOwlSays] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const currentStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const username = localStorage.getItem('u4a_username')
    if (!username) { router.push('/login'); return }
    supabase.from('profiles').select('*').eq('username', username).single()
      .then(({ data }) => {
        if (!data) { router.push('/login'); return }
        setProfile(data)
      })
  }, [])

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioCtxRef.current = new AC()
    }
    return audioCtxRef.current
  }

  const playTTS = async (text: string, voice = 'kalina') => {
    const res = await fetch('/api/tts-azure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed: 0.85 })
    })
    const blob = await res.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const ctx = getAudioCtx()
    await ctx.resume()
    return new Promise<void>((resolve) => {
      ctx.decodeAudioData(arrayBuffer, (decoded) => {
        const source = ctx.createBufferSource()
        currentSourceRef.current = source
        source.buffer = decoded
        source.connect(ctx.destination)
        source.onended = () => { currentSourceRef.current = null; resolve() }
        source.start(0)
      })
    })
  }

  const startPlay = async () => {
    getAudioCtx()
    setPhase('play')
    setIndex(0)
    setScore(0)
    const foxName = (profile?.fox_name as string) || 'Роки'
    await playTTS(`Хайде да учим буквите! Аз съм ${foxName}. Слушай и повтаряй!`)
    await playCurrentWord(0)
  }

  const playCurrentWord = async (i: number) => {
    const item = ALPHABET[i]
    await playTTS(`Буква ${item.letter}. ${item.word}`)
  }

  const handleRecord = async () => {
    if (recording) return
    setFeedback('')
    setFeedbackType('')
    setOwlSays('')
    chunksRef.current = []
    if (currentStreamRef.current) { currentStreamRef.current.getTracks().forEach(t => t.stop()) }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    currentStreamRef.current = stream
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
    const mr = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = mr
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.start()
    setRecording(true)
    const word = ALPHABET[index].word
    const duration = Math.round((word.length * 0.15 + 1.5) * 1000)
    setTimeout(() => stopAndEvaluate(), duration)
  }

  const stopAndEvaluate = async () => {
    if (!mediaRecorderRef.current) return
    setRecording(false)
    setLoading(true)
    mediaRecorderRef.current.stop()
    await new Promise(r => setTimeout(r, 300))
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    const fd = new FormData()
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
    fd.append('file', blob, `audio.${ext}`)
    fd.append('language', 'bg')
    const res = await fetch('/api/whisper', { method: 'POST', body: fd })
    const data = await res.json()
    const transcript = (data.text || '').toLowerCase().trim()
    const target = ALPHABET[index].word.toLowerCase()
    const targetRoot = target.substring(0, Math.max(3, Math.floor(target.length * 0.6)))
    const isCorrect = transcript.length > 1 && (
      transcript.includes(target) ||
      transcript.includes(targetRoot) ||
      target.includes(transcript.replace(/[^а-яё]/gi, '').substring(0, 3))
    )
    setLoading(false)
    if (isCorrect) {
      const reaction = OWL_REACTIONS.correct[Math.floor(Math.random() * OWL_REACTIONS.correct.length)]
      setOwlSays(reaction)
      setFeedback('correct')
      setFeedbackType('correct')
      setScore(s => s + 1)
      setShowEmoji(true)
      setTimeout(() => setShowEmoji(false), 1500)
      await playTTS(reaction, 'borislav')
      setTimeout(() => nextWord(), 1500)
    } else {
      const reaction = OWL_REACTIONS.wrong[Math.floor(Math.random() * OWL_REACTIONS.wrong.length)]
      setOwlSays(reaction)
      setFeedback('wrong')
      setFeedbackType('wrong')
      await playTTS(reaction, 'borislav')
      await playTTS(`${ALPHABET[index].letter}. ${ALPHABET[index].word}`)
    }
  }

  const nextWord = async () => {
    setFeedback('')
    setOwlSays('')
    if (index + 1 >= ALPHABET.length) {
      setPhase('done')
      return
    }
    const next = index + 1
    setIndex(next)
    await playCurrentWord(next)
  }

  const current = ALPHABET[index]

  if (phase === 'menu') return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center">
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', position: 'absolute', top: 20, left: 20 }}>←</button>
        <Fox mood="happy" size={160} />
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '2.2rem', color: '#7C3AED', marginTop: 16, marginBottom: 8 }}>🗣️ Правоговор</h1>
        <p style={{ fontFamily: 'Nunito, sans-serif', color: '#92400E', marginBottom: 32, fontSize: '1.1rem' }}>Роки казва думата — ти повтаряш!</p>
        <button onClick={startPlay} style={{
          width: '100%', background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
          color: 'white', border: 'none', borderRadius: 20, padding: '1.4rem',
          fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.4rem',
          cursor: 'pointer', boxShadow: '0 8px 24px rgba(124,58,237,0.4)'
        }}>
          🔤 Азбука и звуци
        </button>
      </div>
    </main>
  )

  if (phase === 'play') return (
    <main className="u4a-dash min-h-screen flex flex-col items-center p-6 pt-10">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={() => {
          if (currentSourceRef.current) { try { currentSourceRef.current.stop() } catch {} currentSourceRef.current = null }
          if (currentStreamRef.current) { currentStreamRef.current.getTracks().forEach(t => t.stop()); currentStreamRef.current = null }
          if (mediaRecorderRef.current) { try { mediaRecorderRef.current.stop() } catch {} mediaRecorderRef.current = null }
          setRecording(false)
          setPhase('menu')
        }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>←</button>
          <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#7C3AED' }}>{index + 1} / {ALPHABET.length}</span>
          <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#F97316' }}>⭐ {score}</span>
        </div>

        <div style={{ width: '100%', background: '#EDE9FE', borderRadius: 99, height: 10, marginBottom: 24 }}>
          <div style={{ width: `${((index) / ALPHABET.length) * 100}%`, background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', height: 10, borderRadius: 99, transition: 'width 0.5s' }} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 16, position: 'relative' }}>
          {showEmoji && (
            <div style={{ position: 'absolute', top: -40, width: '100%', fontSize: '3rem', animation: 'fadeUp 1.5s ease-out' }}>🎉✨⭐</div>
          )}
          <Fox mood={feedbackType === 'correct' ? 'excited' : feedbackType === 'wrong' ? 'sad' : recording ? 'wink' : 'happy'} size={140} />
        </div>

        {owlSays && (
          <div style={{
            background: feedbackType === 'correct' ? '#F0FDF4' : '#FFF7ED',
            border: `2px solid ${feedbackType === 'correct' ? '#86EFAC' : '#FED7AA'}`,
            borderRadius: 16, padding: '12px 16px', marginBottom: 16, textAlign: 'center'
          }}>
            <span style={{ fontSize: '1.5rem' }}>🦉</span>
            <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: feedbackType === 'correct' ? '#166534' : '#92400E', fontSize: '1.1rem', marginLeft: 8 }}>{owlSays}</span>
          </div>
        )}

        <div style={{
          background: 'white', borderRadius: 24, padding: '2rem',
          textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', marginBottom: 24
        }}>
          <div style={{ fontSize: '5rem', marginBottom: 8 }}>{current.emoji}</div>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '4rem', color: '#7C3AED', lineHeight: 1 }}>{current.letter}</div>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: '#92400E', marginTop: 8 }}>{current.word}</div>
        </div>

        <button onClick={() => playCurrentWord(index)} style={{
          width: '100%', background: '#F3F0FF', color: '#7C3AED',
          border: '2px solid #DDD6FE', borderRadius: 16, padding: '0.9rem',
          fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem',
          cursor: 'pointer', marginBottom: 12
        }}>
          🔊 Чуй пак
        </button>

        <button onClick={handleRecord} disabled={loading || recording} style={{
          width: '100%',
          background: recording ? '#EF4444' : loading ? '#9CA3AF' : 'linear-gradient(135deg, #7C3AED, #6D28D9)',
          color: 'white', border: 'none', borderRadius: 16, padding: '1.2rem',
          fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.3rem',
          cursor: 'pointer', boxShadow: recording ? '0 0 0 8px rgba(239,68,68,0.2)' : 'none',
          animation: recording ? 'pulse 1s infinite' : 'none'
        }}>
          {loading ? '🦉 Бухалът слуша...' : recording ? '🎤 Слушам...' : '🎤 Повтори!'}
        </button>

        {feedbackType === 'wrong' && !recording && !loading && (
          <button onClick={nextWord} style={{
            width: '100%', background: 'none', border: '2px solid #DDD6FE',
            color: '#7C3AED', borderRadius: 16, padding: '0.9rem', marginTop: 12,
            fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', cursor: 'pointer'
          }}>
            Пропусни →
          </button>
        )}
      </div>
    </main>
  )

  if (phase === 'done') return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center">
        <Fox mood="excited" size={180} />
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '2.5rem', color: '#7C3AED', marginTop: 16 }}>🎉 Браво!</h1>
        <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: '4rem', fontWeight: 900, color: '#F97316' }}>{score}/{ALPHABET.length}</p>
        <p style={{ color: '#92400E', fontFamily: 'Nunito, sans-serif', marginBottom: 32 }}>верни думи</p>
        <button onClick={() => router.push('/dashboard')} style={{
          width: '100%', background: 'linear-gradient(135deg, #F97316, #EA580C)',
          color: 'white', border: 'none', borderRadius: 20, padding: '1.2rem',
          fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.3rem', cursor: 'pointer'
        }}>
          Към началото 🏠
        </button>
      </div>
    </main>
  )

  return null
}
