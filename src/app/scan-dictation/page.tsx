'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import '../dashboard/dashboard.css'
import { Profile } from '@/lib/types'
import Fox from '@/components/fox/Fox'

type WordResult = { word: string; correct: boolean; input: string }
type SentenceResult = { sentence: string; input: string; wordResults: WordResult[]; correct: boolean; explanation?: string | null }

export default function ScanDictationPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<'scan' | 'crop' | 'ready' | 'play' | 'ocr' | 'review' | 'done'>('scan')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [scanning, setScanning] = useState(false)
  const [sentences, setSentences] = useState<string[]>([])
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const [speed, setSpeed] = useState(1.0)
  const [repeatsLeft, setRepeatsLeft] = useState(3)
  const [pausing, setPausing] = useState(false)
  const [pauseProgress, setPauseProgress] = useState(0)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrRaw, setOcrRaw] = useState('')
  const [correctedText, setCorrectedText] = useState('')
  const [results, setResults] = useState<SentenceResult[]>([])
  const [explanations, setExplanations] = useState<Record<number, string>>({})
  const lastSentence = useRef<string>('')
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  // cropCanvasRef removed
  const cropContainerRef = useRef<HTMLDivElement>(null)
  const [cropRect, setCropRect] = useState({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 })
  const dragging = useRef<null | string>(null)
  const dragStart = useRef({ mx: 0, my: 0, rx: 0, ry: 0, rw: 0, rh: 0 })
  const speedRef = useRef(1.0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ocrFileInputRef = useRef<HTMLInputElement>(null)
  const currentAudio = useRef<HTMLAudioElement | null>(null)
  const progressTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const username = localStorage.getItem('u4a_username')
    if (!username) { router.push('/login'); return }
    supabase.from('profiles').select('*').eq('username', username).single()
      .then(({ data }) => {
        if (!data) { router.push('/login'); return }
        if (data.is_parent) { router.push('/parent-dashboard'); return }
        setProfile(data)
      })
  }, [])

  useEffect(() => {
    return () => {
      if (currentAudio.current) { currentAudio.current.pause(); currentAudio.current = null }
      clearInterval(progressTimer.current!)
    }
  }, [])

  const processImage = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const maxSize = 1200
          let w = img.width, h = img.height
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize }
            else { w = Math.round(w * maxSize / h); h = maxSize }
          }
          canvas.width = w; canvas.height = h
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1])
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }



  const handleWriteOCR = async (file: File) => {
    setOcrLoading(true)
    const base64 = await processImage(file)
    const res = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64 })
    })
    const data = await res.json()
    if (data.text) {
      setOcrRaw(data.text)
      setCorrectedText(data.text)
      setPhase('review')
    }
    setOcrLoading(false)
  }

  const speakWithPauses = async (text: string, onDone: () => void) => {
    setSpeaking(true)
    lastSentence.current = text
    const voice = profile?.preferred_voice || 'kalina'
    const res = await fetch('/api/tts-azure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed: speedRef.current })
    })
    const blob = await res.blob()
    if (blob.size > 0) {
      const arrayBuffer = await blob.arrayBuffer()
      const AudioCtx = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext
      const ctx = new AudioCtx()
      ctx.decodeAudioData(arrayBuffer, (decoded) => {
        const source = ctx.createBufferSource()
        source.buffer = decoded
        source.connect(ctx.destination)
        source.onended = () => {
          setSpeaking(false)
          currentAudio.current = null
          setPausing(true); setPauseProgress(0)
          let step = 0
          const steps = 50
          const pauseMs = Math.max(3000, Math.round((text.length / (1.4 / speedRef.current)) * 1000))
          progressTimer.current = setInterval(() => {
            step++
            setPauseProgress(Math.round((step / steps) * 100))
            if (step >= steps) {
              clearInterval(progressTimer.current!)
              setPausing(false); setPauseProgress(0)
              onDone()
            }
          }, pauseMs / steps)
        }
        source.start(0)
      }, () => { setSpeaking(false); onDone() })
    } else { setSpeaking(false); onDone() }
  }

  const readAll = (index: number) => {
    if (index >= sentences.length) { setPhase('ocr'); return }
    setPhase('play')
    setSentenceIndex(index)
    speakWithPauses(sentences[index], () => readAll(index + 1))
  }

  const checkSentence = (original: string, userInput: string): WordResult[] => {
    const normalize = (s: string) => s.trim().toLowerCase().replace(/[.,!?;:»«–]/g, '')
    const originalWords = original.trim().split(/\s+/)
    const inputWords = userInput.trim().split(/\s+/)
    return originalWords.map((word, i) => ({
      word, input: inputWords[i] || '',
      correct: normalize(word) === normalize(inputWords[i] || '')
    }))
  }

  const handleSubmit = async () => {
    if (!profile) return
    const inputSentences = correctedText.trim().split('\n').filter(s => s.trim())
    const newResults: SentenceResult[] = sentences.map((s, i) => {
      const userInput = inputSentences[i] || ''
      const wordResults = checkSentence(s, userInput)
      return { sentence: s, input: userInput, wordResults, correct: wordResults.every(r => r.correct) }
    })
    const score = newResults.filter(r => r.correct).length
    const childCorrected = correctedText !== ocrRaw

    await supabase.from('dictation_sessions').insert({
      profile_id: profile.id,
      dictation_id: null,
      dictation_title: 'Снимана диктовка',
      score,
      total: sentences.length,
      time_seconds: 0,
      results: newResults,
      is_scan: true,
      ocr_raw: ocrRaw,
      child_correction: childCorrected ? correctedText : null,
    })

    setResults(newResults)
    setPhase('done')
    if (profile.is_premium) fetchExplanations(newResults)
  }

  const fetchExplanations = async (newResults: SentenceResult[]) => {
    const newExplanations: Record<number, string> = {}
    await Promise.all(newResults.map(async (r, i) => {
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
        } catch { }
      }
    }))
    setExplanations(newExplanations)
    const updatedResults = newResults.map((r, i) => ({ ...r, explanation: newExplanations[i] || null }))
    const lastSession = await supabase.from('dictation_sessions').select('id').eq('profile_id', profile?.id || '').order('created_at', { ascending: false }).limit(1).single()
    if (lastSession.data) {
      await supabase.from('dictation_sessions').update({ results: updatedResults }).eq('id', lastSession.data.id)
    }
  }

  // CROP
  const handleCropAndScan = async () => {
    if (!cropFile || !cropImageSrc) return
    setScanning(true)
    setPhase('scan')
    const img = new Image()
    img.onload = async () => {
      const canvas = document.createElement('canvas')
      const cw = Math.round(img.width * cropRect.w)
      const ch = Math.round(img.height * cropRect.h)
      const cx = Math.round(img.width * cropRect.x)
      const cy = Math.round(img.height * cropRect.y)
      const maxSize = 1200
      let w = cw, h = ch
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize }
        else { w = Math.round(w * maxSize / h); h = maxSize }
      }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, cx, cy, cw, ch, 0, 0, w, h)
      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
      const res = await fetch('/api/ocr-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      })
      const data = await res.json()
      if (data.text) {
        const parsed = data.text.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
        setSentences(parsed)
        setPhase('ready')
      }
      setScanning(false)
    }
    img.src = cropImageSrc
  }

  const handleCropPointerDown = (e: React.PointerEvent, handle: string) => {
    e.preventDefault()
    dragging.current = handle
    const el = cropContainerRef.current!
    const rect = el.getBoundingClientRect()
    dragStart.current = {
      mx: (e.clientX - rect.left) / rect.width,
      my: (e.clientY - rect.top) / rect.height,
      rx: cropRect.x, ry: cropRect.y, rw: cropRect.w, rh: cropRect.h
    }
  }

  const handleCropPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const el = cropContainerRef.current!
    const rect = el.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / rect.width
    const my = (e.clientY - rect.top) / rect.height
    const dx = mx - dragStart.current.mx
    const dy = my - dragStart.current.my
    const { rx, ry, rw, rh } = dragStart.current
    let nx = rx, ny = ry, nw = rw, nh = rh
    const min = 0.1
    if (dragging.current === 'move') {
      nx = Math.max(0, Math.min(1 - rw, rx + dx))
      ny = Math.max(0, Math.min(1 - rh, ry + dy))
    } else {
      if (dragging.current.includes('e')) nw = Math.max(min, Math.min(1 - rx, rw + dx))
      if (dragging.current.includes('s')) nh = Math.max(min, Math.min(1 - ry, rh + dy))
      if (dragging.current.includes('w')) { const d = Math.min(dx, rw - min); nx = rx + d; nw = rw - d }
      if (dragging.current.includes('n')) { const d = Math.min(dy, rh - min); ny = ry + d; nh = rh - d }
    }
    setCropRect({ x: nx, y: ny, w: nw, h: nh })
  }

  if (phase === 'crop' && cropImageSrc) return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-4">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md" style={{ position: 'relative', zIndex: 1 }}>
        <h1 className="text-xl font-bold text-gray-700 text-center mb-3">Избери текста</h1>
        <p className="text-gray-500 text-sm text-center mb-3">Дръпни ъглите за да изрежеш само текста</p>
        <div
          ref={cropContainerRef}
          onPointerMove={handleCropPointerMove}
          onPointerUp={() => { dragging.current = null }}
          onPointerLeave={() => { dragging.current = null }}
          style={{ position: 'relative', width: '100%', touchAction: 'none', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
        >
          <img src={cropImageSrc} style={{ width: '100%', display: 'block' }} />
          {/* Затъмнение около кропа */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${cropRect.y * 100}%`, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${(1 - cropRect.y - cropRect.h) * 100}%`, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'absolute', top: `${cropRect.y * 100}%`, left: 0, width: `${cropRect.x * 100}%`, height: `${cropRect.h * 100}%`, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'absolute', top: `${cropRect.y * 100}%`, right: 0, width: `${(1 - cropRect.x - cropRect.w) * 100}%`, height: `${cropRect.h * 100}%`, background: 'rgba(0,0,0,0.5)' }} />
          </div>
          {/* Рамката */}
          <div
            onPointerDown={e => handleCropPointerDown(e, 'move')}
            style={{ position: 'absolute', left: `${cropRect.x * 100}%`, top: `${cropRect.y * 100}%`, width: `${cropRect.w * 100}%`, height: `${cropRect.h * 100}%`, border: '2px solid #F97316', boxSizing: 'border-box', cursor: 'move' }}
          >
            {/* Ъглови handles */}
            {[['nw','0%','0%'],['ne','0%','100%'],['sw','100%','0%'],['se','100%','100%']].map(([dir, top, left]) => (
              <div key={dir} onPointerDown={e => { e.stopPropagation(); handleCropPointerDown(e, dir) }}
                style={{ position: 'absolute', top, left, width: 22, height: 22, background: '#F97316', borderRadius: 4, transform: 'translate(-50%,-50%)', cursor: 'pointer', zIndex: 10 }} />
            ))}
            {/* Средни handles */}
            {[['n','0%','50%'],['s','100%','50%'],['w','50%','0%'],['e','50%','100%']].map(([dir, top, left]) => (
              <div key={dir} onPointerDown={e => { e.stopPropagation(); handleCropPointerDown(e, dir) }}
                style={{ position: 'absolute', top, left, width: 18, height: 18, background: 'white', border: '2px solid #F97316', borderRadius: '50%', transform: 'translate(-50%,-50%)', cursor: 'pointer', zIndex: 10 }} />
            ))}
          </div>
        </div>
        <button onClick={handleCropAndScan}
          className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl text-lg mt-4 mb-2">
          ✂️ Изрежи и разпознай
        </button>
        <button onClick={() => setPhase('scan')}
          className="w-full bg-white text-orange-500 border-2 border-orange-300 font-bold py-3 rounded-2xl">
          ← Снимай отново
        </button>
      </div>
    </main>
  )

  // SCAN
  if (phase === 'scan') return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
        <Fox mood="happy" size={140} />
        <h1 className="text-2xl font-bold text-gray-700 mt-6 mb-2">Снимай текста</h1>
        <p className="text-gray-500 mb-2">Снимай страница от учебника и лисицата ще я прочете!</p>
        <p style={{ fontSize: "0.8rem", color: "#92400E", fontStyle: "italic", marginBottom: 16 }}>💡 Снимай на добро осветление и дръж камерата право над текста за по-точно разпознаване.</p>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => { if (e.target.files?.[0]) { const f = e.target.files[0]; setCropFile(f); const url = URL.createObjectURL(f); setCropImageSrc(url); setCropRect({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 }); setPhase('crop'); e.target.value = '' } }} />
        <button onClick={() => fileInputRef.current?.click()} disabled={scanning}
          className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl hover:bg-orange-600 disabled:opacity-50 text-lg mb-3">
          {scanning ? '📷 Разпознавам...' : '📷 Снимай учебника'}
        </button>
        <button onClick={() => router.push('/dashboard')}
          className="w-full bg-white text-orange-500 border-2 border-orange-300 font-bold py-3 rounded-2xl">
          ← Назад
        </button>
      </div>
    </main>
  )

  // READY
  if (phase === 'ready') return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
        <Fox mood="excited" size={140} />
        <h1 className="text-2xl font-bold text-gray-700 mt-6 mb-2">Готово!</h1>
        <p className="text-gray-500 mb-4">Разпознах {sentences.length} изречения. Вземи молив и хартия!</p>
        <div className="bg-white rounded-2xl p-4 shadow mb-4 text-left">
          {sentences.map((s, i) => <p key={i} className="text-gray-600 text-sm mb-1">{i + 1}. {s}</p>)}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[{label: '🐢 Бавно', val: 0.7}, {label: '🚶 Нормално', val: 1.0}].map(s => (
            <button key={s.val} onClick={() => { setSpeed(s.val); speedRef.current = s.val }}
              className={`py-2 rounded-xl font-bold border-2 text-sm ${speed === s.val ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-500 border-orange-200'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <button onClick={() => { const AC = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext; const ctx = new AC(); ctx.resume(); setRepeatsLeft(3); readAll(0) }}
          className="w-full bg-orange-500 text-white text-xl font-bold py-5 rounded-2xl hover:bg-orange-600 shadow-lg mb-3">
          Готов съм! ✏️
        </button>
        <button onClick={() => setPhase('scan')} className="text-orange-400">← Снимай отново</button>
      </div>
    </main>
  )

  // PLAY
  if (phase === 'play') return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md" style={{ position: 'relative', zIndex: 1 }}>
        <div className="w-full bg-orange-100 rounded-full h-3 mb-6">
          <div className="bg-orange-500 h-3 rounded-full transition-all" style={{ width: `${(sentenceIndex / sentences.length) * 100}%` }} />
        </div>
        <div className="flex justify-center mb-4"><Fox mood={speaking ? 'happy' : 'writing'} size={140} /></div>
        <div className="bg-white rounded-3xl p-6 shadow-lg mb-4">
          <p className="text-orange-500 font-bold">Изречение {sentenceIndex + 1} от {sentences.length}</p>
          {speaking && <p className="text-orange-500 animate-pulse mt-2">🔊 Лисицата чете...</p>}
          {pausing && (
            <div className="mt-3">
              <p className="text-gray-500 mb-2">✍️ Пиши на хартия...</p>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className="bg-orange-400 h-3 rounded-full transition-all" style={{ width: `${pauseProgress}%` }} />
              </div>
            </div>
          )}
        </div>
        <button onClick={() => {
          if (repeatsLeft <= 0) return
          if (currentAudio.current) { currentAudio.current.pause(); currentAudio.current = null }
          clearInterval(progressTimer.current!)
          setSpeaking(false); setPausing(false); setPauseProgress(0)
          setRepeatsLeft(r => r - 1)
          speakWithPauses(lastSentence.current, () => readAll(sentenceIndex + 1))
        }} disabled={repeatsLeft <= 0}
          className="w-full bg-white text-orange-500 border-2 border-orange-300 font-bold py-3 rounded-2xl disabled:opacity-40 mb-2">
          🔁 Повтори ({repeatsLeft} пъти)
        </button>
        <button onClick={() => { router.push('/dashboard') }}
          className="w-full bg-white text-orange-500 border-2 border-orange-300 font-bold py-3 rounded-2xl">
          ← Спри диктовката
        </button>
      </div>
    </main>
  )

  // OCR на написаното
  if (phase === 'ocr') return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
        <Fox mood="pointing" size={140} />
        <h2 className="text-2xl font-bold text-gray-700 mt-4 mb-2">Диктовката свърши!</h2>
        <p className="text-gray-500 mb-2">Снимай написаното на хартия</p>
        <p style={{ fontSize: "0.8rem", color: "#92400E", fontStyle: "italic", marginBottom: 16 }}>💡 Снимай на добро осветление. За по-добро разпознаване, пиши през ред.</p>
        <input ref={ocrFileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => { if (e.target.files?.[0]) { handleWriteOCR(e.target.files[0]); e.target.value = '' } }} />
        <button onClick={() => ocrFileInputRef.current?.click()} disabled={ocrLoading}
          className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl hover:bg-orange-600 disabled:opacity-50 text-lg mb-3">
          {ocrLoading ? '📷 Разпознавам написаното...' : '📷 Снимай написаното'}
        </button>
        <p style={{ fontSize: '0.72rem', color: '#92400E', fontStyle: 'italic', marginBottom: 16 }}>
          💡 u4a.bg ползва AI за разпознаване. Работим всекидневно за подобрението му. За по-добро разпознаване, пиши през ред.
        </p>
        <button onClick={() => router.push('/dashboard')} className="text-orange-400">← Към началото</button>
      </div>
    </main>
  )

  // REVIEW — детето вижда разпознатото и може да коригира
  if (phase === 'review') return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-lg" style={{ position: 'relative', zIndex: 1 }}>
        <div className="text-center mb-4">
          <Fox mood="pointing" size={100} />
          <h2 className="text-xl font-bold text-gray-700 mt-2">Провери разпознатото</h2>
          <p className="text-gray-500 text-sm mt-1">Ако лисицата е сбъркала — поправи го</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow mb-4">
          <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Оригинален текст</p>
          {sentences.map((s, i) => <p key={i} className="text-gray-600 text-sm mb-1">{i + 1}. {s}</p>)}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow mb-4">
          <p className="text-xs font-bold text-orange-400 mb-2 uppercase">Разпознато от лисицата</p>
          <textarea value={correctedText} onChange={e => setCorrectedText(e.target.value)}
            rows={sentences.length + 2}
            className="w-full border-2 border-orange-200 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-400 resize-none" />
        </div>
        <p style={{ fontSize: '0.72rem', color: '#92400E', fontStyle: 'italic', marginBottom: 12 }}>
          💡 u4a.bg ползва AI за разпознаване. Работим всекидневно за подобрението му. За по-добро разпознаване, пиши през ред.
        </p>
        <button onClick={handleSubmit} disabled={!correctedText.trim()}
          className="w-full bg-orange-500 text-white text-xl font-bold py-4 rounded-2xl hover:bg-orange-600 disabled:opacity-40">
          Провери диктовката ✓
        </button>
      </div>
    </main>
  )

  // DONE
  if (phase === 'done') {
    const score = results.filter(r => r.correct).length
    const percent = sentences.length > 0 ? Math.round((score / sentences.length) * 100) : 0
    return (
      <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
        <div className="u4a-dash-overlay"></div>
        <div className="w-full max-w-lg" style={{ position: 'relative', zIndex: 1 }}>
          <div className="text-center mb-6">
            <Fox mood={percent >= 80 ? 'excited' : percent >= 50 ? 'wink' : 'sad'} size={128} />
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
                  <span className={r.correct ? 'text-green-500 text-xl' : 'text-red-500 text-xl'}>{r.correct ? '✓' : '✗'}</span>
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
                {explanations[i] && (
                  <div className="mt-3 bg-orange-50 rounded-xl p-3 border border-orange-200">
                    <p className="text-xs text-orange-500 font-bold mb-1">🦊 Лисицата обяснява:</p>
                    <p className="text-sm text-gray-600">{explanations[i]}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => router.push('/dashboard')}
            className="w-full bg-orange-500 text-white text-xl font-bold py-4 rounded-2xl hover:bg-orange-600">
            Към началото 🏠
          </button>
        </div>
      </main>
    )
  }

  return null
}
