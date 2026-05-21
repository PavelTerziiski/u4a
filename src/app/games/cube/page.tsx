'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AnimatedFox from '@/components/AnimatedFox'
import '../../dashboard/dashboard.css'

type CubeItem = {
  type: 'word' | 'sentence_easy' | 'sentence_hard' | 'mystery'
  text: string
  points: number
  emoji: string
}

const TILE_COLORS = [
  ['#FBBF24', '#F59E0B'],
  ['#34D399', '#10B981'],
  ['#60A5FA', '#3B82F6'],
  ['#F87171', '#EF4444'],
  ['#A78BFA', '#8B5CF6'],
  ['#FB7185', '#F43F5E'],
  ['#2DD4BF', '#14B8A6'],
  ['#FACC15', '#EAB308'],
  ['#86EFAC', '#22C55E'],
]

const MUSIC_TRACKS = [
  '/sounds/cube-music-1.mp3',
  '/sounds/cube-music-2.mp3',
  '/sounds/cube-music-3.mp3',
  '/sounds/cube-music-4.mp3',
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

export default function CubeGamePage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [phase, setPhase] = useState<'intro' | 'playing' | 'done'>('intro')
  const [items, setItems] = useState<CubeItem[]>([])
  const [revealed, setRevealed] = useState<boolean[]>(Array(9).fill(false))
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(90)
  const [tileColors, setTileColors] = useState<string[][]>([])
  const [loading, setLoading] = useState(false)
  const [musicOn, setMusicOn] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const beepCtxRef = useRef<AudioContext | null>(null)
  const lastBeepSecRef = useRef<number>(-1)

  // Read music preference from localStorage on mount
  useEffect(() => {
    const pref = localStorage.getItem(MUSIC_PREF_KEY)
    if (pref === 'off') setMusicOn(false)
  }, [])

  // Auth gate
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

  // Timer
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

  // Beep on last 5 seconds
  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft > 5 || timeLeft <= 0) return
    if (lastBeepSecRef.current === timeLeft) return
    lastBeepSecRef.current = timeLeft
    playBeep(timeLeft === 1 ? 880 : 660)
  }, [timeLeft, phase])

  // All revealed -> done
  useEffect(() => {
    if (phase === 'playing' && revealed.every(r => r)) {
      if (timerRef.current) clearInterval(timerRef.current)
      setTimeout(() => {
        stopMusic()
        setPhase('done')
      }, 800)
    }
  }, [revealed, phase])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMusic()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

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
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
    } catch {}
  }

  const startMusic = () => {
    if (!musicOn) return
    const track = MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)]
    const audio = new Audio(track)
    audio.loop = true
    audio.volume = 0.4
    audio.play().catch(() => {})
    audioRef.current = audio
  }

  const stopMusic = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      } catch {}
      audioRef.current = null
    }
  }

  const toggleMusic = () => {
    const next = !musicOn
    setMusicOn(next)
    localStorage.setItem(MUSIC_PREF_KEY, next ? 'on' : 'off')
    if (!next) {
      stopMusic()
    } else if (phase === 'playing') {
      startMusic()
    }
  }

  const startGame = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/game-cube')
      const data = await res.json()
      if (!data.items || data.items.length < 9) {
        alert('Грешка при зареждане. Опитай пак.')
        setLoading(false)
        return
      }
      setItems(data.items)
      setTileColors(shuffle(TILE_COLORS))
      setRevealed(Array(9).fill(false))
      setScore(0)
      setTimeLeft(90)
      setActiveIdx(null)
      lastBeepSecRef.current = -1
      setPhase('playing')
      // delay music a bit so it starts after UI transition
      setTimeout(() => startMusic(), 300)
    } catch {
      alert('Грешка при зареждане. Опитай пак.')
    }
    setLoading(false)
  }

  const handleTileClick = (i: number) => {
    if (revealed[i] || activeIdx !== null) return
    setActiveIdx(i)
  }

  const handleClaim = () => {
    if (activeIdx === null) return
    setRevealed(r => r.map((v, i) => (i === activeIdx ? true : v)))
    setScore(s => s + items[activeIdx].points)
    setActiveIdx(null)
  }

  if (!authChecked) return (
    <main className="u4a-dash min-h-screen flex items-center justify-center">
      <div className="u4a-dash-overlay"></div>
    </main>
  )

  // Music toggle button (used in playing screen)
  const MusicToggle = () => (
    <button onClick={toggleMusic} style={{
      background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer',
      padding: 4
    }} aria-label="toggle music">
      {musicOn ? '🔊' : '🔇'}
    </button>
  )

  // ─── INTRO ──────────────────────────────────────────────
  if (phase === 'intro') return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
        <button onClick={() => router.push('/games')} style={{
          background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer',
          position: 'absolute', top: -40, left: 0, color: '#F97316',
          fontFamily: 'Nunito, sans-serif', fontWeight: 800
        }}>← Назад</button>

        <button onClick={toggleMusic} style={{
          background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer',
          position: 'absolute', top: -40, right: 0, padding: 4
        }} aria-label="toggle music">
          {musicOn ? '🔊' : '🔇'}
        </button>

        <AnimatedFox mood="happy" size={160} />

        <h1 style={{
          fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '2rem',
          color: '#78350F', marginTop: 16, marginBottom: 8
        }}>🎲 Куб Игра</h1>

        <p style={{
          fontFamily: 'Nunito, sans-serif', color: '#92400E', fontSize: '1.05rem',
          lineHeight: 1.4, marginBottom: 24
        }}>
          Цъкни квадратче и открий какво се крие отдолу!<br/>
          Имаш <strong>90 секунди</strong> да отвориш всичките 9.
        </p>

        <button onClick={startGame} disabled={loading} style={{
          width: '100%', background: 'linear-gradient(135deg, #FACC15, #EAB308)',
          color: '#78350F', border: 'none', borderRadius: 20, padding: '1.3rem',
          fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.3rem',
          cursor: loading ? 'wait' : 'pointer',
          boxShadow: '0 8px 24px rgba(234,179,8,0.4)',
          opacity: loading ? 0.7 : 1
        }}>
          {loading ? 'Зареждам...' : 'Започни! 🎬'}
        </button>
      </div>
    </main>
  )

  // ─── DONE ──────────────────────────────────────────────
  if (phase === 'done') {
    const allRevealed = revealed.every(r => r)
    return (
      <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
        <div className="u4a-dash-overlay"></div>
        <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
          <AnimatedFox mood={score >= 10 ? 'excited' : 'happy'} size={180} />
          <h1 style={{
            fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '2.2rem',
            color: '#78350F', marginTop: 16
          }}>
            {allRevealed ? '🎉 Браво!' : '⏰ Времето свърши!'}
          </h1>
          <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: '4rem', fontWeight: 900, color: '#EAB308', margin: '8px 0' }}>{score}</p>
          <p style={{ color: '#92400E', fontFamily: 'Nunito, sans-serif', marginBottom: 24 }}>точки</p>

          <button onClick={startGame} style={{
            width: '100%', background: 'linear-gradient(135deg, #FACC15, #EAB308)',
            color: '#78350F', border: 'none', borderRadius: 20, padding: '1.2rem',
            fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.2rem',
            cursor: 'pointer', marginBottom: 12
          }}>🔄 Още веднъж</button>

          <button onClick={() => router.push('/games')} style={{
            width: '100%', background: 'white', color: '#78350F',
            border: '2px solid #FDE68A', borderRadius: 20, padding: '1rem',
            fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer'
          }}>← Други игри</button>
        </div>
      </main>
    )
  }

  // ─── PLAYING ──────────────────────────────────────────────
  const timerLow = timeLeft <= 10
  const timerMid = timeLeft <= 30 && timeLeft > 10

  return (
    <main className="u4a-dash min-h-screen flex flex-col items-center p-4 pt-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md" style={{ position: 'relative', zIndex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8 }}>
          <button onClick={() => {
            if (timerRef.current) clearInterval(timerRef.current)
            stopMusic()
            setPhase('intro')
          }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>←</button>

          <div style={{
            fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.4rem',
            color: timerLow ? '#DC2626' : timerMid ? '#EA580C' : '#78350F',
            transform: timerLow ? 'scale(1.15)' : 'scale(1)',
            transition: 'transform 0.2s',
            flex: 1, textAlign: 'center'
          }}>
            ⏱ {timeLeft}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <MusicToggle />
            <div style={{
              fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.3rem', color: '#EAB308'
            }}>⭐ {score}</div>
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
          aspectRatio: '1 / 1', marginBottom: 16
        }}>
          {items.map((item, i) => {
            const colors = tileColors[i] || ['#9CA3AF', '#6B7280']
            const isRevealed = revealed[i]
            return (
              <div key={i} onClick={() => handleTileClick(i)} style={{
                position: 'relative', cursor: isRevealed ? 'default' : 'pointer',
                perspective: 1000
              }}>
                <div style={{
                  position: 'relative', width: '100%', height: '100%',
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.6s',
                  transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}>
                  {/* Front (closed) */}
                  <div style={{
                    position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    background: 'linear-gradient(135deg, ' + colors[0] + ', ' + colors[1] + ')',
                    borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontFamily: 'Nunito, sans-serif', fontWeight: 900,
                    fontSize: '2.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>?</div>
                  {/* Back (opened) — word + points */}
                  <div style={{
                    position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    background: 'white', borderRadius: 16,
                    border: '3px solid #FDE68A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', padding: '6px 4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      fontFamily: 'Nunito, sans-serif', fontWeight: 900,
                      fontSize: item.type === 'word'
                        ? (item.text.length > 8 ? '0.85rem' : '1rem')
                        : '0.65rem',
                      color: '#78350F', lineHeight: 1.15, textAlign: 'center',
                      wordBreak: 'break-word',
                      maxWidth: '95%'
                    }}>
                      {item.text}
                    </div>
                    <div style={{
                      fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '0.95rem',
                      color: '#EAB308', marginTop: 4
                    }}>+{item.points}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{
          textAlign: 'center', fontFamily: 'Nunito, sans-serif', fontWeight: 800,
          color: '#92400E', fontSize: '0.95rem'
        }}>
          {revealed.filter(r => r).length} / 9 отворени
        </div>
      </div>

      {activeIdx !== null && items[activeIdx] && (
        <div onClick={handleClaim} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: 20, animation: 'fadeIn 0.3s'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', borderRadius: 24, padding: '2rem 1.5rem',
            maxWidth: 420, width: '100%', textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>{items[activeIdx].emoji}</div>
            <div style={{
              fontFamily: 'Nunito, sans-serif', fontWeight: 900,
              fontSize: items[activeIdx].type === 'word' ? '2.5rem' : '1.4rem',
              color: '#78350F', lineHeight: 1.3, marginBottom: 16
            }}>
              {items[activeIdx].text}
            </div>
            <div style={{
              display: 'inline-block', background: '#FEF3C7', color: '#92400E',
              borderRadius: 99, padding: '6px 16px', fontWeight: 800,
              fontFamily: 'Nunito, sans-serif', fontSize: '1rem', marginBottom: 20
            }}>+{items[activeIdx].points} точки</div>
            <button onClick={handleClaim} style={{
              width: '100%', background: 'linear-gradient(135deg, #FACC15, #EAB308)',
              color: '#78350F', border: 'none', borderRadius: 16, padding: '1rem',
              fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer'
            }}>Вземи точките! ✨</button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.6); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </main>
  )
}
