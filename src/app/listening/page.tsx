'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Fox from '@/components/fox/Fox'
import { Dictation } from '@/lib/types'
import '../../app/dashboard/dashboard.css'

type Mode = 'alphabet' | 'easy' | 'medium' | 'hard'
type Lang = 'bg' | 'en' | 'de'

type PronunciationWord = {
  id: string
  letter: string
  word: string
  emoji: string
  tts_text: string
  sort_order: number
  language?: string
}

const ALPHABET_FALLBACK: PronunciationWord[] = [
  { id:'1', letter: 'А', word: 'Автобус', emoji: '🚌', tts_text: 'А, Автобус', sort_order: 1 },
  { id:'2', letter: 'Б', word: 'Банан', emoji: '🍌', tts_text: 'Б, Банан', sort_order: 2 },
  { id:'3', letter: 'В', word: 'Вълк', emoji: '🐺', tts_text: 'В, Вълк', sort_order: 3 },
  { id:'4', letter: 'Г', word: 'Гора', emoji: '🌲', tts_text: 'Г, Гора', sort_order: 4 },
  { id:'5', letter: 'Д', word: 'Дъга', emoji: '🌈', tts_text: 'Д, Дъга', sort_order: 5 },
  { id:'6', letter: 'Е', word: 'Елен', emoji: '🦌', tts_text: 'Е, Елен', sort_order: 6 },
  { id:'7', letter: 'Ж', word: 'Жаба', emoji: '🐸', tts_text: 'Ж, Жаба', sort_order: 7 },
  { id:'8', letter: 'З', word: 'Заек', emoji: '🐰', tts_text: 'З, Заек', sort_order: 8 },
  { id:'9', letter: 'И', word: 'Игла', emoji: '🪡', tts_text: 'И, Игла', sort_order: 9 },
  { id:'10', letter: 'Й', word: 'Йогурт', emoji: '🥛', tts_text: 'Й, Йогурт', sort_order: 10 },
  { id:'11', letter: 'К', word: 'Куче', emoji: '🐶', tts_text: 'К, Куче', sort_order: 11 },
  { id:'12', letter: 'Л', word: 'Лисица', emoji: '🦊', tts_text: 'Л, Лисица', sort_order: 12 },
  { id:'13', letter: 'М', word: 'Мечка', emoji: '🐻', tts_text: 'М, Мечка', sort_order: 13 },
  { id:'14', letter: 'Н', word: 'Небе', emoji: '☁️', tts_text: 'Н, Небе', sort_order: 14 },
  { id:'15', letter: 'О', word: 'Орел', emoji: '🦅', tts_text: 'О, Орел', sort_order: 15 },
  { id:'16', letter: 'П', word: 'Пеперуда', emoji: '🦋', tts_text: 'П, Пеперуда', sort_order: 16 },
  { id:'17', letter: 'Р', word: 'Риба', emoji: '🐟', tts_text: 'Р, Риба', sort_order: 17 },
  { id:'18', letter: 'С', word: 'Слон', emoji: '🐘', tts_text: 'С, Слон', sort_order: 18 },
  { id:'19', letter: 'Т', word: 'Тигър', emoji: '🐯', tts_text: 'Т, Тигър', sort_order: 19 },
  { id:'20', letter: 'У', word: 'Утка', emoji: '🦆', tts_text: 'У, Утка', sort_order: 20 },
  { id:'21', letter: 'Ф', word: 'Фар', emoji: '🏮', tts_text: 'Ф, Фар', sort_order: 21 },
  { id:'22', letter: 'Х', word: 'Хляб', emoji: '🍞', tts_text: 'Х, Хляб', sort_order: 22 },
  { id:'23', letter: 'Ц', word: 'Цвете', emoji: '🌸', tts_text: 'Ц, Цвете', sort_order: 23 },
  { id:'24', letter: 'Ч', word: 'Череша', emoji: '🍒', tts_text: 'Ч, Череша', sort_order: 24 },
  { id:'25', letter: 'Ш', word: 'Шапка', emoji: '🎩', tts_text: 'Ш, Шапка', sort_order: 25 },
  { id:'26', letter: 'Щ', word: 'Щъркел', emoji: '🦢', tts_text: 'Щ, Щъркел', sort_order: 26 },
  { id:'27', letter: 'Ъ', word: 'Ъгъл', emoji: '📐', tts_text: 'Ъ, Ъгъл', sort_order: 27 },
  { id:'28', letter: 'Ю', word: 'Юла', emoji: '🌀', tts_text: 'Ю, Юла', sort_order: 28 },
  { id:'29', letter: 'Я', word: 'Ябълка', emoji: '🍎', tts_text: 'Я, Ябълка', sort_order: 29 },
]

