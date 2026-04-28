'use client'
import { useEffect, useRef } from 'react'
import Fox, { FoxMood } from '@/components/fox/Fox'
import ReactMarkdown from 'react-markdown'

type WordResult = { word: string; correct: boolean; input: string; errorType: 'none' | 'spelling' | 'punctuation' | 'capitalization' }
type SentenceResult = { sentence: string; input: string; wordResults: WordResult[]; correct: boolean }

type Props = {
  score: number
  total: number
  percent: number
  streak: number
  results: SentenceResult[]
  explanations: Record<number, string>
  loadingExplanations: boolean
  onHome: () => void
}

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const pieces: { x: number; y: number; r: number; d: number; color: string; tilt: number; tiltAngle: number }[] = []
    const colors = ['#F97316', '#EF4444', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA']
    for (let i = 0; i < 120; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 8 + 4,
        d: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngle: 0,
      })
    }
    let frame = 0
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pieces.forEach(p => {
        p.tiltAngle += 0.05
        p.y += p.d
        p.tilt = Math.sin(p.tiltAngle) * 12
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width }
        ctx.beginPath()
        ctx.fillStyle = p.color
        ctx.ellipse(p.x, p.y, p.r, p.r / 2, p.tilt, 0, Math.PI * 2)
        ctx.fill()
      })
      frame++
      if (frame < 180) requestAnimationFrame(animate)
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    animate()
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 999 }} />
}

export default function DoneScreen({ score, total, percent, streak, results, explanations, loadingExplanations, onHome }: Props) {
  const mood: FoxMood = percent >= 80 ? 'excited' : percent >= 50 ? 'wink' : 'sad'
  const showConfetti = percent >= 80

  const streakMsg = streak >= 7 ? `🔥 ${streak} дни поред — невероятно!`
    : streak >= 3 ? `🔥 ${streak} дни поред — продължавай!`
    : streak >= 1 ? `🔥 ${streak} ден поред — добро начало!`
    : null

  return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      {showConfetti && <Confetti />}
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <Fox mood={mood} size={128} />
          <h1 className="text-3xl font-bold text-gray-700 mb-2 mt-4">
            {percent >= 80 ? '🎉 Браво!' : percent >= 50 ? '👍 Добре!' : '💪 Продължавай!'}
          </h1>
          <p className="text-6xl font-bold text-orange-500">{score}/{total}</p>
          <p className="text-gray-400 mb-3">{percent}% верни изречения</p>
          {streakMsg && (
            <div style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
              border: '2px solid #F59E0B',
              borderRadius: 16,
              padding: '10px 20px',
              fontFamily: 'Russo One, sans-serif',
              fontSize: '1rem',
              color: '#92400E',
              animation: 'streakPop 0.5s ease-out',
            }}>
              {streakMsg}
            </div>
          )}
        </div>

        <style>{`
          @keyframes streakPop {
            0% { transform: scale(0.5); opacity: 0; }
            70% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>

        {loadingExplanations && (
          <div className="bg-orange-50 rounded-2xl p-4 mb-4 text-center">
            <p className="text-orange-500 animate-pulse">🦊 Лисицата анализира грешките...</p>
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 shadow-lg mb-6">
          {results.map((r, i) => (
            <div key={i} className="py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-gray-500 text-sm flex-1">{r.sentence}</p>
                <span className={r.correct ? 'text-green-500 text-xl' : 'text-red-500 text-xl'}>
                  {r.correct ? '✓' : '✗'}
                </span>
              </div>
              {!r.correct && (
                <>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.wordResults.map((wr, j) => (
                      <span key={j} className={`text-sm px-1 rounded ${wr.correct ? 'text-gray-600' : wr.errorType === 'punctuation' ? 'bg-orange-100 text-orange-600 font-bold' : wr.errorType === 'capitalization' ? 'bg-yellow-100 text-yellow-600 font-bold' : 'bg-red-100 text-red-600 font-bold'}`}>
                        {wr.word}
                      </span>
                    ))}
                  </div>
                  {explanations[i] && (
                    <div className="mt-3 bg-orange-50 rounded-xl p-3 border border-orange-200">
                      <p className="text-xs text-orange-500 font-bold mb-1">🦊 Лисицата обяснява:</p>
                      <div className="text-sm text-gray-600 prose prose-sm max-w-none"><ReactMarkdown>{explanations[i]}</ReactMarkdown></div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <button onClick={onHome} className="w-full bg-orange-500 text-white text-xl font-bold py-4 rounded-2xl hover:bg-orange-600 transition-colors">
          Към началото 🏠
        </button>
      </div>
    </main>
  )
}