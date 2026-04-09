'use client'

import { useEffect, useRef } from 'react'

type Word = {
  word: string
  x: number
  y: number
  w: number
  h: number
  line: number
}

type ErrorType = 'none' | 'spelling' | 'punctuation' | 'capitalization'

type AnnotatedWord = Word & {
  errorType: ErrorType
}

type Props = {
  imageBase64: string
  words: AnnotatedWord[]
}

export default function AnnotatedImage({ imageBase64, words }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      words.forEach(w => {
        if (w.errorType === 'none') return

        const x = w.x * img.width
        const y = w.y * img.height
        const width = w.w * img.width
        const height = w.h * img.height

        // Цветове според вида грешка
        const colors: Record<ErrorType, string> = {
          spelling: 'rgba(220, 38, 38, 0.35)',
          punctuation: 'rgba(234, 88, 12, 0.35)',
          capitalization: 'rgba(202, 138, 4, 0.35)',
          none: 'transparent'
        }

        const borderColors: Record<ErrorType, string> = {
          spelling: '#dc2626',
          punctuation: '#ea580c',
          capitalization: '#ca8a04',
          none: 'transparent'
        }

        // Запълнен правоъгълник
        ctx.fillStyle = colors[w.errorType]
        ctx.fillRect(x, y, width, height)

        // Рамка
        ctx.strokeStyle = borderColors[w.errorType]
        ctx.lineWidth = 2
        ctx.strokeRect(x, y, width, height)
      })
    }
    img.src = `data:image/jpeg;base64,${imageBase64}`
  }, [imageBase64, words])

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-2xl shadow-lg"
      style={{ maxWidth: '100%' }}
    />
  )
}