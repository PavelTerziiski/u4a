'use client'
import { playSound } from '@/lib/sounds'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import dynamic from 'next/dynamic'
import AnimatedFox from '@/components/AnimatedFox'
import { matchWord, matchSentence } from '@/lib/whisperMatch'
import { awardAcorns, SCORE_TO_ACORNS_MULTIPLIER } from '@/lib/acorns'
import type { Profile } from '@/lib/types'
import '../../dashboard/dashboard.css'

const CubeScene = dynamic(() => import('./CubeScene'), { ssr: false })

type CubeItem = {
  type: 'word' | 'sentence_easy' | 'sentence_hard' | 'mystery'
  text: string
  points: number
  emoji: string
}

type GameMode = 'classic' | 'read' | 'listen'

const TILE_COLORS = [
  ['#FBBF24', '#F59E0B'], ['#34D399', '#10B981'], ['#60A5FA', '#3B82F6'],
  ['#F87171', '#EF4444'], ['#A78BFA', '#8B5CF6'], ['#FB7185', '#F43F5E'],
  ['#2DD4BF', '#14B8A6'], ['#FACC15', '#EAB308'], ['#86EFAC', '#22C55E'],
]

const MUSIC_TRACKS = [
  '/sounds/cube-music-1.mp3', '/sounds/cube-music-2.mp3',
  '/sounds/cube-music-3.mp3', '/sounds/cube-music-4.mp3',
]
const MUSIC_PREF_KEY = 'u4a_cube_music_on'
const MUSIC_VOL_NORMAL = 1.0
const MUSIC_VOL_DUCKED = 0.15
const MAX_ATTEMPTS = 3

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type FlyingAcorn = { id: number; startX: number; startY: number }

function CubeDeluxeInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode: GameMode = (searchParams.get('mode') as GameMode) || 'classic'

  const [authChecked, setAuthChecked] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [acornsAwarded, setAcornsAwarded] = useState<number | null>(null)
  const [showAcornBurst, setShowAcornBurst] = useState(false)
  const [phase, setPhase] = useState<'intro' | 'playing' | 'done'>('intro')
  const [items, setItems] = useState<CubeItem[]>([])
  const [revealed, setRevealed] = useState<boolean[]>(Array(9).fill(false))
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [shakingIdx, setShakingIdx] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(150)
  const [tileColors, setTileColors] = useState<string[][]>([])
  const [loading, setLoading] = useState(false)
  const [musicOn, setMusicOn] = useState(true)
  const [scoreBoom, setScoreBoom] = useState(false)
  const [flyingAcorns, setFlyingAcorns] = useState<FlyingAcorn[]>([])
  const [gridShake, setGridShake] = useState(false)
  const [revealFlash, setRevealFlash] = useState(false)

  // Reading mode state
  const [recording, setRecording] = useState(false)
  const [whisperLoading, setWhisperLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | ''>('')
  const [owlSays, setOwlSays] = useState('')

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const beepCtxRef = useRef<AudioContext | null>(null)
  const lastBeepSecRef = useRef<number>(-1)
  const acornIdRef = useRef(0)
  const scoreboardRef = useRef<HTMLDivElement | null>(null)
  const gridContainerRef = useRef<HTMLDivElement | null>(null)

  // Recording refs (same pattern as /listening)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const ttsCtxRef = useRef<AudioContext | null>(null)
  const ttsSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isActiveRef = useRef(true)
  const autoStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const pref = localStorage.getItem(MUSIC_PREF_KEY)
    if (pref === 'off') setMusicOn(false)
  }, [])

  useEffect(() => {
    const username = localStorage.getItem('u4a_username')
    if (!username) { router.push('/login'); return }
    supabase.from('profiles').select('*').eq('username', username).single()
      .then(({ data }) => {
        if (!data || data.email !== 'pavel.impro@gmail.com') {
          router.push('/pronunciation')
          return
        }
        setProfile(data as Profile)
        setAuthChecked(true)
      })
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          stopMusic()
          // Award acorns based on score
          if (score > 0 && profile) {
            const amount = score * SCORE_TO_ACORNS_MULTIPLIER
            awardAcorns(profile, amount).then(() => setAcornsAwarded(amount))
          }
          setPhase('done')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft > 5 || timeLeft <= 0) return
    if (lastBeepSecRef.current === timeLeft) return
    lastBeepSecRef.current = timeLeft
    playBeep(timeLeft === 1 ? 880 : 660)
  }, [timeLeft, phase])

  useEffect(() => {
    if (phase === 'playing' && revealed.every(r => r)) {
      if (timerRef.current) clearInterval(timerRef.current)
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } })
      // Award acorns based on score
      if (score > 0 && profile) {
        const amount = score * SCORE_TO_ACORNS_MULTIPLIER
        awardAcorns(profile, amount).then(() => setAcornsAwarded(amount))
      }
      setTimeout(() => { stopMusic(); setPhase('done') }, 1500)
    }
  }, [revealed, phase])

  useEffect(() => () => {
    isActiveRef.current = false
    stopMusic()
    if (timerRef.current) clearInterval(timerRef.current)
    if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current)
    cleanupRecording()
    cleanupTTS()
  }, [])

  const cleanupRecording = () => {
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.onstop = null
        mediaRecorderRef.current.ondataavailable = null
        if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop()
      } catch {}
      mediaRecorderRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const cleanupTTS = () => {
    if (ttsSourceRef.current) {
      try { ttsSourceRef.current.onended = null; ttsSourceRef.current.stop() } catch {}
      ttsSourceRef.current = null
    }
  }

  const playBeep = (freq: number) => {
    try {
      if (!beepCtxRef.current) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        beepCtxRef.current = new AC()
      }
      const ctx = beepCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.2)
    } catch {}
  }

  const startMusic = () => {
    if (!musicOn) return
    stopMusic()
    const track = MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)]
    const audio = new Audio(track)
    audio.loop = true
    audio.volume = MUSIC_VOL_NORMAL
    audio.play().catch(() => {})
    audioRef.current = audio
  }

  const stopMusic = () => {
    if (audioRef.current) {
      try { audioRef.current.pause(); audioRef.current.currentTime = 0 } catch {}
      audioRef.current = null
    }
  }

  const fadeMusic = (target: number, duration = 200) => {
    const audio = audioRef.current
    if (!audio) return
    const start = audio.volume
    const steps = 10
    const stepTime = duration / steps
    const stepDelta = (target - start) / steps
    let i = 0
    const fade = () => {
      i++
      if (!audioRef.current) return
      audioRef.current.volume = Math.max(0, Math.min(1, start + stepDelta * i))
      if (i < steps) setTimeout(fade, stepTime)
    }
    setTimeout(fade, stepTime)
  }

  const toggleMusic = () => {
    const next = !musicOn
    setMusicOn(next)
    localStorage.setItem(MUSIC_PREF_KEY, next ? 'on' : 'off')
    if (!next) stopMusic()
    else if (phase === 'playing') startMusic()
  }

  const vibrate = (ms: number) => { try { if (navigator.vibrate) navigator.vibrate(ms) } catch {} }

  const getTTSCtx = () => {
    if (!ttsCtxRef.current || ttsCtxRef.current.state === 'closed') {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ttsCtxRef.current = new AC()
    }
    return ttsCtxRef.current
  }

  const playTTS = async (text: string, voice = 'borisslav'): Promise<void> => {
    if (!isActiveRef.current) return
    try {
      const res = await fetch('/api/tts-azure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed: 0.9, lang: 'bg' })
      })
      if (!isActiveRef.current) return
      const blob = await res.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const ctx = getTTSCtx()
      if (ctx.state === 'suspended') await ctx.resume()
      return new Promise<void>((resolve) => {
        if (!isActiveRef.current) { resolve(); return }
        ctx.decodeAudioData(arrayBuffer, (decoded) => {
          if (!isActiveRef.current) { resolve(); return }
          cleanupTTS()
          const source = ctx.createBufferSource()
          ttsSourceRef.current = source
          source.buffer = decoded
          const gainNode = ctx.createGain()
          gainNode.gain.value = 1.6
          source.connect(gainNode); gainNode.connect(ctx.destination)
          source.onended = () => { ttsSourceRef.current = null; resolve() }
          source.start(0)
        }, () => resolve())
      })
    } catch { return }
  }

  const acquireMic = async (): Promise<MediaStream | null> => {
    try {
      if (streamRef.current && streamRef.current.getTracks().some(t => t.readyState === 'live')) {
        return streamRef.current
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      return stream
    } catch {
      return null
    }
  }

  const startRecording = async (onStop: (blob: Blob, mimeType: string) => void) => {
    if (!isActiveRef.current) return
    const stream = await acquireMic()
    if (!stream || !isActiveRef.current) return
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
    const mr = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = mr
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      onStop(blob, mimeType)
    }
    mr.start()
    setRecording(true)
  }

  const stopRecording = () => {
    const mr = mediaRecorderRef.current
    if (!mr || mr.state === 'inactive') return
    try { mr.stop() } catch {}
    setRecording(false)
    setWhisperLoading(true)
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current)
      autoStopTimeoutRef.current = null
    }
  }

  const handleMicTap = async () => {
    if (activeIdx === null) return
    if (recording) {
      stopRecording()
      return
    }
    if (whisperLoading) return
    vibrate(20)
    setFeedbackType('')
    setOwlSays('')

    const idx = activeIdx
    const targetText = items[idx].text

    await startRecording(async (blob, mimeType) => {
      if (!isActiveRef.current) return
      try {
        const fd = new FormData()
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
        fd.append('file', blob, `audio.${ext}`)
        fd.append('language', 'bg')
        const res = await fetch('/api/whisper', { method: 'POST', body: fd })
        if (!isActiveRef.current) return
        const data = await res.json()
        const transcript = (data.text || '').trim()

        const isCorrect = items[idx].type === 'word'
          ? matchWord(transcript, targetText)
          : matchSentence(transcript, targetText)

        setWhisperLoading(false)

        if (isCorrect) {
          setFeedbackType('correct')
          setOwlSays('Браво!')
          await playTTS('Браво!', 'borisslav')
          if (!isActiveRef.current) return
          // Claim with full points
          handleClaim(true)
        } else {
          const nextAttempt = attempts + 1
          setAttempts(nextAttempt)
          setFeedbackType('wrong')
          setOwlSays('Опитай пак!')
          await playTTS('Опитай пак!', 'borisslav')
          if (!isActiveRef.current) return
          if (nextAttempt >= MAX_ATTEMPTS) {
            // Out of attempts — reveal cube but give 0 points
            handleClaim(false)
          }
          // else: stay on modal, child can try again
        }
      } catch {
        setWhisperLoading(false)
      }
    })

    // No auto-stop — child taps button to stop manually (matches /listening UX)
  }

  const startGame = async () => {
    setLoading(true)
    try {
      // Reading mode: prefer sentences (more challenging for reading practice)
      const url = mode === 'read' ? '/api/game-cube?bias=sentences' : '/api/game-cube'
      const res = await fetch(url)
      const data = await res.json()
      if (!data.items || data.items.length < 9) {
        alert('Грешка при зареждане.'); setLoading(false); return
      }
      setItems(data.items)
      setTileColors(shuffle(TILE_COLORS))
      setRevealed(Array(9).fill(false))
      setAcornsAwarded(null)
      setShowAcornBurst(false)
      setScore(0); setTimeLeft(150); setActiveIdx(null)
      setFlyingAcorns([])
      lastBeepSecRef.current = -1
      isActiveRef.current = true
      setPhase('playing')
      setTimeout(() => startMusic(), 300)
      // Pre-acquire mic for voice modes (avoid permission dialog mid-game)
      if (mode === 'read' || mode === 'listen') acquireMic()
    } catch {
      alert('Грешка при зареждане.')
    }
    setLoading(false)
  }

  const handleTileClick = (i: number) => {
    if (revealed[i] || activeIdx !== null) return
    vibrate(15)
    playSound('cube-open')
    const neighbors = [i - 1, i + 1, i - 3, i + 3].filter(n => n >= 0 && n < 9)
    neighbors.forEach((n, idx) => {
      setTimeout(() => setShakingIdx(n), idx * 30)
      setTimeout(() => setShakingIdx(null), 400 + idx * 30)
    })
    setActiveIdx(i)
    setAttempts(0)
    setFeedbackType('')
    setOwlSays('')
    // Voice modes: duck music immediately and keep it ducked through whole cycle
    if (mode === 'read' || mode === 'listen') {
      fadeMusic(MUSIC_VOL_DUCKED, 250)
    }
    // Listen mode: auto-play TTS after a short delay so modal animation finishes
    if (mode === 'listen' && items[i]) {
      setTimeout(() => {
        if (isActiveRef.current) playTTS(items[i].text, 'kalina')
      }, 500)
    }
  }

  const handleClaim = (awardPoints: boolean = true) => {
    if (activeIdx === null) return
    const idx = activeIdx
    const points = awardPoints ? items[idx].points : 0
    vibrate(awardPoints ? 40 : 15)
    // End of voice cycle — restore music to normal
    if (mode === 'read' || mode === 'listen') {
      fadeMusic(MUSIC_VOL_NORMAL, 400)
    }
    playSound('cube-break')
    setRevealFlash(true)
    setTimeout(() => setRevealFlash(false), 300)
    setGridShake(true)
    setTimeout(() => setGridShake(false), 400)
    setRevealed(r => r.map((v, i) => (i === idx ? true : v)))
    setActiveIdx(null)
    setAttempts(0)
    setFeedbackType('')
    setOwlSays('')

    if (awardPoints) {
      const gridEl = gridContainerRef.current
      if (gridEl) {
        const rect = gridEl.getBoundingClientRect()
        const col = idx % 3, row = Math.floor(idx / 3)
        const tileX = rect.left + (rect.width / 3) * (col + 0.5)
        const tileY = rect.top + (rect.height / 3) * (row + 0.5)
        const newAcorns: FlyingAcorn[] = []
        const count = Math.min(points + 2, 8)
        for (let k = 0; k < count; k++) {
          acornIdRef.current += 1
          newAcorns.push({
            id: acornIdRef.current,
            startX: tileX + (Math.random() - 0.5) * 30,
            startY: tileY + (Math.random() - 0.5) * 30,
          })
        }
        setFlyingAcorns(a => [...a, ...newAcorns])
      }
      confetti({
        particleCount: 30, spread: 60, origin: { y: 0.6 },
        colors: ['#FACC15', '#F97316', '#EAB308']
      })
      setTimeout(() => {
        playSound('coin-collect')
        setScore(s => s + points)
        setScoreBoom(true)
        setTimeout(() => setScoreBoom(false), 500)
      }, 600)
    }
  }

  if (!authChecked) return (
    <main className="u4a-dash min-h-screen flex items-center justify-center">
      <div className="u4a-dash-overlay"></div>
    </main>
  )

  // ─── INTRO ──────────────────────────────────────────
  if (phase === 'intro') return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="u4a-dash-overlay"></div>
      <AnimatedGradientBg />
      <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer',
          position: 'absolute', top: -40, left: 0, color: '#F97316',
          fontFamily: 'Nunito, sans-serif', fontWeight: 800
        }}>← Назад</button>
        <button onClick={toggleMusic} style={{
          background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer',
          position: 'absolute', top: -40, right: 0
        }}>{musicOn ? '🔊' : '🔇'}</button>

        <AnimatedFox mood="excited" size={170} />
        <h1 style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '2.2rem', color: '#78350F', marginTop: 16 }}>
          🎲 Куб Deluxe ✨
        </h1>
        <p style={{ fontFamily: 'Nunito', color: '#92400E', marginBottom: 24, fontSize: '1.05rem' }}>
          {mode === 'read'
            ? <>Прочети на глас и спечели точки!<br/>📖 150 секунди ⚡</>
            : mode === 'listen'
            ? <>Слушай и повтори след г-жа Лисица!<br/>👂 150 секунди ⚡</>
            : <>Истински 3D кубчета<br/>150 секунди magic ⚡</>}
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={startGame} disabled={loading}
          style={{
            width: '100%', background: 'linear-gradient(135deg, #FACC15, #EAB308)',
            color: '#78350F', border: 'none', borderRadius: 20, padding: '1.3rem',
            fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.3rem', cursor: 'pointer',
            boxShadow: '0 8px 28px rgba(234,179,8,0.5)'
          }}
        >{loading ? 'Зареждам...' : '🚀 Започни!'}</motion.button>
      </div>
    </main>
  )

  // ─── DONE ──────────────────────────────────────────
  if (phase === 'done') {
    const allRevealed = revealed.every(r => r)
    return (
      <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="u4a-dash-overlay"></div>
        <AnimatedGradientBg />
        <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
          <AnimatedFox mood={score >= 10 ? 'excited' : 'happy'} size={200} />
          <motion.h1 initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
            style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '2.4rem', color: '#78350F', marginTop: 16 }}>
            {allRevealed ? '🎉 Браво!' : '⏰ Краят!'}
          </motion.h1>
          <ScoreToAcornsTransition
            score={score}
            acornsAwarded={acornsAwarded}
            showBurst={showAcornBurst}
            onScoreAppeared={() => {
              // 1.2 sec after score appears: trigger burst
              setTimeout(() => setShowAcornBurst(true), 1200)
            }}
          />
          <motion.button whileTap={{ scale: 0.95 }} onClick={startGame} style={{
            width: '100%', background: 'linear-gradient(135deg, #FACC15, #EAB308)',
            color: '#78350F', border: 'none', borderRadius: 20, padding: '1.2rem',
            fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.2rem', cursor: 'pointer', marginBottom: 12
          }}>🔄 Още веднъж</motion.button>
          <button onClick={() => router.back()} style={{
            width: '100%', background: 'white', color: '#78350F',
            border: '2px solid #FDE68A', borderRadius: 20, padding: '1rem',
            fontFamily: 'Nunito', fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer'
          }}>← Назад</button>
        </div>
      </main>
    )
  }

  // ─── PLAYING ──────────────────────────────────────────
  const timerLow = timeLeft <= 10
  const timerMid = timeLeft <= 30 && timeLeft > 10
  const isReadMode = mode === 'read'
  const isListenMode = mode === 'listen'
  const isVoiceMode = isReadMode || isListenMode

  return (
    <main className="u4a-dash min-h-screen flex flex-col items-center p-4 pt-6" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="u4a-dash-overlay"></div>
      <AnimatedGradientBg />
      <IdleSparkles />

      {revealFlash && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'radial-gradient(circle, rgba(250,204,21,0.4) 0%, transparent 60%)',
          pointerEvents: 'none', zIndex: 50, animation: 'flashFade 0.3s ease-out'
        }} />
      )}

      {/* Recording fox indicator (top-right) */}
      {(recording || whisperLoading) && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 110,
          pointerEvents: 'none', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))'
        }}>
          <AnimatedFox mood="excited" size={80} />
        </div>
      )}

      <motion.div
        animate={gridShake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8 }}>
          <button onClick={() => {
            if (timerRef.current) clearInterval(timerRef.current)
            stopMusic(); cleanupRecording(); setPhase('intro')
          }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>←</button>

          <motion.div
            animate={{ scale: timerLow ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.5, repeat: timerLow ? Infinity : 0 }}
            style={{
              fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.5rem',
              color: timerLow ? '#DC2626' : timerMid ? '#EA580C' : '#78350F',
              flex: 1, textAlign: 'center'
            }}>⏱ {timeLeft}</motion.div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={toggleMusic} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>
              {musicOn ? '🔊' : '🔇'}
            </button>
            <motion.div
              ref={scoreboardRef}
              animate={{ scale: scoreBoom ? [1, 1.5, 1] : 1, rotate: scoreBoom ? [0, -8, 8, 0] : 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.4rem', color: '#EAB308',
                filter: scoreBoom ? 'drop-shadow(0 0 12px rgba(234,179,8,0.8))' : 'none'
              }}>⭐ {score}</motion.div>
          </div>
        </div>

        <div
          ref={gridContainerRef}
          style={{
            width: '100%', aspectRatio: '1 / 1', marginBottom: 16,
            position: 'relative', borderRadius: 24, overflow: 'hidden',
            background: 'radial-gradient(circle at 30% 20%, #FEF3C7 0%, #FDE68A 30%, #FBBF24 70%, #F59E0B 100%)',
            boxShadow: 'inset 0 4px 24px rgba(0,0,0,0.1), 0 8px 32px rgba(234,179,8,0.25)'
          }}>
          {items.length === 9 && tileColors.length === 9 && (
            <CubeScene
              items={items}
              tileColors={tileColors}
              revealed={revealed}
              shakingIdx={shakingIdx}
              onTileClick={handleTileClick}
            />
          )}
        </div>

        <div style={{ textAlign: 'center', fontFamily: 'Nunito', fontWeight: 800, color: '#92400E' }}>
          {revealed.filter(r => r).length} / 9 отворени
        </div>
      </motion.div>

      {/* Reveal Modal */}
      <AnimatePresence>
        {activeIdx !== null && items[activeIdx] && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={isVoiceMode ? undefined : () => handleClaim(true)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 100, padding: 20
            }}>
            <motion.div
              initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'white', borderRadius: 24, padding: '2rem 1.5rem',
                maxWidth: 420, width: '100%', textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
              }}>
              {isListenMode && feedbackType !== 'correct' && attempts < MAX_ATTEMPTS ? (
                <div style={{
                  fontFamily: 'Nunito', fontWeight: 900, fontSize: '2.5rem',
                  color: '#78350F', marginBottom: 16, padding: '1rem'
                }}>👂 Слушай...</div>
              ) : (
                <div style={{
                  fontFamily: 'Nunito', fontWeight: 900,
                  fontSize: items[activeIdx].type === 'word' ? '2.5rem' : '1.4rem',
                  color: '#78350F', lineHeight: 1.3, marginBottom: 16
                }}>{items[activeIdx].text}</div>
              )}
              <div style={{
                display: 'inline-block', background: '#FEF3C7', color: '#92400E',
                borderRadius: 99, padding: '6px 16px', fontWeight: 800,
                fontFamily: 'Nunito', marginBottom: 20
              }}>+{items[activeIdx].points} точки</div>

              {/* Listen mode: "Hear again" button (free, no attempt cost) */}
              {isListenMode && !recording && !whisperLoading && (
                <button
                  onClick={() => playTTS(items[activeIdx].text, 'kalina')}
                  style={{
                    width: '100%', background: '#EFF6FF', color: '#2563EB',
                    border: '2px solid #BFDBFE', borderRadius: 16,
                    padding: '0.8rem', fontFamily: 'Nunito', fontWeight: 800,
                    fontSize: '1rem', cursor: 'pointer', marginBottom: 12
                  }}>
                  🔊 Чуй пак
                </button>
              )}

              {isVoiceMode ? (
                <>
                  {/* Attempts indicator */}
                  {attempts > 0 && (
                    <div style={{
                      fontFamily: 'Nunito', fontWeight: 800, color: '#92400E',
                      fontSize: '0.9rem', marginBottom: 12
                    }}>
                      Опит {attempts + 1} от {MAX_ATTEMPTS}
                    </div>
                  )}

                  {/* Feedback bubble */}
                  {owlSays && (
                    <div style={{
                      background: feedbackType === 'correct' ? '#F0FDF4' : '#FEF2F2',
                      border: `2px solid ${feedbackType === 'correct' ? '#86EFAC' : '#FECACA'}`,
                      borderRadius: 16, padding: '10px 16px', marginBottom: 16
                    }}>
                      <span style={{ fontSize: '1.3rem' }}>🦉</span>
                      <span style={{
                        fontFamily: 'Nunito', fontWeight: 800,
                        color: feedbackType === 'correct' ? '#166534' : '#991B1B',
                        fontSize: '1.05rem', marginLeft: 8
                      }}>{owlSays}</span>
                    </div>
                  )}

                  {/* Mic button states */}
                  {!recording && !whisperLoading && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleMicTap}
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                        color: 'white', border: 'none', borderRadius: 20,
                        padding: '1.4rem', fontFamily: 'Nunito', fontWeight: 900,
                        fontSize: '1.3rem', cursor: 'pointer',
                        boxShadow: '0 8px 24px rgba(239,68,68,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12
                      }}>
                      🎙️ <span>Натисни и говори</span>
                    </motion.button>
                  )}

                  {recording && (
                    <motion.button
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      onClick={handleMicTap}
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #F97316, #EA580C)',
                        color: 'white', border: 'none', borderRadius: 20,
                        padding: '1.4rem', fontFamily: 'Nunito', fontWeight: 900,
                        fontSize: '1.3rem', cursor: 'pointer',
                        boxShadow: '0 8px 24px rgba(249,115,22,0.5)'
                      }}>
                      🎤 Слушам... (тап за стоп)
                    </motion.button>
                  )}

                  {whisperLoading && (
                    <div style={{
                      width: '100%', background: '#FEF3C7',
                      border: '2px solid #FDE68A', borderRadius: 20,
                      padding: '1.4rem', fontFamily: 'Nunito', fontWeight: 900,
                      fontSize: '1.2rem', color: '#92400E', textAlign: 'center'
                    }}>
                      🦊 Проверявам...
                    </div>
                  )}
                </>
              ) : (
                <motion.button whileTap={{ scale: 0.93 }} onClick={() => handleClaim(true)} style={{
                  width: '100%', background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                  color: '#78350F', border: 'none', borderRadius: 16, padding: '1rem',
                  fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer'
                }}>Вземи! ✨</motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flying acorns */}
      <AnimatePresence>
        {flyingAcorns.map((a) => {
          const target = scoreboardRef.current?.getBoundingClientRect()
          const tx = target ? target.left + target.width / 2 - a.startX : 0
          const ty = target ? target.top + target.height / 2 - a.startY : -200
          return (
            <motion.div
              key={a.id}
              initial={{ x: a.startX, y: a.startY, opacity: 1, scale: 1 }}
              animate={{ x: a.startX + tx, y: a.startY + ty, opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.7, ease: 'easeIn' }}
              onAnimationComplete={() => setFlyingAcorns(prev => prev.filter(p => p.id !== a.id))}
              style={{
                position: 'fixed', top: 0, left: 0, fontSize: '1.8rem',
                pointerEvents: 'none', zIndex: 90,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              }}>🌰</motion.div>
          )
        })}
      </AnimatePresence>

      <style jsx>{`
        @keyframes flashFade { 0% { opacity: 1; } 100% { opacity: 0; } }
      `}</style>
    </main>
  )
}

