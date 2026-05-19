'use client'
import { useState, useRef } from 'react'
type Mood = 'happy' | 'excited' | 'tryagain' | 'writes' | 'sad' | 'wink'
const SRC: Record<Mood, string> = {
  happy: '/videos/fox-happy-pp.mp4',
  excited: '/videos/fox-excited-pp.mp4',
  tryagain: '/videos/fox-tryagain-pp.mp4',
  writes: '/videos/fox-writes-pp.mp4',
  sad: '/videos/fox-sad-pp.mp4',
  wink: '/videos/fox-wink-pp.mp4',
}

type Ripple = { id: number; x: number; y: number }

export default function AnimatedFox({
  mood = 'happy',
  size = 260,
  onClick,
}: {
  mood?: Mood
  size?: number
  onClick?: () => void
}) {
  const [ripples, setRipples] = useState<Ripple[]>([])
  const rippleIdRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!onClick) return
    onClick()

    const rect = e.currentTarget.getBoundingClientRect()
    let clientX = 0, clientY = 0
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }
    const x = clientX - rect.left
    const y = clientY - rect.top
    const id = rippleIdRef.current++
    setRipples(r => [...r, { id, x, y }])
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 700)
  }

  return (
    <div
      onClick={onClick ? handleClick : undefined}
      onTouchStart={onClick ? handleClick : undefined}
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <style>{`
        @keyframes fox-ripple {
          0%   { transform: translate(-50%, -50%) scale(0);   opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
        }
      `}</style>
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          WebkitMaskImage: 'radial-gradient(circle at center, black 70%, transparent 100%)',
          maskImage: 'radial-gradient(circle at center, black 70%, transparent 100%)',
          position: 'relative',
        }}
      >
        <video
          ref={videoRef}
          key={mood}
          src={SRC[mood]}
          autoPlay
          loop
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
            display: 'block',
          }}
        />
        {ripples.map(r => (
          <span
            key={r.id}
            style={{
              position: 'absolute',
              left: r.x,
              top: r.y,
              width: size * 0.5,
              height: size * 0.5,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 60%, transparent 100%)',
              border: '2px solid rgba(255,255,255,0.7)',
              pointerEvents: 'none',
              animation: 'fox-ripple 0.65s ease-out forwards',
              transform: 'translate(-50%, -50%) scale(0)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
