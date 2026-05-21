'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import '../../dashboard/dashboard.css'

const TILE_COLORS = [
  ['#FBBF24', '#F59E0B'], ['#34D399', '#10B981'], ['#60A5FA', '#3B82F6'],
  ['#F87171', '#EF4444'], ['#A78BFA', '#8B5CF6'], ['#FB7185', '#F43F5E'],
  ['#2DD4BF', '#14B8A6'], ['#FACC15', '#EAB308'], ['#86EFAC', '#22C55E'],
]

const SAMPLE_WORDS = ['котка', 'ябълка', 'дъга', 'река', 'облак', 'птица', 'звезда', 'цвете', 'мост']

export default function AnimDemoPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [mode, setMode] = useState<'css' | 'framer'>('css')
  const [revealed, setRevealed] = useState<boolean[]>(Array(9).fill(false))
  const [score, setScore] = useState(0)
  const [showSparkle, setShowSparkle] = useState<{ x: number, y: number, id: number } | null>(null)
  const [scoreBoom, setScoreBoom] = useState(false)
  const [shakingIdx, setShakingIdx] = useState<number | null>(null)
  const [gameKey, setGameKey] = useState(0) // force remount for re-animation
  const scoreRef = useRef<HTMLDivElement | null>(null)
  const sparkleIdRef = useRef(0)

  useEffect(() => {
    const username = localStorage.getItem('u4a_username')
    if (!username) { router.push('/login'); return }
    supabase.from('profiles').select('email').eq('username', username).single().then(({ data }) => {
      if (!data || data.email !== 'pavel.impro@gmail.com') { router.push('/pronunciation'); return }
      setAuthed(true)
    })
  }, [])

  const reset = () => {
    setRevealed(Array(9).fill(false))
    setScore(0)
    setGameKey(k => k + 1)
  }

  const handleTileClick = (i: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (revealed[i]) return
    // ripple effect — emit sparkle at click location
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    sparkleIdRef.current += 1
    setShowSparkle({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      id: sparkleIdRef.current
    })
    // shake neighbors
    const neighbors = [i - 1, i + 1, i - 3, i + 3].filter(n => n >= 0 && n < 9)
    neighbors.forEach((n, idx) => {
      setTimeout(() => setShakingIdx(n), idx * 30)
      setTimeout(() => setShakingIdx(null), 400 + idx * 30)
    })
    setRevealed(r => r.map((v, idx) => idx === i ? true : v))
    // points fly to scoreboard
    setTimeout(() => {
      setScore(s => s + 1)
      setScoreBoom(true)
      setTimeout(() => setScoreBoom(false), 500)
    }, 400)
  }

  if (!authed) return <main className="u4a-dash min-h-screen"><div className="u4a-dash-overlay"></div></main>

  return (
    <main className="u4a-dash min-h-screen p-4 pt-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md mx-auto" style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={() => router.push('/games')} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#F97316' }}>← Назад</button>
          <div ref={scoreRef} style={{
            fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.4rem', color: '#EAB308',
            transition: 'transform 0.3s',
            transform: scoreBoom ? 'scale(1.4) rotate(-5deg)' : 'scale(1)'
          }}>
            ⭐ {score}
          </div>
        </div>

        {/* Mode switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'white', borderRadius: 16, padding: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <button onClick={() => { setMode('css'); reset() }} style={{
            flex: 1, padding: '0.8rem', border: 'none', borderRadius: 12,
            background: mode === 'css' ? 'linear-gradient(135deg, #FACC15, #EAB308)' : 'transparent',
            color: mode === 'css' ? '#78350F' : '#92400E',
            fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer'
          }}>🎨 CSS</button>
          <button onClick={() => { setMode('framer'); reset() }} style={{
            flex: 1, padding: '0.8rem', border: 'none', borderRadius: 12,
            background: mode === 'framer' ? 'linear-gradient(135deg, #FACC15, #EAB308)' : 'transparent',
            color: mode === 'framer' ? '#78350F' : '#92400E',
            fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer'
          }}>⚡ Framer Motion</button>
        </div>

        <p style={{ textAlign: 'center', fontFamily: 'Nunito, sans-serif', color: '#92400E', fontSize: '0.85rem', marginBottom: 16 }}>
          Цъкни квадратчетата • Виж entrance, click vibe, sparkles, score fly
        </p>

        {/* === CSS MODE === */}
        {mode === 'css' && (
          <div key={`css-${gameKey}`} style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
            aspectRatio: '1 / 1', marginBottom: 16, position: 'relative'
          }}>
            {SAMPLE_WORDS.map((word, i) => {
              const colors = TILE_COLORS[i]
              const isRevealed = revealed[i]
              const isShaking = shakingIdx === i
              return (
                <div
                  key={i}
                  onClick={(e) => handleTileClick(i, e)}
                  className={`css-tile ${isShaking ? 'shake' : ''}`}
                  style={{
                    position: 'relative', cursor: isRevealed ? 'default' : 'pointer',
                    perspective: 1000,
                    animation: `popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.06}s both`
                  }}
                >
                  <div style={{
                    position: 'relative', width: '100%', height: '100%',
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.6s',
                    transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)'
                  }}>
                    <div style={{
                      position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                      background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
                      borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 900, fontSize: '2.5rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}>?</div>
                    <div style={{
                      position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)', background: 'white', borderRadius: 16,
                      border: '3px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexDirection: 'column', color: '#78350F', fontFamily: 'Nunito', fontWeight: 900
                    }}>
                      <div>{word}</div>
                      <div style={{ color: '#EAB308', fontSize: '0.9rem' }}>+1</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* === FRAMER MOTION MODE === */}
        {mode === 'framer' && (
          <div key={`framer-${gameKey}`} style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
            aspectRatio: '1 / 1', marginBottom: 16, position: 'relative'
          }}>
            {SAMPLE_WORDS.map((word, i) => {
              const colors = TILE_COLORS[i]
              const isRevealed = revealed[i]
              const isShaking = shakingIdx === i
              return (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: -180, opacity: 0 }}
                  animate={{
                    scale: isShaking ? [1, 1.05, 0.95, 1] : 1,
                    rotate: 0,
                    opacity: 1,
                    x: isShaking ? [0, -4, 4, -4, 0] : 0
                  }}
                  transition={{
                    scale: isShaking ? { duration: 0.4 } : { type: 'spring', stiffness: 260, damping: 18, delay: i * 0.08 },
                    rotate: { type: 'spring', stiffness: 200, damping: 15, delay: i * 0.08 },
                    opacity: { duration: 0.3, delay: i * 0.08 },
                    x: isShaking ? { duration: 0.4 } : undefined
                  }}
                  whileTap={{ scale: 0.92 }}
                  onClick={(e) => handleTileClick(i, e as unknown as React.MouseEvent<HTMLDivElement>)}
                  style={{
                    position: 'relative', cursor: isRevealed ? 'default' : 'pointer',
                    perspective: 1000
                  }}
                >
                  <motion.div
                    animate={{ rotateY: isRevealed ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    style={{
                      position: 'relative', width: '100%', height: '100%',
                      transformStyle: 'preserve-3d'
                    }}
                  >
                    <div style={{
                      position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                      background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
                      borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 900, fontSize: '2.5rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}>?</div>
                    <div style={{
                      position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)', background: 'white', borderRadius: 16,
                      border: '3px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexDirection: 'column', color: '#78350F', fontFamily: 'Nunito', fontWeight: 900
                    }}>
                      <div>{word}</div>
                      <div style={{ color: '#EAB308', fontSize: '0.9rem' }}>+1</div>
                    </div>
                  </motion.div>
                </motion.div>
              )
            })}
          </div>
        )}

        <button onClick={reset} style={{
          width: '100%', background: 'white', color: '#78350F',
          border: '2px solid #FDE68A', borderRadius: 16, padding: '0.9rem',
          fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', cursor: 'pointer'
        }}>🔄 Рестарт (виж entrance отново)</button>
      </div>

      {/* Sparkle on click (works for both modes) */}
      <AnimatePresence>
        {showSparkle && (
          <motion.div
            key={showSparkle.id}
            initial={{ scale: 0, opacity: 1, x: showSparkle.x, y: showSparkle.y }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            onAnimationComplete={() => setShowSparkle(null)}
            style={{
              position: 'fixed', top: -20, left: -20, pointerEvents: 'none', zIndex: 200,
              fontSize: '3rem'
            }}
          >✨</motion.div>
        )}
      </AnimatePresence>

      {/* Points fly to scoreboard */}
      <AnimatePresence>
        {scoreBoom && (
          <motion.div
            initial={{ opacity: 1, scale: 1, y: 0 }}
            animate={{ opacity: 0, scale: 1.5, y: -80 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              pointerEvents: 'none', zIndex: 150,
              fontFamily: 'Nunito', fontWeight: 900, fontSize: '2.5rem', color: '#EAB308',
              textShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >+1 ⭐</motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes popIn {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          60% { transform: scale(1.1) rotate(10deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .css-tile.shake {
          animation: shake 0.4s ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px) scale(1.05); }
          50% { transform: translateX(4px) scale(0.95); }
          75% { transform: translateX(-4px) scale(1.05); }
        }
      `}</style>
    </main>
  )
}
