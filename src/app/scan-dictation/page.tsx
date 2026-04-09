'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import Fox from '@/components/fox/Fox'

export default function ScanDictationPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<'scan' | 'ready' | 'play' | 'done'>('scan')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [scanning, setScanning] = useState(false)
  const [sentences, setSentences] = useState<string[]>([])
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const [speed, setSpeed] = useState(1.0)
  const [repeatsLeft, setRepeatsLeft] = useState(3)
  const lastSentence = useRef<string>('')
  const [pausing, setPausing] = useState(false)
  const [pauseProgress, setPauseProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentAudio = useRef<HTMLAudioElement | null>(null)
  const progressTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const username = localStorage.getItem('u4a_username')
    if (!username) { router.push('/login'); return }
    supabase.from('profiles').select('*').eq('username', username).single()
      .then(({ data }) => { if (data) setProfile(data) })
  }, [])

  const handleScan = async (file: File) => {
    setScanning(true)
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

        const res = await fetch('/api/ocr-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 })
        })
        const data = await res.json()
        if (data.text) {
          const parsed = data.text
            .split('\n')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0)
          setSentences(parsed)
          setPhase('ready')
        }
        setScanning(false)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const speakWithPauses = async (text: string, onDone: () => void) => {
    setSpeaking(true)
    lastSentence.current = text
    const voice = profile?.preferred_voice || 'kalina'
    
    const res = await fetch('/api/tts-azure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed: 0.85 * speed })
    })
    const data = await res.json()
    
    if (data.audio) {
      const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`)
      currentAudio.current = audio
      audio.onended = () => {
        setSpeaking(false)
        currentAudio.current = null
        // Пауза след изречение — по-дълга като в нормалната диктовка
        setPausing(true)
        setPauseProgress(0)
        let step = 0
        const steps = 50
        const pauseMs = Math.max(3000, text.length * 60)
        const stepMs = pauseMs / steps
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
      audio.play()
    } else {
      setSpeaking(false)
      onDone()
    }
  }

  const readAll = (index: number) => {
    if (index >= sentences.length) {
      setPhase('done')
      return
    }
    setSentenceIndex(index)
    speakWithPauses(sentences[index], () => readAll(index + 1))
  }

  if (phase === 'scan') return (
    <main className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <Fox mood="happy" size={140} />
        <h1 className="text-2xl font-bold text-gray-700 mt-6 mb-2">Снимай текста</h1>
        <p className="text-gray-500 mb-2">Снимай страница от учебника и лисицата ще я прочете!</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 text-left">
          <p className="text-yellow-700 text-sm font-bold mb-1">💡 Съвет за по-добро разпознаване:</p>
          <p className="text-yellow-600 text-sm">Снимай на добро осветление — така лисицата ще прочете текста по-точно!</p>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => { if (e.target.files?.[0]) { handleScan(e.target.files[0]); e.target.value = '' } }} />
        <button onClick={() => fileInputRef.current?.click()} disabled={scanning}
          className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl hover:bg-orange-600 transition-colors disabled:opacity-50 text-lg mb-3">
          {scanning ? '📷 Разпознавам...' : '📷 Снимай или качи'}
        </button>
        <button onClick={() => {
          if (currentAudio.current) { currentAudio.current.pause(); currentAudio.current = null }
          clearInterval(progressTimer.current!)
          router.push('/dictation')
        }} className="w-full bg-white text-orange-500 border-2 border-orange-300 font-bold py-3 rounded-2xl hover:bg-orange-50 transition-colors">
          ← Назад
        </button>
      </div>
    </main>
  )

  if (phase === 'ready') return (
    <main className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <Fox mood="excited" size={140} />
        <h1 className="text-2xl font-bold text-gray-700 mt-6 mb-2">Готово!</h1>
        <p className="text-gray-500 mb-4">Разпознах {sentences.length} изречения. Вземи молив и хартия!</p>
        <div className="bg-white rounded-2xl p-4 shadow mb-6 text-left">
          {sentences.map((s, i) => (
            <p key={i} className="text-gray-600 text-sm mb-1">{i + 1}. {s}</p>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[{label: '🐢 Бавно', val: 0.7}, {label: '🚶 Нормално', val: 1.0}].map(s => (
            <button key={s.val} onClick={() => setSpeed(s.val)}
              className={`py-2 rounded-xl font-bold border-2 transition-all text-sm ${speed === s.val ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-500 border-orange-200'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <button onClick={() => { setRepeatsLeft(3); readAll(0) }}
          className="w-full bg-orange-500 text-white text-xl font-bold py-5 rounded-2xl hover:bg-orange-600 transition-colors shadow-lg">
          Готов съм! ✏️
        </button>
        <button onClick={() => setPhase('scan')} className="mt-3 text-orange-400">← Снимай отново</button>
      </div>
    </main>
  )

  if (phase === 'play') return (
    <main className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="w-full bg-orange-100 rounded-full h-3 mb-6">
          <div className="bg-orange-500 h-3 rounded-full transition-all"
            style={{ width: `${(sentenceIndex / sentences.length) * 100}%` }} />
        </div>
        <Fox mood={speaking ? 'happy' : pausing ? 'writing' : 'happy'} size={140} />
        <div className="bg-white rounded-3xl p-6 shadow-lg mt-6">
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
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[{label: '🐢 Бавно', val: 0.7}, {label: '🚶 Нормално', val: 1.0}].map(s => (
            <button key={s.val} onClick={() => setSpeed(s.val)}
              className={`py-2 rounded-xl font-bold border-2 transition-all text-sm ${speed === s.val ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-500 border-orange-200'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <button onClick={() => {
          if (speaking || repeatsLeft <= 0) return
          setRepeatsLeft(r => r - 1)
          speakWithPauses(lastSentence.current, () => {})
        }} disabled={speaking || repeatsLeft <= 0}
          className="mt-2 w-full bg-white text-orange-500 border-2 border-orange-300 font-bold py-3 rounded-2xl hover:bg-orange-50 transition-colors disabled:opacity-40">
          🔁 Повтори ({repeatsLeft} пъти)
        </button>
        <button onClick={() => {
          if (currentAudio.current) { currentAudio.current.pause(); currentAudio.current = null }
          clearInterval(progressTimer.current!)
          setSpeaking(false); setPausing(false)
          router.push('/dictation')
        }} className="mt-2 w-full bg-white text-orange-500 border-2 border-orange-300 font-bold py-3 rounded-2xl hover:bg-orange-50 transition-colors">
          ← Спри диктовката
        </button>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <Fox mood="excited" size={140} />
        <h1 className="text-2xl font-bold text-gray-700 mt-6 mb-4">Диктовката свърши! 🎉</h1>
        <p className="text-gray-500 mb-6">Провери написаното си с учителя или родителя.</p>
        <button onClick={() => router.push('/dashboard')}
          className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl hover:bg-orange-600 transition-colors">
          Към началото 🏠
        </button>
      </div>
    </main>
  )
}