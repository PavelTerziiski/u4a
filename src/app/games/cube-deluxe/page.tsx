'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import dynamic from 'next/dynamic'
import AnimatedFox from '@/components/AnimatedFox'
import '../../dashboard/dashboard.css'

// Lazy-load CubeScene to avoid SSR issues with three.js
const CubeScene = dynamic(() => import('./CubeScene'), { ssr: false })

type CubeItem = {
  type: 'word' | 'sentence_easy' | 'sentence_hard' | 'mystery'
  text: string
  points: number
  emoji: string
}

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type FlyingAcorn = { id: number; startX: number; startY: number }

export default function CubeDeluxePage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [phase, setPhase] = useState<'intro' | 'playing' | 'done'>('intro')
  const [items, setItems] = useState<CubeItem[]>([])
  const [revealed, setRevealed] = useState<boolean[]>(Array(9).fill(false))
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [shakingIdx, setShakingIdx] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(90)
  const [tileColors, setTileColors] = useState<string[][]>([])
  const [loading, setLoading] = useState(false)
  const [musicOn, setMusicOn] = useState(true)
  const [scoreBoom, setScoreBoom] = useState(false)
  const [flyingAcorns, setFlyingAcorns] = useState<FlyingAcorn[]>([])
  const [gridShake, setGridShake] = useState(false)
  const [revealFlash, setRevealFlash] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const beepCtxRef = useRef<AudioContext | null>(null)
  const lastBeepSecRef = useRef<number>(-1)
  const acornIdRef = useRef(0)
  const scoreboardRef = useRef<HTMLDivElement | null>(null)
  const gridContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const pref = localStorage.getItem(MUSIC_PREF_KEY)
    if (pref === 'off') setMusicOn(false)
  }, [])

  useEffect(() => {
    const username = localStorage.getItem('u4a_username')
    if (!username) { router.push('/login'); return }
    supabase.from('profiles').select('email').eq('username', username).single()
      .then(({ data }) => {
        if (!data || data.email !== 'pavel.impro@gmail.com') {
          router.push('/pronunciation')
          return
        }
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
      setTimeout(() => { stopMusic(); setPhase('done') }, 1500)
    }
  }, [revealed, phase])

  useEffect(() => () => { stopMusic(); if (timerRef.current) clearInterval(timerRef.current) }, [])

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
    audio.volume = 0.4
    audio.play().catch(() => {})
    audioRef.current = audio
  }

  const stopMusic = () => {
    if (audioRef.current) {
      try { audioRef.current.pause(); audioRef.current.currentTime = 0 } catch {}
      audioRef.current = null
    }
  }

  const toggleMusic = () => {
    const next = !musicOn
    setMusicOn(next)
    localStorage.setItem(MUSIC_PREF_KEY, next ? 'on' : 'off')
    if (!next) stopMusic()
    else if (phase === 'playing') startMusic()
  }

  const vibrate = (ms: number) => { try { if (navigator.vibrate) navigator.vibrate(ms) } catch {} }

  const startGame = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/game-cube')
      const data = await res.json()
      if (!data.items || data.items.length < 9) {
        alert('Грешка при зареждане.'); setLoading(false); return
      }
      setItems(data.items)
      setTileColors(shuffle(TILE_COLORS))
      setRevealed(Array(9).fill(false))
      setScore(0); setTimeLeft(90); setActiveIdx(null)
      setFlyingAcorns([])
      lastBeepSecRef.current = -1
      setPhase('playing')
      setTimeout(() => startMusic(), 300)
    } catch {
      alert('Грешка при зареждане.')
    }
    setLoading(false)
  }

  const handleTileClick = (i: number) => {
    if (revealed[i] || activeIdx !== null) return
    vibrate(15)
    const neighbors = [i - 1, i + 1, i - 3, i + 3].filter(n => n >= 0 && n < 9)
    neighbors.forEach((n, idx) => {
      setTimeout(() => setShakingIdx(n), idx * 30)
      setTimeout(() => setShakingIdx(null), 400 + idx * 30)
    })
    setActiveIdx(i)
  }

  const handleClaim = () => {
    if (activeIdx === null) return
    const idx = activeIdx
    const points = items[idx].points
    vibrate(40)
    setRevealFlash(true)
    setTimeout(() => setRevealFlash(false), 300)
    setGridShake(true)
    setTimeout(() => setGridShake(false), 400)
    setRevealed(r => r.map((v, i) => (i === idx ? true : v)))
    setActiveIdx(null)

    // Spawn flying acorns from grid center -> scoreboard
    const gridEl = gridContainerRef.current
    if (gridEl) {
      const rect = gridEl.getBoundingClientRect()
      // estimate tile position (3x3)
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
      setScore(s => s + points)
      setScoreBoom(true)
      setTimeout(() => setScoreBoom(false), 500)
    }, 600)
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
        <button onClick={() => router.push('/games')} style={{
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
          Истински 3D кубчета<br/>90 секунди magic ⚡
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
          <motion.p initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.2 }}
            style={{ fontFamily: 'Nunito', fontSize: '5rem', fontWeight: 900, color: '#EAB308' }}>
            {score}
          </motion.p>
          <p style={{ color: '#92400E', fontFamily: 'Nunito', marginBottom: 24 }}>точки</p>
          <motion.button whileTap={{ scale: 0.95 }} onClick={startGame} style={{
            width: '100%', background: 'linear-gradient(135deg, #FACC15, #EAB308)',
            color: '#78350F', border: 'none', borderRadius: 20, padding: '1.2rem',
            fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.2rem', cursor: 'pointer', marginBottom: 12
          }}>🔄 Още веднъж</motion.button>
          <button onClick={() => router.push('/games')} style={{
            width: '100%', background: 'white', color: '#78350F',
            border: '2px solid #FDE68A', borderRadius: 20, padding: '1rem',
            fontFamily: 'Nunito', fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer'
          }}>← Други игри</button>
        </div>
      </main>
    )
  }

  // ─── PLAYING ──────────────────────────────────────────
  const timerLow = timeLeft <= 10
  const timerMid = timeLeft <= 30 && timeLeft > 10

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

      <motion.div
        animate={gridShake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8 }}>
          <button onClick={() => {
            if (timerRef.current) clearInterval(timerRef.current)
            stopMusic(); setPhase('intro')
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

        {/* THE 3D SCENE — single Canvas with all 9 cubes */}
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
            onClick={handleClaim}
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
              <div style={{
                fontFamily: 'Nunito', fontWeight: 900,
                fontSize: items[activeIdx].type === 'word' ? '2.5rem' : '1.4rem',
                color: '#78350F', lineHeight: 1.3, marginBottom: 16
              }}>{items[activeIdx].text}</div>
              <div style={{
                display: 'inline-block', background: '#FEF3C7', color: '#92400E',
                borderRadius: 99, padding: '6px 16px', fontWeight: 800,
                fontFamily: 'Nunito', marginBottom: 20
              }}>+{items[activeIdx].points} точки</div>
              <motion.button whileTap={{ scale: 0.93 }} onClick={handleClaim} style={{
                width: '100%', background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                color: '#78350F', border: 'none', borderRadius: 16, padding: '1rem',
                fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer'
              }}>Вземи! ✨</motion.button>
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
