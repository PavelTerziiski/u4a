'use client'
import { useEffect, useState } from 'react'

export default function TrialCountdown({ trialEndsAt }: { trialEndsAt: string }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(i)
  }, [])

  const diff = new Date(trialEndsAt).getTime() - now
  if (diff <= 0) return <div className="premium-sub">Пробният период изтече · Избери план</div>

  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const pad = (n: number) => n.toString().padStart(2, '0')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: '1.6rem', display: 'inline-block', animation: 'u4a-pulse 2s ease-in-out infinite' }}>⏳</span>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontFamily: 'SF Mono, Menlo, Consolas, monospace', fontSize: '1.1rem', fontWeight: 800, color: '#7C2D12', letterSpacing: '1px' }}>
          {pad(h)}:{pad(m)}:{pad(s)}
        </span>
        <span style={{ fontSize: '0.65rem', color: '#B45309', fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>ОСТАВАТ</span>
      </div>
      <style jsx>{`
        @keyframes u4a-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  )
}
