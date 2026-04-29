import { NextRequest, NextResponse } from 'next/server'

function normalize(text: string) {
  return text.toLowerCase()
    .replace(/[.,!?;:»«–"']/g, '')
    .replace(/s+/g, ' ')
    .trim()
}

function similarity(a: string, b: string) {
  const wordsA = normalize(a).split(' ')
  const wordsB = normalize(b).split(' ')
  const matches = wordsA.filter(w => wordsB.includes(w)).length
  return matches / Math.max(wordsA.length, wordsB.length)
}

export async function POST(req: NextRequest) {
  try {
    const { original, transcript } = await req.json()
    if (!transcript || transcript.trim().length < 3) {
      return NextResponse.json({ correct: false, feedback: 'Опитай пак!' })
    }
    const score = similarity(original, transcript)
    const correct = score >= 0.65
    return NextResponse.json({ correct, feedback: correct ? 'Браво!' : 'Опитай пак!' })
  } catch {
    return NextResponse.json({ correct: false, feedback: 'Опитай пак!' })
  }
}
