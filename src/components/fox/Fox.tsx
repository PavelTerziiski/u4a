'use client'

import { useEffect, useState } from 'react'

export type FoxMood = 'happy' | 'excited' | 'sad' | 'angry' | 'wink' | 'writing' | 'thumbsup' | 'pointing'

interface FoxProps {
  mood?: FoxMood
  size?: number
  name?: string
}

const FOX_IMAGES: Record<FoxMood, string> = {
  happy: '/images/fox-happy.png',
  excited: '/images/fox-excited.png',
  sad: '/images/fox-sad.png',
  angry: '/images/fox-angry.png',
  wink: '/images/fox-wink.png',
  writing: '/images/fox-writing.png',
  thumbsup: '/images/fox-thumbsup.png',
  pointing: '/images/fox-looking-at-results.png',
}

export default function Fox({ mood = 'happy', size = 160, name }: FoxProps) {
  const [currentMood, setCurrentMood] = useState(mood)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    setCurrentMood(mood)
    setAnimating(true)
    const t = setTimeout(() => setAnimating(false), 600)
    return () => clearTimeout(t)
  }, [mood])

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative transition-all duration-300 ${animating ? 'scale-110' : 'scale-100'}`}
        style={{ width: size, height: size }}
      >
        {currentMood === 'writing' ? (
          <video
            src="/fox-animation.mp4"
            autoPlay
            loop
            muted
            playsInline
            style={{ width: size, height: size, objectFit: 'contain', mixBlendMode: 'multiply' }}
          />
        ) : (
          <img
            src={FOX_IMAGES[currentMood] || '/images/fox.png'}
            alt="Лисица"
            className="w-full h-full object-contain transition-opacity duration-300"
            style={{ width: size, height: size }}
          />
        )}
      </div>
      {name && (
        <p className="text-orange-500 font-bold mt-2 text-lg">{name}</p>
      )}
    </div>
  )
}