const LEVEL_CONFIG = {
  easy: { label: 'Лесно', grades: [1, 2], color: '#16A34A', colorLight: '#F0FDF4', colorBorder: '#BBF7D0', gradient: 'linear-gradient(135deg, #22C55E, #16A34A)', shadow: 'rgba(34,197,94,0.35)', progressBg: '#DCFCE7' },
  medium: { label: 'Средно', grades: [3], color: '#D97706', colorLight: '#FFFBEB', colorBorder: '#FDE68A', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', shadow: 'rgba(245,158,11,0.35)', progressBg: '#FEF3C7' },
  hard: { label: 'Трудно', grades: [4], color: '#DC2626', colorLight: '#FEF2F2', colorBorder: '#FECACA', gradient: 'linear-gradient(135deg, #EF4444, #DC2626)', shadow: 'rgba(239,68,68,0.35)', progressBg: '#FEF2F2' },
}

const LANG_CONFIG: Record<Lang, { flag: string; label: string; hasAlphabet: boolean; dictLang: string; whisperLang: string }> = {
  bg: { flag: '🇧🇬', label: 'Български', hasAlphabet: true, dictLang: 'bg', whisperLang: 'bg' },
  en: { flag: '🇬🇧', label: 'Английски', hasAlphabet: true, dictLang: 'en', whisperLang: 'en' },
  de: { flag: '🇩🇪', label: 'Немски', hasAlphabet: false, dictLang: 'de', whisperLang: 'de' },
}

export default function ListeningPage() {
  const router = useRouter()
  const [lang, setLang] = useState<Lang | null>(null)
  const [mode, setMode] = useState<Mode | null>(null)
  const [dictations, setDictations] = useState<Dictation[]>([])
  const [selected, setSelected] = useState<Dictation | null>(null)
  const [phase, setPhase] = useState<'menu' | 'lang' | 'pick' | 'play' | 'done'>('menu')
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const [alphaIndex, setAlphaIndex] = useState(0)
  const [allAlphaWords, setAllAlphaWords] = useState<PronunciationWord[]>([])
  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | ''>('')
  const [owlSays, setOwlSays] = useState('')
  const [score, setScore] = useState(0)
  const [typedText, setTypedText] = useState('')
  const [strings, setStrings] = useState<Record<string, string>>({})
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
      })
    supabase.from('pronunciation_words').select('*').order('sort_order')
      .then(({ data }) => { if (data && data.length > 0) setAllAlphaWords(data) })
    fetch('/api/pronunciation-strings').then(r => r.json()).then(data => setStrings(data))
  }, [])

  useEffect(() => {
    return () => { if (typingIntervalRef.current) clearInterval(typingIntervalRef.current) }
  }, [])

  const getAlphabet = (l: Lang) => {
    const words = allAlphaWords.filter(w => (w.language || 'bg') === l)
    return words.length > 0 ? words : (l === 'bg' ? ALPHABET_FALLBACK : [])
  }

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

  const playTTS = async (text: string, voice = 'kalina', dictationId?: string, langOverride?: string) => {
    const res = await fetch('/api/tts-azure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed: 0.85, dictation_id: dictationId, lang: langOverride })
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
    if (audioCtxRef.current) { try { audioCtxRef.current.suspend() } catch {} }
    if (currentStreamRef.current) { currentStreamRef.current.getTracks().forEach(t => t.stop()); currentStreamRef.current = null }
    if (mediaRecorderRef.current) { try { mediaRecorderRef.current.stop() } catch {} mediaRecorderRef.current = null }
    setRecording(false)
    setLoading(false)
  }

  const loadLevel = async (lvl: 'easy' | 'medium' | 'hard', selectedLang: Lang) => {
    const grades = LEVEL_CONFIG[lvl].grades
    let query = supabase.from('dictations').select('*').in('grade', grades).order('grade')
    if (selectedLang === 'bg') {
      query = supabase.from('dictations').select('*').in('grade', grades).or('category.is.null,category.eq.original').order('grade')
    } else {
      query = supabase.from('dictations').select('*').eq('language', selectedLang).order('grade')
    }
    const { data } = await query
    let filtered = data || []
    if (selectedLang === 'bg') filtered = filtered.filter((d: Dictation) => d.language !== 'en' && d.language !== 'de')
    setDictations(filtered)
    setMode(lvl)
    setPhase('pick')
  }

  const startAlphabet = async (selectedLang: Lang) => {
    const alpha = getAlphabet(selectedLang)
    if (alpha.length === 0) return
    await unlockAudio()
    isActiveRef.current = true
    setMode('alphabet')
    setAlphaIndex(0)
    setScore(0)
    setFeedbackType('')
    setOwlSays('')
    setPhase('play')
    if (selectedLang === 'bg' && strings['intro']) await playTTS(strings['intro'])
    await playTTS(alpha[0].tts_text || alpha[0].word, 'kalina', undefined, LANG_CONFIG[selectedLang].dictLang)
    beginAlphaRecording(0, selectedLang)
  }

  const beginAlphaRecording = async (idx: number, selectedLang: Lang) => {
    if (!isActiveRef.current) return
    const alpha = getAlphabet(selectedLang)
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
    const word = alpha[idx].word
    const duration = Math.round((word.length * 0.15 + 1.5) * 1000)
    setTimeout(() => evaluateAlpha(idx, selectedLang), duration)
  }

  const evaluateAlpha = (idx: number, selectedLang: Lang) => {
    const mr = mediaRecorderRef.current
    if (!mr || !isActiveRef.current) return
    const alpha = getAlphabet(selectedLang)
    setRecording(false)
    setLoading(true)
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType })
      const fd = new FormData()
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      fd.append('file', blob, `audio.${ext}`)
      fd.append('language', LANG_CONFIG[selectedLang].whisperLang)
      const res = await fetch('/api/whisper', { method: 'POST', body: fd })
      const data = await res.json()
      const transcript = (data.text || '').toLowerCase().trim()
      const target = alpha[idx].word.toLowerCase()
      const targetRoot = target.substring(0, Math.max(3, Math.floor(target.length * 0.6)))
      const isCorrect = transcript.length > 1 && (
        transcript.includes(target) || transcript.includes(targetRoot) ||
        target.includes(transcript.replace(/[^a-zа-яё]/gi, '').substring(0, 3))
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
          if (next >= alpha.length) { setPhase('done'); return }
          setAlphaIndex(next)
          setFeedbackType('')
          setOwlSays('')
          await playTTS(alpha[next].tts_text || alpha[next].word, 'kalina', undefined, LANG_CONFIG[selectedLang].dictLang)
          beginAlphaRecording(next, selectedLang)
        }, 1200)
      } else {
        setFeedbackType('wrong')
        setOwlSays('Опитай пак!')
        await playTTS('Опитай пак!', 'borisslav')
        await playTTS(alpha[idx].tts_text || alpha[idx].word, 'kalina', undefined, LANG_CONFIG[selectedLang].dictLang)
        setTimeout(() => {
          if (!isActiveRef.current) return
          beginAlphaRecording(idx, selectedLang)
        }, 400)
      }
    }
    mr.stop()
    mr.stream.getTracks().forEach(t => t.stop())
  }

  const playSentence = async (dictation: Dictation, idx: number) => {
    const sentence = dictation.sentences[idx].text
    await typeText(sentence)
    await playTTS(sentence, 'kalina', dictation.id, lang ? LANG_CONFIG[lang].dictLang : undefined)
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
      fd.append('language', lang ? LANG_CONFIG[lang].whisperLang : 'bg')
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
        await playTTS(dictation.sentences[idx].text, 'kalina', dictation.id, lang ? LANG_CONFIG[lang].dictLang : undefined)
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
  const currentAlpha = lang ? (getAlphabet(lang)[alphaIndex] || ALPHABET_FALLBACK[0]) : ALPHABET_FALLBACK[0]

  if (phase === 'menu') return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
        <button onClick={() => router.push('/pronunciation')} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', position: 'absolute', top: -40, left: 0, color: '#F97316', fontFamily: 'Nunito, sans-serif', fontWeight: 800 }}>← Назад</button>
        <Fox mood="happy" size={140} />
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '2rem', color: '#2563EB', marginTop: 12, marginBottom: 8 }}>🎧 Слушай и повтаряй</h1>
        <p style={{ fontFamily: 'Nunito, sans-serif', color: '#92400E', marginBottom: 28, fontSize: '1rem' }}>Избери език</p>
        {(['bg', 'en', 'de'] as Lang[]).map(l => (
          <button key={l} onClick={() => { setLang(l); setPhase('lang') }} style={{ width: '100%', background: 'white', color: '#374151', border: '2px solid #E5E7EB', borderRadius: 20, padding: '1.2rem', fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.4rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <span style={{ fontSize: '2rem' }}>{LANG_CONFIG[l].flag}</span>
            <span>{LANG_CONFIG[l].label}</span>
          </button>
        ))}
      </div>
    </main>
  )

  if (phase === 'lang' && lang) {
    const lc = LANG_CONFIG[lang]
    return (
      <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
        <div className="u4a-dash-overlay"></div>
        <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
          <button onClick={() => { stopAll(); isActiveRef.current = true; setPhase('menu'); setLang(null) }} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', position: 'absolute', top: -40, left: 0, color: '#F97316', fontFamily: 'Nunito, sans-serif', fontWeight: 800 }}>← Назад</button>
          <Fox mood="happy" size={120} />
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.8rem', color: '#2563EB', marginTop: 12, marginBottom: 24 }}>{lc.flag} {lc.label}</h1>
          {lc.hasAlphabet && (
            <button onClick={async () => {
              try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); if (currentStreamRef.current) currentStreamRef.current.getTracks().forEach(t => t.stop()); currentStreamRef.current = s } catch {}
              startAlphabet(lang)
            }} style={{ width: '100%', background: 'white', color: '#2563EB', border: '2px solid #BFDBFE', borderRadius: 20, padding: '1.2rem', fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.15)', marginBottom: 12 }}>🔤 Азбука и звуци</button>
          )}
          {(['easy', 'medium', 'hard'] as const).map(lvl => {
            const c = LEVEL_CONFIG[lvl]
            return (
              <button key={lvl} onClick={async () => {
                try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); if (currentStreamRef.current) currentStreamRef.current.getTracks().forEach(t => t.stop()); currentStreamRef.current = s } catch {}
                await unlockAudio(); loadLevel(lvl, lang)
              }} style={{ width: '100%', background: c.gradient, color: 'white', border: 'none', borderRadius: 20, padding: '1.2rem', fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.2rem', cursor: 'pointer', boxShadow: `0 8px 24px ${c.shadow}`, marginBottom: 12 }}>📖 {c.label}</button>
            )
          })}
        </div>
      </main>
    )
  }

  if (phase === 'pick' && cfg && lang) return (
    <main className="u4a-dash min-h-screen p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="max-w-md mx-auto" style={{ position: 'relative', zIndex: 1 }}>
        <button onClick={() => { stopAll(); isActiveRef.current = true; setPhase('lang'); setMode(null) }} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#F97316', marginBottom: 24, fontFamily: 'Nunito, sans-serif', fontWeight: 800 }}>← Назад</button>
        <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: cfg.color, marginBottom: 20 }}>{LANG_CONFIG[lang].flag} {cfg.label} — избери текст</h2>
        {dictations.length === 0 && <p style={{ color: '#9CA3AF', textAlign: 'center', fontFamily: 'Nunito, sans-serif' }}>Зареждане...</p>}
        {dictations.map(d => (
          <button key={d.id} onClick={async () => {
            try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); if (currentStreamRef.current) currentStreamRef.current.getTracks().forEach(t => t.stop()); currentStreamRef.current = s } catch {}
            await unlockAudio(); isActiveRef.current = true; setSelected(d); setSentenceIndex(0); setScore(0); setFeedbackType(''); setOwlSays(''); setTypedText(''); setPhase('play'); playSentence(d, 0)
          }} style={{ width: '100%', background: 'white', border: `2px solid ${cfg.colorBorder}`, borderRadius: 16, padding: '1rem 1.2rem', marginBottom: 12, textAlign: 'left', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#374151' }}>{d.title}</div>
            <div style={{ fontSize: '0.85rem', color: cfg.color, marginTop: 4, fontWeight: 700 }}>{d.sentences.length} изречения</div>
          </button>
        ))}
      </div>
    </main>
  )

  if (phase === 'play' && mode === 'alphabet' && lang) return (
    <main className="u4a-dash min-h-screen flex flex-col items-center p-6 pt-10">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={() => { stopAll(); setPhase('lang') }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#2563EB' }}>←</button>
          <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#2563EB' }}>{alphaIndex + 1} / {getAlphabet(lang).length}</span>
          <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#F97316' }}>⭐ {score}</span>
        </div>
        <div style={{ width: '100%', background: '#DBEAFE', borderRadius: 99, height: 10, marginBottom: 24 }}>
          <div style={{ width: `${(alphaIndex / getAlphabet(lang).length) * 100}%`, background: 'linear-gradient(90deg, #2563EB, #60A5FA)', height: 10, borderRadius: 99, transition: 'width 0.5s' }} />
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
        <button onClick={() => playTTS(currentAlpha.tts_text || currentAlpha.word, 'kalina', undefined, LANG_CONFIG[lang].dictLang)} style={{ width: '100%', background: '#EFF6FF', color: '#2563EB', border: '2px solid #BFDBFE', borderRadius: 16, padding: '0.9rem', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', marginBottom: 12 }}>🔊 Чуй пак</button>
        {recording && !loading && <div style={{ width: '100%', background: '#FEF2F2', border: '2px solid #FECACA', borderRadius: 16, padding: '1.2rem', textAlign: 'center', fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.2rem', color: '#DC2626', marginBottom: 12 }}>🎤 Говори сега...</div>}
        {loading && <div style={{ background: '#EFF6FF', border: '2px solid #BFDBFE', borderRadius: 16, padding: '12px', marginBottom: 12, textAlign: 'center' }}><p style={{ fontFamily: 'Nunito, sans-serif', color: '#2563EB', fontWeight: 700, margin: 0 }}>{`🦊 ${foxName} слуша...`}</p></div>}
        {feedbackType === 'wrong' && !recording && !loading && (
          <button onClick={async () => { const next = alphaIndex + 1; if (next >= getAlphabet(lang).length) { setPhase('done'); return } setAlphaIndex(next); setFeedbackType(''); setOwlSays(''); await playTTS(getAlphabet(lang)[next].tts_text || getAlphabet(lang)[next].word, 'kalina', undefined, LANG_CONFIG[lang].dictLang); beginAlphaRecording(next, lang) }} style={{ width: '100%', background: 'none', border: '2px solid #BFDBFE', color: '#2563EB', borderRadius: 16, padding: '0.9rem', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>Пропусни →</button>
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
          <button onClick={() => playTTS(sentence.text, 'kalina', selected.id, lang ? LANG_CONFIG[lang].dictLang : undefined)} style={{ width: '100%', background: cfg.colorLight, color: cfg.color, border: `2px solid ${cfg.colorBorder}`, borderRadius: 16, padding: '0.9rem', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', marginBottom: 12 }}>🔊 Чуй пак</button>
          {loading && <div style={{ background: cfg.colorLight, border: `2px solid ${cfg.colorBorder}`, borderRadius: 16, padding: '12px', marginBottom: 12, textAlign: 'center' }}><p style={{ fontFamily: 'Nunito, sans-serif', color: cfg.color, fontWeight: 700, margin: 0 }}>{`🦊 ${foxName} слуша...`}</p></div>}
          {recording && !loading && <div style={{ width: '100%', background: '#FEF2F2', border: '2px solid #FECACA', borderRadius: 16, padding: '1.2rem', textAlign: 'center', fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.2rem', color: '#DC2626', marginBottom: 12 }}>🎤 Говори сега...</div>}
          {feedbackType === 'wrong' && !recording && !loading && (
            <button onClick={skipSentence} style={{ width: '100%', background: 'none', border: `2px solid ${cfg.colorBorder}`, color: cfg.color, borderRadius: 16, padding: '0.9rem', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>Пропусни →</button>
          )}
        </div>
      </main>
    )
  }

  if (phase === 'done') {
    const alpha = lang ? getAlphabet(lang) : ALPHABET_FALLBACK
    const total = mode === 'alphabet' ? alpha.length : selected?.sentences.length || 0
    const c = cfg || { color: '#2563EB', gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)', shadow: 'rgba(37,99,235,0.35)' }
    return (
      <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
        <div className="u4a-dash-overlay"></div>
        <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
          <Fox mood={score >= total * 0.7 ? 'excited' : 'happy'} size={160} />
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '2.5rem', color: c.color, marginTop: 16 }}>{score >= total * 0.7 ? '🎉 Браво!' : '👍 Добре!'}</h1>
          <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: '4rem', fontWeight: 900, color: '#F97316' }}>{score}/{total}</p>
          <p style={{ color: '#92400E', fontFamily: 'Nunito, sans-serif', marginBottom: 32 }}>верни отговора</p>
          <button onClick={() => { stopAll(); isActiveRef.current = true; setPhase(mode === 'alphabet' ? 'lang' : 'pick'); setSelected(null) }} style={{ width: '100%', background: c.gradient, color: 'white', border: 'none', borderRadius: 20, padding: '1.2rem', fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.3rem', cursor: 'pointer', boxShadow: `0 8px 24px ${c.shadow}`, marginBottom: 12 }}>Избери друг текст</button>
          <button onClick={() => router.push('/pronunciation')} style={{ width: '100%', background: 'none', border: '2px solid #FDE68A', color: '#F97316', borderRadius: 20, padding: '1rem', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>← Към Правоговор</button>
        </div>
      </main>
    )
  }

  return null
}
