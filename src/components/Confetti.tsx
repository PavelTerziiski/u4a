'use client'
import { useEffect, useState } from 'react'

type Piece = { id: number; left: number; delay: number; duration: number; color: string; rotate: number; size: number }

const COLORS = ['#F97316', '#FBBF24', '#34D399', '#60A5FA', '#F472B6', '#A78BFA']

export default function Confetti({ active, duration = 4000 }: { active: boolean; duration?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([])

  useEffect(() => {
    if (!active) { setPieces([]); return }
    const arr: Piece[] = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 600,
      duration: 2400 + Math.random() * 1800,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotate: Math.random() * 360,
      size: 8 + Math.random() * 8,
    }))
    setPieces(arr)
    const t = setTimeout(() => setPieces([]), duration)
    return () => clearTimeout(t)
  }, [active, duration])

  if (!pieces.length) return null

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden',
      }}>
        {pieces.map(p => (
          <div key={p.id} style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            borderRadius: 2,
            animation: `confetti-fall ${p.duration}ms ${p.delay}ms linear forwards`,
            transform: `rotate(${p.rotate}deg)`,
          }} />
        ))}
      </div>
    </>
  )
}
