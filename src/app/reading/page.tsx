'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Fox from '@/components/fox/Fox'
import { Dictation } from '@/lib/types'
import '../dashboard/dashboard.css'

type Level = 'easy' | 'medium' | 'hard'

const LEVEL_CONFIG: Record<Level, {
  label: string
  grades: number[]
  color: string
  colorLight: string
  colorBorder: string
  gradient: string
  shadow: string
  progressBg: string
}> = {
  easy: {
    label: 'Лесно',
    grades: [1, 2],
    color: '#2563EB',
    colorLight: '#EFF6FF',
    colorBorder: '#BFDBFE',
    gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
    shadow: 'rgba(59,130,246,0.35)',
    progressBg: '#DBEAFE',
  },
  medium: {
    label: 'Средно',
    grades: [3],
    color: '#EA580C',
    colorLight: '#FFF7ED',
    colorBorder: '#FED7AA',
    gradient: 'linear-gradient(135deg, #F97316, #EA580C)',
    shadow: 'rgba(249,115,22,0.35)',
    progressBg: '#FFEDD5',
  },
  hard: {
    label: 'Трудно',
    grades: [4],
    color: '#7C3AED',
    colorLight: '#F5F3FF',
    colorBorder: '#DDD6FE',
    gradient: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
    shadow: 'rgba(124,58,237,0.35)',
    progressBg: '#EDE9FE',
  },
}

export default function ReadingPage() {
  const router = useRouter()
  const [level, setLevel] = useState<Level | null>(null)
  const [dictations, setDictations] = useState<Dictation[]>([])
  const [selected, setSelected] = useState<Dictation | null>(null)
  const [phase, setPhase] = useState<'pick' | 'play' | 'done'>('pick')
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | ''>('')
  const [owlSays, setOwlSays] = useState('')
  const [score, setScore] = useState(0)
  const [typedText, setTypedText] = useState('')
  const [foxName, setFoxName] = useState('Роки')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const isActiveRef = useRef(true)
  const currentStreamRef = useRef<MediaStream | null>(null)
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const username = localStorage.getItem('u4a_username')
    if (!username) { router.push('/login'); return }
    supabase.from('profiles').select('*').eq('username', username).single()
      .then(({ data }) => {
        if (!data) { router.push('/login'); return }
        if (data.fox_name) setFoxName(data.fox_name)
        const lvl = new URLSearchParams(window.location.search).get('level') as Level | null
        if (lvl && ['easy','medium','hard'].includes(lvl)) loadLevel(lvl)
      })
  }, [])

  useEffect(() => {
    return () => { if (typingIntervalRef.current) clearInterval(typingIntervalRef.current) }
  }, [])

  const loadLevel = async (lvl: Level) => {
    const grades = LEVEL_CONFIG[lvl].grades
    const { data } = await supabase
      .from('dictations')
      .select('*')
      .in('grade', grades)
      .order('grade')
    setDictations((data || []).filter((d: Dictation) => d.language !== 'en' && d.language !== 'de'))
    setLevel(lvl)
  }