export default function CubeDeluxePage() {
  return (
    <Suspense fallback={
      <main className="u4a-dash min-h-screen flex items-center justify-center">
        <div className="u4a-dash-overlay"></div>
      </main>
    }>
      <CubeDeluxeInner />
    </Suspense>
  )
}

function AnimatedGradientBg() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
      background: 'linear-gradient(45deg, rgba(250,204,21,0.15), rgba(167,139,250,0.15), rgba(52,211,153,0.15), rgba(251,113,133,0.15))',
      backgroundSize: '400% 400%',
      animation: 'gradientFlow 18s ease infinite'
    }}>
      <style jsx>{`
        @keyframes gradientFlow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  )
}

function ScoreToAcornsTransition({
  score, acornsAwarded, showBurst, onScoreAppeared
}: {
  score: number
  acornsAwarded: number | null
  showBurst: boolean
  onScoreAppeared: () => void
}) {
  // Generate burst particle positions (8 acorns flying outward)
  const burstParticles = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * Math.PI * 2
    const distance = 80 + Math.random() * 60
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 30, // bias upward
      delay: i * 0.04,
    }
  })

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Score number — appears first, pulses, then fades when acorns burst */}
      <motion.div
        initial={{ scale: 0, rotate: -180, opacity: 1 }}
        animate={
          showBurst
            ? { scale: [1, 1.4, 0.6], rotate: 0, opacity: [1, 1, 0] }
            : { scale: 1, rotate: 0, opacity: 1 }
        }
        transition={
          showBurst
            ? { duration: 0.6, times: [0, 0.4, 1] }
            : { type: 'spring', delay: 0.2 }
        }
        onAnimationComplete={onScoreAppeared}
        style={{
          fontFamily: 'Nunito', fontSize: '5rem', fontWeight: 900,
          color: '#EAB308', lineHeight: 1, position: 'relative', zIndex: 2,
        }}
      >
        {score}
      </motion.div>
      <p style={{ color: '#92400E', fontFamily: 'Nunito', marginBottom: 16, opacity: showBurst ? 0 : 1, transition: 'opacity 0.3s' }}>
        точки
      </p>

      {/* Acorn burst particles */}
      <AnimatePresence>
        {showBurst && burstParticles.map((p, i) => (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{
              x: [0, p.x * 0.5, p.x],
              y: [0, p.y * 0.5, p.y + 100],
              scale: [0, 1.4, 0.8],
              opacity: [0, 1, 0],
              rotate: [0, 360],
            }}
            transition={{ duration: 1.2, delay: p.delay, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: '40%', left: '50%',
              fontSize: '2rem', pointerEvents: 'none', zIndex: 3,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
            }}
          >
            🌰
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Final acorns badge — appears AFTER burst completes */}
      <AnimatePresence>
        {showBurst && acornsAwarded !== null && acornsAwarded > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', delay: 1.4, stiffness: 250, damping: 12 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'linear-gradient(135deg, #FEF3C7, #FBBF24)',
              border: '3px solid #F59E0B', borderRadius: 99,
              padding: '14px 28px', marginBottom: 24,
              fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.8rem',
              color: '#78350F',
              boxShadow: '0 12px 32px rgba(245, 158, 11, 0.4)',
              position: 'relative', zIndex: 4,
            }}
          >
            <motion.span
              animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
              transition={{ duration: 0.8, delay: 1.5 }}
              style={{ fontSize: '2.2rem', display: 'inline-block' }}
            >
              🌰
            </motion.span>
            <span>+{acornsAwarded}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function IdleSparkles() {
  const sparkles = Array.from({ length: 8 }, (_, i) => i)
  return (
    <>
      {sparkles.map(i => (
        <motion.div key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], y: [0, -30, -60] }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity, delay: i * 0.5, ease: 'easeOut'
          }}
          style={{
            position: 'fixed',
            left: `${10 + (i * 11) % 80}%`,
            top: `${30 + (i * 7) % 50}%`,
            fontSize: '1.2rem', pointerEvents: 'none', zIndex: 5
          }}>✨</motion.div>
      ))}
    </>
  )
}
