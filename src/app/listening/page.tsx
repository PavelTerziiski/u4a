'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Fox from '@/components/fox/Fox'
import { Dictation } from '@/lib/types'
import '../../app/dashboard/dashboard.css'

type Mode = 'alphabet' | 'easy' | 'medium' | 'hard'

type PronunciationWord = {
  id: string
  letter: string
  word: string
  emoji: string
  tts_text: string
  sort_order: number
}

const ALPHABET_FALLBACK = [
  { letter: 'А', word: 'Автобус', emoji: '🚌', tts_text: 'А, Автобус' },
  { letter: 'Б', word: 'Банан', emoji: '🍌', tts_text: 'Б, Банан' },
  { letter: 'В', word: 'Вълк', emoji: '🐺', tts_text: 'В, Вълк' },
  { letter: 'Г', word: 'Гора', emoji: '🌲', tts_text: 'Г, Гора' },
  { letter: 'Д', word: 'Дъга', emoji: '🌈', tts_text: 'Д, Дъга' },
  { letter: 'Е', word: 'Елен', emoji: '🦌', tts_text: 'Е, Елен' },
  { letter: 'Ж', word: 'Жаба', emoji: '🐸', tts_text: 'Ж, Жаба' },
  { letter: 'З', word: 'Заек', emoji: '🐰', tts_text: 'З, Заек' },
  { letter: 'И', word: 'Игла', emoji: '🪡', tts_text: 'И, Игла' },
  { letter: 'Й', word: 'Йогурт', emoji: '🥛', tts_text: 'Й, Йогурт' },
  { letter: 'К', word: 'Куче', emoji: '🐶', tts_text: 'К, Куче' },
  { letter: 'Л', word: 'Лисица', emoji: '🦊', tts_text: 'Л, Лисица' },
  { letter: 'М', word: 'Мечка', emoji: '🐻', tts_text: 'М, Мечка' },
  { letter: 'Н', word: 'Небе', emoji: '☁️', tts_text: 'Н, Небе' },
  { letter: 'О', word: 'Орел', emoji: '🦅', tts_text: 'О, Орел' },
  { letter: 'П', word: 'Пеперуда', emoji: '🦋', tts_text: 'П, Пеперуда' },
  { letter: 'Р', word: 'Риба', emoji: '🐟', tts_text: 'Р, Риба' },
  { letter: 'С', word: 'Слон', emoji: '🐘', tts_text: 'С, Слон' },
  { letter: 'Т', word: 'Тигър', emoji: '🐯', tts_text: 'Т, Тигър' },
  { letter: 'У', word: 'Утка', emoji: '🦆', tts_text: 'У, Утка' },
  { letter: 'Ф', word: 'Фар', emoji: '🏮', tts_text: 'Ф, Фар' },
  { letter: 'Х', word: 'Хляб', emoji: '🍞', tts_text: 'Х, Хляб' },
  { letter: 'Ц', word: 'Цвете', emoji: '🌸', tts_text: 'Ц, Цвете' },
  { letter: 'Ч', word: 'Череша', emoji: '🍒', tts_text: 'Ч, Череша' },
  { letter: 'Ш', word: 'Шапка', emoji: '🎩', tts_text: 'Ш, Шапка' },
  { letter: 'Щ', word: 'Щъркел', emoji: '🦢', tts_text: 'Щ, Щъркел' },
  { letter: 'Ъ', word: 'Ъгъл', emoji: '📐', tts_text: 'Ъ, Ъгъл' },
  { letter: 'Ю', word: 'Юла', emoji: '🌀', tts_text: 'Ю, Юла' },
  { letter: 'Я', word: 'Ябълка', emoji: '🍎', tts_text: 'Я, Ябълка' },
]