const unlockAudio = async () => {
  const ctx = getAudioCtx()
  if (ctx.state === 'suspended') await ctx.resume()
  const buf = ctx.createBuffer(1, 1, 22050)
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.connect(ctx.destination)
  src.start(0)
}
  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioCtxRef.current = new AC()
    }
    return audioCtxRef.current
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const playTTS = async (text: string, voice = 'kalina', dictationId?: string) => {
    const res = await fetch('/api/tts-azure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed: 0.85, dictation_id: dictationId })
    })
    const blob = await res.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const ctx = getAudioCtx()
    await ctx.resume()
    return new Promise<void>((resolve) => {
      if (!isActiveRef.current) { resolve(); return }
      ctx.decodeAudioData(arrayBuffer, (decoded) => {
        if (!isActiveRef.current) { resolve(); return }
        if (currentSourceRef.current) { try { currentSourceRef.current.stop() } catch {} }
        const source = ctx.createBufferSource()
        currentSourceRef.current = source
        source.buffer = decoded
        source.connect(ctx.destination)
        source.onended = () => { currentSourceRef.current = null; resolve() }
        source.start(0)
      })
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const typeText = (text: string) => {
    return new Promise<void>((resolve) => {
      setTypedText('')
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current)
      let i = 0
      typingIntervalRef.current = setInterval(() => {
        i++
        setTypedText(text.slice(0, i))
        if (i >= text.length) {
          if (typingIntervalRef.current) clearInterval(typingIntervalRef.current)
          resolve()
        }
      }, 38)
    })
  }

  const stopAll = () => {
    isActiveRef.current = false
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current)
    if (currentSourceRef.current) { try { currentSourceRef.current.stop() } catch {} currentSourceRef.current = null }
    if (currentStreamRef.current) { currentStreamRef.current.getTracks().forEach(t => t.stop()); currentStreamRef.current = null }
    if (mediaRecorderRef.current) { try { mediaRecorderRef.current.stop() } catch {} mediaRecorderRef.current = null }
    setRecording(false)
    setLoading(false)
  }

  const playSentence = async (dictation: Dictation, idx: number) => {
    const sentence = dictation.sentences[idx].text
    setTypedText(sentence)
    beginRecording(dictation, idx)
  }

  const beginRecording = async (dictation: Dictation, idx: number) => {
    if (!isActiveRef.current) return
    setFeedbackType('')
    setOwlSays('')
    chunksRef.current = []
    if (currentStreamRef.current) currentStreamRef.current.getTracks().forEach(t => t.stop())
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    currentStreamRef.current = stream
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
    const mr = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = mr
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.start()
    setRecording(true)
    const sentence = dictation.sentences[idx].text
    const wordCount = sentence.split(' ').length
    const duration = Math.round((wordCount * 0.65 + 1.8) * 1000)
    setTimeout(() => evaluateRecording(dictation, idx), duration)
  }

  const evaluateRecording = (dictation: Dictation, idx: number) => {
    const mr = mediaRecorderRef.current
    if (!mr || !isActiveRef.current) return
    setRecording(false)
    setLoading(true)
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType })
      const fd = new FormData()
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      fd.append('file', blob, `audio.${ext}`)
      fd.append('language', 'bg')
      const res = await fetch('/api/whisper', { method: 'POST', body: fd })
      const data = await res.json()
      const transcript = (data.text || '').toLowerCase().trim()
      const original = dictation.sentences[idx].text.toLowerCase()
      const originalWords = original.replace(/[.,!?;:]/g, '').split(' ')
      const transcriptWords = transcript.replace(/[.,!?;:]/g, '').split(' ')
      const matchCount = originalWords.filter((w: string) => transcriptWords.includes(w)).length
      const isCorrect = transcript.length > 2 && matchCount >= Math.ceil(originalWords.length * 0.5)
      setLoading(false)
      if (isCorrect) {
        setFeedbackType('correct')
        setOwlSays('Браво!')
        setScore(s => s + 1)
        // await playTTS('Браво!', 'borisslav')
        setTimeout(async () => {
          if (!isActiveRef.current) return
          const next = idx + 1
          if (next >= dictation.sentences.length) {
            setPhase('done')
          } else {
            setSentenceIndex(next)
            await playSentence(dictation, next)
          }
        }, 1200)
      } else {
        setFeedbackType('wrong')
        setOwlSays('Опитай пак!')
        // без TTS в Четене на глас
        setTimeout(() => {
          if (!isActiveRef.current) return
          beginRecording(dictation, idx)
        }, 400)
      }
    }
    mr.stop()
    mr.stream.getTracks().forEach(t => t.stop())
  }

  const skipSentence = async () => {
    if (!selected) return
    const next = sentenceIndex + 1
    if (next >= selected.sentences.length) {
      setPhase('done')
    } else {
      setSentenceIndex(next)
      setFeedbackType('')
      setOwlSays('')
      await playSentence(selected, next)
    }
  }

  const cfg = level ? LEVEL_CONFIG[level] : null

  if (phase === 'pick') return (
    <main className="u4a-dash min-h-screen p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="max-w-md mx-auto" style={{ position: 'relative', zIndex: 1 }}>
        <button onClick={() => {
          if (level) { setLevel(null); setDictations([]) }
          else router.push('/pronunciation')
        }} style={{
          background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer',
          color: '#F97316', marginBottom: 24, display: 'flex', alignItems: 'center',
          gap: 6, fontFamily: 'Nunito, sans-serif', fontWeight: 800
        }}>
          ← Назад
        </button>

        {!level ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <Fox mood="happy" size={120} />
              <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '2rem', color: '#374151', marginTop: 12, marginBottom: 8 }}>
                📖 Четене на глас
              </h1>
              <p style={{ fontFamily: 'Nunito, sans-serif', color: '#92400E', fontSize: '1rem' }}>
                Ти четеш, {foxName} слуша!
              </p>
            </div>
            {(['easy', 'medium', 'hard'] as Level[]).map(lvl => {
              const c = LEVEL_CONFIG[lvl]
              return (
                <button key={lvl} onClick={() => loadLevel(lvl)} style={{
                  width: '100%', background: c.gradient, color: 'white',
                  border: 'none', borderRadius: 20, padding: '1.3rem 1.5rem',
                  fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.3rem',
                  cursor: 'pointer', boxShadow: `0 8px 24px ${c.shadow}`,
                  marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span>📖 {c.label}</span>
                  <span style={{ opacity: 0.85, fontSize: '0.9rem', fontWeight: 700 }}>
                    {lvl === 'easy' ? '1–2 клас' : lvl === 'medium' ? '3 клас' : '4 клас'}
                  </span>
                </button>
              )
            })}
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: cfg!.color, marginBottom: 20 }}>
              {cfg!.label} — избери диктовка
            </h2>
            {dictations.length === 0 && (
              <p style={{ color: '#9CA3AF', textAlign: 'center', fontFamily: 'Nunito, sans-serif' }}>Зареждане...</p>
            )}
            {dictations.map(d => (
              <button key={d.id} onClick={async () => {
                await unlockAudio()
                isActiveRef.current = true
                setSelected(d)
                setSentenceIndex(0)
                setScore(0)
                setFeedbackType('')
                setOwlSays('')
                setTypedText('')
                setPhase('play')
                playSentence(d, 0)
              }} style={{
                width: '100%', background: 'white', border: `2px solid ${cfg!.colorBorder}`,
                borderRadius: 16, padding: '1rem 1.2rem', marginBottom: 12,
                textAlign: 'left', cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#374151' }}>{d.title}</div>
                <div style={{ fontSize: '0.85rem', color: cfg!.color, marginTop: 4, fontWeight: 700 }}>
                  {d.sentences.length} изречения
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </main>
  )

  if (phase === 'play' && selected && cfg) {
    const sentence = selected.sentences[sentenceIndex]
    return (
      <main className="u4a-dash min-h-screen flex flex-col items-center p-6 pt-10">
        <div className="u4a-dash-overlay"></div>
        <div className="w-full max-w-md" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <button onClick={() => { stopAll(); setPhase('pick') }} style={{
              background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: cfg.color
            }}>←</button>
            <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: cfg.color }}>
              {sentenceIndex + 1} / {selected.sentences.length}
            </span>
            <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#F97316' }}>⭐ {score}</span>
          </div>

          <div style={{ width: '100%', background: cfg.progressBg, borderRadius: 99, height: 10, marginBottom: 24 }}>
            <div style={{
              width: `${(sentenceIndex / selected.sentences.length) * 100}%`,
              background: cfg.gradient, height: 10, borderRadius: 99, transition: 'width 0.5s'
            }} />
          </div>

          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <Fox mood={feedbackType === 'correct' ? 'excited' : feedbackType === 'wrong' ? 'sad' : recording ? 'wink' : 'happy'} size={130} />
          </div>

          {owlSays && (
            <div style={{
              background: feedbackType === 'correct' ? '#F0FDF4' : cfg.colorLight,
              border: `2px solid ${feedbackType === 'correct' ? '#86EFAC' : cfg.colorBorder}`,
              borderRadius: 16, padding: '10px 16px', marginBottom: 16, textAlign: 'center'
            }}>
              <span style={{ fontSize: '1.3rem' }}>🦉</span>
              <span style={{
                fontFamily: 'Nunito, sans-serif', fontWeight: 800,
                color: feedbackType === 'correct' ? '#166534' : cfg.color,
                fontSize: '1.05rem', marginLeft: 8
              }}>{owlSays}</span>
            </div>
          )}

          <div style={{
            background: cfg.colorLight, border: `2px solid ${cfg.colorBorder}`,
            borderRadius: 24, padding: '1.8rem', textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.06)', marginBottom: 20,
            minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <p style={{
              fontSize: '1.55rem', fontWeight: 800, color: '#1F2937',
              lineHeight: 1.45, fontFamily: 'Nunito, sans-serif', margin: 0
            }}>
              {typedText}
              {typedText.length < sentence.text.length && (
                <span style={{ opacity: 0.5 }}>|</span>
              )}
            </p>
          </div>

          {loading && (
            <div style={{
              background: cfg.colorLight, border: `2px solid ${cfg.colorBorder}`,
              borderRadius: 16, padding: '12px', marginBottom: 16, textAlign: 'center'
            }}>
              <p style={{ fontFamily: 'Nunito, sans-serif', color: cfg.color, fontWeight: 700, margin: 0 }}>
                🦊 Роки слуша...
              </p>
            </div>
          )}

          {recording && !loading && (
            <div style={{
              width: '100%', background: '#FEF2F2', border: '2px solid #FECACA',
              borderRadius: 16, padding: '1.2rem', textAlign: 'center',
              fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.2rem',
              color: '#DC2626', marginBottom: 12,
              boxShadow: '0 0 0 8px rgba(239,68,68,0.1)',
            }}>
              📖 Прочети на глас!
            </div>
          )}

          {feedbackType === 'wrong' && !recording && !loading && (
            <button onClick={skipSentence} style={{
              width: '100%', background: 'none', border: `2px solid ${cfg.colorBorder}`,
              color: cfg.color, borderRadius: 16, padding: '0.9rem', marginTop: 8,
              fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', cursor: 'pointer'
            }}>
              Пропусни →
            </button>
          )}
        </div>
      </main>
    )
  }

  if (phase === 'done' && selected && cfg) return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
        <Fox mood={score >= selected.sentences.length * 0.7 ? 'excited' : 'happy'} size={160} />
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '2.5rem', color: cfg.color, marginTop: 16 }}>
          {score >= selected.sentences.length * 0.7 ? '🎉 Браво!' : '👍 Добре!'}
        </h1>
        <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: '4rem', fontWeight: 900, color: '#F97316' }}>
          {score}/{selected.sentences.length}
        </p>
        <p style={{ color: '#92400E', fontFamily: 'Nunito, sans-serif', marginBottom: 32 }}>верни изречения</p>
        <button onClick={() => { stopAll(); isActiveRef.current = true; setPhase('pick'); setSelected(null) }} style={{
          width: '100%', background: cfg.gradient, color: 'white',
          border: 'none', borderRadius: 20, padding: '1.2rem',
          fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.3rem',
          cursor: 'pointer', boxShadow: `0 8px 24px ${cfg.shadow}`, marginBottom: 12
        }}>
          Избери друга диктовка
        </button>
        <button onClick={() => router.push('/pronunciation')} style={{
          width: '100%', background: 'none', border: '2px solid #FED7AA',
          color: '#F97316', borderRadius: 20, padding: '1rem',
          fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer'
        }}>
          Към Правоговор 🏠
        </button>
      </div>
    </main>
  )

  return null
}