const LEVEL_CONFIG = {
  easy: { label: 'Лесно', grades: [1, 2], color: '#2563EB', colorLight: '#EFF6FF', colorBorder: '#BBF7D0', gradient: 'linear-gradient(135deg, #22C55E, #16A34A)', shadow: 'rgba(34,197,94,0.35)', progressBg: '#DCFCE7' },
  medium: { label: 'Средно', grades: [3], color: '#EA580C', colorLight: '#FFF7ED', colorBorder: '#FDE68A', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', shadow: 'rgba(245,158,11,0.35)', progressBg: '#FEF3C7' },
  hard: { label: 'Трудно', grades: [4], color: '#2563EB', colorLight: '#FEF2F2', colorBorder: '#BBF7D0', gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)', shadow: 'rgba(37,99,235,0.35)', progressBg: '#DCFCE7' },
}

export default function ListeningPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode | null>(null)
  const [dictations, setDictations] = useState<Dictation[]>([])
  const [selected, setSelected] = useState<Dictation | null>(null)
  const [phase, setPhase] = useState<'menu' | 'pick' | 'play' | 'done'>('menu')
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const [alphaIndex, setAlphaIndex] = useState(0)
  const [alphaWords, setAlphaWords] = useState<PronunciationWord[]>([])
  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | ''>('')
  const [owlSays, setOwlSays] = useState('')
  const [score, setScore] = useState(0)
  const [typedText, setTypedText] = useState('')
  const [strings, setStrings] = useState<Record<string, string>>({})
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      .then(({ data }) => { if (!data) router.push('/login') })
    supabase.from('pronunciation_words').select('*').order('sort_order')
      .then(({ data }) => { if (data && data.length > 0) setAlphaWords(data) })
    fetch('/api/pronunciation-strings').then(r => r.json()).then(data => setStrings(data))
  }, [])

  useEffect(() => {
    return () => { if (typingIntervalRef.current) clearInterval(typingIntervalRef.current) }
  }, [])

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioCtxRef.current = new AC()
    }
    return audioCtxRef.current
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
        const gainNode = ctx.createGain()
        gainNode.gain.value = 2.5
        source.connect(gainNode)
        gainNode.connect(ctx.destination)
        source.onended = () => { currentSourceRef.current = null; resolve() }
        source.start(0)
      })
    })
  }

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

  const loadLevel = async (lvl: 'easy' | 'medium' | 'hard') => {
    const grades = LEVEL_CONFIG[lvl].grades
    const { data } = await supabase.from('dictations').select('*').in('grade', grades).or('category.is.null,category.eq.original').order('grade')
    setDictations((data || []).filter((d: Dictation) => d.language !== 'en' && d.language !== 'de'))
    setMode(lvl)
    setPhase('pick')
  }

  // ALPHABET PLAY
  const alphabet = alphaWords.length > 0 ? alphaWords : ALPHABET_FALLBACK
  const currentAlpha = alphabet[alphaIndex]

  const startAlphabet = async () => {
    await unlockAudio()
    isActiveRef.current = true
    setMode('alphabet')
    setAlphaIndex(0)
    setScore(0)
    setFeedbackType('')
    setOwlSays('')
    setPhase('play')
    if (strings['intro']) await playTTS(strings['intro'])
    await playTTS(alphabet[0].tts_text || alphabet[0].word)
    beginAlphaRecording(0)
  }

  const beginAlphaRecording = async (idx: number) => {
    if (!isActiveRef.current) return
    setFeedbackType('')
    setOwlSays('')
    chunksRef.current = []
    let stream = currentStreamRef.current
    if (!stream || stream.getTracks().every(t => t.readyState === 'ended')) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      currentStreamRef.current = stream
    }
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
    const mr = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = mr
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.start()
    setRecording(true)
    const word = alphabet[idx].word
    const duration = Math.round((word.length * 0.15 + 1.5) * 1000)
    setTimeout(() => evaluateAlpha(idx), duration)
  }

  const evaluateAlpha = (idx: number) => {
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
      const target = alphabet[idx].word.toLowerCase()
      const targetRoot = target.substring(0, Math.max(3, Math.floor(target.length * 0.6)))
      const isCorrect = transcript.length > 1 && (
        transcript.includes(target) || transcript.includes(targetRoot) ||
        target.includes(transcript.replace(/[^а-яё]/gi, '').substring(0, 3))
      )
      setLoading(false)
      if (isCorrect) {
        setFeedbackType('correct')
        setOwlSays('Браво!')
        setScore(s => s + 1)
        await playTTS('Браво!', 'borisslav')
        setTimeout(async () => {
          if (!isActiveRef.current) return
          const next = idx + 1
          if (next >= alphabet.length) { setPhase('done'); return }
          setAlphaIndex(next)
          setFeedbackType('')
          setOwlSays('')
          await playTTS(alphabet[next].tts_text || alphabet[next].word)
          beginAlphaRecording(next)
        }, 1200)
      } else {
        setFeedbackType('wrong')
        setOwlSays('Опитай пак!')
        await playTTS('Опитай пак!', 'borisslav')
        await playTTS(alphabet[idx].tts_text || alphabet[idx].word)
        setTimeout(() => {
          if (!isActiveRef.current) return
          beginAlphaRecording(idx)
        }, 400)
      }
    }
    mr.stop()
    mr.stream.getTracks().forEach(t => t.stop())
  }

  // DICTATION PLAY
  const playSentence = async (dictation: Dictation, idx: number) => {
    const sentence = dictation.sentences[idx].text
    await typeText(sentence)
    await playTTS(sentence, 'kalina', dictation.id)
    beginDictRecording(dictation, idx)
  }

  const beginDictRecording = async (dictation: Dictation, idx: number) => {
    if (!isActiveRef.current) return
    setFeedbackType('')
    setOwlSays('')
    chunksRef.current = []
    let stream = currentStreamRef.current
    if (!stream || stream.getTracks().every(t => t.readyState === 'ended')) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      currentStreamRef.current = stream
    }
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
    const mr = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = mr
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.start()
    setRecording(true)
    const wordCount = dictation.sentences[idx].text.split(' ').length
    const duration = Math.round((wordCount * 0.65 + 1.8) * 1000)
    setTimeout(() => evaluateDict(dictation, idx), duration)
  }

  const evaluateDict = (dictation: Dictation, idx: number) => {
    const mr = mediaRecorderRef.current
    if (!mr || !isActiveRef.current) return
    setRecording(false)
    setLoading(true)
    mr.onstop = async () => {
      if (!isActiveRef.current) return
      const blob = new Blob(chunksRef.current, { type: mr.mimeType })
      const fd = new FormData()
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      fd.append('file', blob, `audio.${ext}`)
      fd.append('language', 'bg')
      const res = await fetch('/api/whisper', { method: 'POST', body: fd })
      if (!isActiveRef.current) return
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
        await playTTS('Браво!', 'borisslav')
        setTimeout(async () => {
          if (!isActiveRef.current) return
          const next = idx + 1
          if (next >= dictation.sentences.length) { setPhase('done'); return }
          setSentenceIndex(next)
          await playSentence(dictation, next)
        }, 1200)
      } else {
        setFeedbackType('wrong')
        setOwlSays('Опитай пак!')
        await playTTS('Опитай пак!', 'borisslav')
        await playTTS(dictation.sentences[idx].text, 'kalina', dictation.id)
        setTimeout(() => {
          if (!isActiveRef.current) return
          beginDictRecording(dictation, idx)
        }, 400)
      }
    }
    mr.stop()
    mr.stream.getTracks().forEach(t => t.stop())
  }

  const skipSentence = async () => {
    if (!selected) return
    const next = sentenceIndex + 1
    if (next >= selected.sentences.length) { setPhase('done'); return }
    setSentenceIndex(next)
    setFeedbackType('')
    setOwlSays('')
    await playSentence(selected, next)
  }

  const cfg = mode && mode !== 'alphabet' ? LEVEL_CONFIG[mode as 'easy'|'medium'|'hard'] : null

  // MENU
  if (phase === 'menu') return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
        <button onClick={() => router.push('/pronunciation')} style={{
          background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer',
          position: 'absolute', top: -40, left: 0, color: '#F97316',
          fontFamily: 'Nunito, sans-serif', fontWeight: 800
        }}>← Назад</button>
        <Fox mood="happy" size={140} />
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '2rem', color: '#2563EB', marginTop: 12, marginBottom: 8 }}>🎧 Слушай и повтаряй</h1>
        <p style={{ fontFamily: 'Nunito, sans-serif', color: '#92400E', marginBottom: 28, fontSize: '1rem' }}>{foxName} казва — ти повтаряш!</p>
        <button onClick={startAlphabet} style={{
          width: '100%', background: 'white', color: '#2563EB',
          border: '2px solid #BBF7D0', borderRadius: 20, padding: '1.2rem',
          fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.2rem',
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.15)', marginBottom: 12
        }}>🔤 Азбука и звуци</button>
        {(['easy', 'medium', 'hard'] as const).map(lvl => {
          const c = LEVEL_CONFIG[lvl]
          return (
            <button key={lvl} onClick={async () => { await unlockAudio(); loadLevel(lvl) }} style={{
              width: '100%', background: c.gradient, color: 'white',
              border: 'none', borderRadius: 20, padding: '1.2rem',
              fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.2rem',
              cursor: 'pointer', boxShadow: `0 8px 24px ${c.shadow}`, marginBottom: 12
            }}>📖 {c.label}</button>
          )
        })}
      </div>
    </main>
  )

  // PICK DICTATION
  if (phase === 'pick' && cfg) return (
    <main className="u4a-dash min-h-screen p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="max-w-md mx-auto" style={{ position: 'relative', zIndex: 1 }}>
        <button onClick={() => { stopAll(); isActiveRef.current = true; setPhase('menu'); setMode(null) }} style={{
          background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer',
          color: '#F97316', marginBottom: 24, fontFamily: 'Nunito, sans-serif', fontWeight: 800
        }}>← Назад</button>
        <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: cfg.color, marginBottom: 20 }}>
          {cfg.label} — избери текст
        </h2>
        {dictations.map(d => (
          <button key={d.id} onClick={async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
              if (currentStreamRef.current) currentStreamRef.current.getTracks().forEach(t => t.stop())
              currentStreamRef.current = stream
            } catch {}
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
            width: '100%', background: 'white', border: `2px solid ${cfg.colorBorder}`,
            borderRadius: 16, padding: '1rem 1.2rem', marginBottom: 12,
            textAlign: 'left', cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#374151' }}>{d.title}</div>
            <div style={{ fontSize: '0.85rem', color: cfg.color, marginTop: 4, fontWeight: 700 }}>{d.sentences.length} изречения</div>
          </button>
        ))}
      </div>
    </main>
  )

  // PLAY — ALPHABET
  if (phase === 'play' && mode === 'alphabet') return (
    <main className="u4a-dash min-h-screen flex flex-col items-center p-6 pt-10">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={() => { stopAll(); setPhase('menu') }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#2563EB' }}>←</button>
          <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#2563EB' }}>{alphaIndex + 1} / {alphabet.length}</span>
          <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#F97316' }}>⭐ {score}</span>
        </div>
        <div style={{ width: '100%', background: '#DCFCE7', borderRadius: 99, height: 10, marginBottom: 24 }}>
          <div style={{ width: `${(alphaIndex / alphabet.length) * 100}%`, background: 'linear-gradient(90deg, #2563EB, #A78BFA)', height: 10, borderRadius: 99, transition: 'width 0.5s' }} />
        </div>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <Fox mood={feedbackType === 'correct' ? 'excited' : feedbackType === 'wrong' ? 'sad' : recording ? 'wink' : 'happy'} size={130} />
        </div>
        {owlSays && (
          <div style={{ background: feedbackType === 'correct' ? '#F0FDF4' : '#FFF7ED', border: `2px solid ${feedbackType === 'correct' ? '#86EFAC' : '#FDE68A'}`, borderRadius: 16, padding: '10px 16px', marginBottom: 16, textAlign: 'center' }}>
            <span style={{ fontSize: '1.3rem' }}>🦉</span>
            <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: feedbackType === 'correct' ? '#166534' : '#92400E', fontSize: '1.05rem', marginLeft: 8 }}>{owlSays}</span>
          </div>
        )}
        <div style={{ background: 'white', borderRadius: 24, padding: '2rem', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', marginBottom: 20 }}>
          <div style={{ fontSize: '5rem', marginBottom: 8 }}>{currentAlpha.emoji}</div>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '4rem', color: '#2563EB', lineHeight: 1 }}>{currentAlpha.letter}</div>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: '#92400E', marginTop: 8 }}>{currentAlpha.word}</div>
        </div>
        <button onClick={() => playTTS(currentAlpha.tts_text || currentAlpha.word)} style={{
          width: '100%', background: '#EFF6FF', color: '#2563EB', border: '2px solid #BBF7D0',
          borderRadius: 16, padding: '0.9rem', fontFamily: 'Nunito, sans-serif', fontWeight: 800,
          fontSize: '1rem', cursor: 'pointer', marginBottom: 12
        }}>🔊 Чуй пак</button>
        {recording && !loading && (
          <div style={{ width: '100%', background: '#FEF2F2', border: '2px solid #FECACA', borderRadius: 16, padding: '1.2rem', textAlign: 'center', fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.2rem', color: '#DC2626', marginBottom: 12 }}>
            🎤 Говори сега...
          </div>
        )}
        {loading && (
          <div style={{ background: '#EFF6FF', border: '2px solid #BBF7D0', borderRadius: 16, padding: '12px', marginBottom: 12, textAlign: 'center' }}>
            <p style={{ fontFamily: 'Nunito, sans-serif', color: '#2563EB', fontWeight: 700, margin: 0 }}>{`🦊 ${foxName} слуша...`}</p>
          </div>
        )}
        {feedbackType === 'wrong' && !recording && !loading && (
          <button onClick={async () => { const next = alphaIndex + 1; if (next >= alphabet.length) { setPhase('done'); return } setAlphaIndex(next); setFeedbackType(''); setOwlSays(''); await playTTS(alphabet[next].tts_text || alphabet[next].word); beginAlphaRecording(next) }} style={{
            width: '100%', background: 'none', border: '2px solid #BBF7D0', color: '#2563EB',
            borderRadius: 16, padding: '0.9rem', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', cursor: 'pointer'
          }}>Пропусни →</button>
        )}
      </div>
    </main>
  )

  // PLAY — DICTATION
  if (phase === 'play' && selected && cfg) {
    const sentence = selected.sentences[sentenceIndex]
    return (
      <main className="u4a-dash min-h-screen flex flex-col items-center p-6 pt-10">
        <div className="u4a-dash-overlay"></div>
        <div className="w-full max-w-md" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <button onClick={() => { stopAll(); setPhase('pick') }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: cfg.color }}>←</button>
            <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: cfg.color }}>{sentenceIndex + 1} / {selected.sentences.length}</span>
            <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#F97316' }}>⭐ {score}</span>
          </div>
          <div style={{ width: '100%', background: cfg.progressBg, borderRadius: 99, height: 10, marginBottom: 24 }}>
            <div style={{ width: `${(sentenceIndex / selected.sentences.length) * 100}%`, background: cfg.gradient, height: 10, borderRadius: 99, transition: 'width 0.5s' }} />
          </div>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <Fox mood={feedbackType === 'correct' ? 'excited' : feedbackType === 'wrong' ? 'sad' : recording ? 'wink' : 'happy'} size={130} />
          </div>
          {owlSays && (
            <div style={{ background: feedbackType === 'correct' ? '#F0FDF4' : cfg.colorLight, border: `2px solid ${feedbackType === 'correct' ? '#86EFAC' : cfg.colorBorder}`, borderRadius: 16, padding: '10px 16px', marginBottom: 16, textAlign: 'center' }}>
              <span style={{ fontSize: '1.3rem' }}>🦉</span>
              <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: feedbackType === 'correct' ? '#166534' : cfg.color, fontSize: '1.05rem', marginLeft: 8 }}>{owlSays}</span>
            </div>
          )}
          <div style={{ background: cfg.colorLight, border: `2px solid ${cfg.colorBorder}`, borderRadius: 24, padding: '1.8rem', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.06)', marginBottom: 16, minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: '1.55rem', fontWeight: 800, color: '#1F2937', lineHeight: 1.45, fontFamily: 'Nunito, sans-serif', margin: 0 }}>
              {typedText}{typedText.length < sentence.text.length && <span style={{ opacity: 0.5 }}>|</span>}
            </p>
          </div>
          <button onClick={() => playTTS(sentence.text, 'kalina', selected.id)} style={{
            width: '100%', background: cfg.colorLight, color: cfg.color, border: `2px solid ${cfg.colorBorder}`,
            borderRadius: 16, padding: '0.9rem', fontFamily: 'Nunito, sans-serif', fontWeight: 800,
            fontSize: '1rem', cursor: 'pointer', marginBottom: 12
          }}>🔊 Чуй пак</button>
          {loading && (
            <div style={{ background: cfg.colorLight, border: `2px solid ${cfg.colorBorder}`, borderRadius: 16, padding: '12px', marginBottom: 12, textAlign: 'center' }}>
              <p style={{ fontFamily: 'Nunito, sans-serif', color: cfg.color, fontWeight: 700, margin: 0 }}>{`🦊 ${foxName} слуша...`}</p>
            </div>
          )}
          {recording && !loading && (
            <div style={{ width: '100%', background: '#FEF2F2', border: '2px solid #FECACA', borderRadius: 16, padding: '1.2rem', textAlign: 'center', fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.2rem', color: '#DC2626', marginBottom: 12 }}>
              🎤 Говори сега...
            </div>
          )}
          {feedbackType === 'wrong' && !recording && !loading && (
            <button onClick={skipSentence} style={{ width: '100%', background: 'none', border: `2px solid ${cfg.colorBorder}`, color: cfg.color, borderRadius: 16, padding: '0.9rem', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>
              Пропусни →
            </button>
          )}
        </div>
      </main>
    )
  }

  // DONE
  if (phase === 'done') {
    const total = mode === 'alphabet' ? alphabet.length : selected?.sentences.length || 0
    const c = cfg || { color: '#2563EB', gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)', shadow: 'rgba(37,99,235,0.35)' }
    return (
      <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
        <div className="u4a-dash-overlay"></div>
        <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
          <Fox mood={score >= total * 0.7 ? 'excited' : 'happy'} size={160} />
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '2.5rem', color: c.color, marginTop: 16 }}>
            {score >= total * 0.7 ? '🎉 Браво!' : '👍 Добре!'}
          </h1>
          <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: '4rem', fontWeight: 900, color: '#F97316' }}>{score}/{total}</p>
          <p style={{ color: '#92400E', fontFamily: 'Nunito, sans-serif', marginBottom: 32 }}>верни отговора</p>
          <button onClick={() => { stopAll(); isActiveRef.current = true; setPhase(mode === 'alphabet' ? 'menu' : 'pick'); setSelected(null) }} style={{
            width: '100%', background: c.gradient, color: 'white', border: 'none', borderRadius: 20, padding: '1.2rem',
            fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.3rem', cursor: 'pointer',
            boxShadow: `0 8px 24px ${c.shadow}`, marginBottom: 12
          }}>Избери друг текст</button>
          <button onClick={() => router.push('/pronunciation')} style={{
            width: '100%', background: 'none', border: '2px solid #FDE68A', color: '#F97316',
            borderRadius: 20, padding: '1rem', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer'
          }}>← Към Правоговор</button>
        </div>
      </main>
    )
  }

  return null
}
