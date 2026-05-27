import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type CubeItem = {
  type: 'word' | 'sentence_easy' | 'sentence_hard' | 'mystery'
  text: string
  points: number
  emoji: string
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length)
    out.push(copy.splice(idx, 1)[0])
  }
  return out
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).length
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lang = searchParams.get('lang') || 'bg'
  const level = searchParams.get('level')

  let query = supabase.from('dictations').select('words, sentences, grade')
  if (lang === 'bg') {
    query = query.eq('category', 'original').eq('language', 'bg')
  } else {
    query = query.eq('language', lang)
    if (level) query = query.eq('difficulty', level)
  }
  const { data: dictations, error } = await query

  if (error || !dictations) {
    return NextResponse.json({ error: error?.message || 'no data' }, { status: 500 })
  }

  // За EN/DE — дърпаме думи от pronunciation_words
  const wordsForLang: string[] = []
  if (lang !== 'bg') {
    const { data: pwData } = await supabase
      .from('pronunciation_words')
      .select('word')
      .eq('language', lang)
    wordsForLang.push(...(pwData || []).map((r: { word: string }) => r.word).filter(Boolean))
  }

  // Gather all words (single words across all dictations)
  const allWords: string[] = []
  // Gather sentences with length info
  const allSentences: { text: string; wordCount: number }[] = []

  for (const d of dictations) {
    const words = (d.words as string[]) || []
    for (const w of words) {
      if (typeof w === 'string' && w.length >= 2) allWords.push(w)
    }
    const sentences = (d.sentences as { id: number; text: string }[]) || []
    for (const s of sentences) {
      if (s?.text && typeof s.text === 'string') {
        allSentences.push({ text: s.text, wordCount: countWords(s.text) })
      }
    }
  }

  // Buckets
  const easySentences = allSentences.filter(s => s.wordCount < 6)
  const hardSentences = allSentences.filter(s => s.wordCount >= 6)

  // Pick: 3 words, 3 easy sentences, 2 hard sentences, 1 mystery
  const easyItems: CubeItem[] = pickRandom(allWords, 3).map(w => ({
    type: 'word' as const, text: w, points: 1, emoji: '🍎'
  }))
  const midItems: CubeItem[] = pickRandom(easySentences, 3).map(s => ({
    type: 'sentence_easy' as const, text: s.text, points: 2, emoji: '🌟'
  }))
  const hardItems: CubeItem[] = pickRandom(hardSentences, 2).map(s => ({
    type: 'sentence_hard' as const, text: s.text, points: 3, emoji: '🚀'
  }))

  // Mystery: random item with random points 0-5
  const mysteryPool: { text: string; type: CubeItem['type'] }[] = [
    ...pickRandom(allWords, 5).map(w => ({ text: w, type: 'word' as const })),
    ...pickRandom(allSentences, 5).map(s => ({ text: s.text, type: 'sentence_easy' as const })),
  ]
  const mysteryPick = pickRandom(mysteryPool, 1)[0]
  const mysteryPoints = Math.floor(Math.random() * 6) // 0..5
  const mysteryItem: CubeItem = mysteryPick ? {
    type: 'mystery',
    text: mysteryPick.text,
    points: mysteryPoints,
    emoji: '🎁'
  } : { type: 'mystery', text: lang === 'bg' ? 'Изненада!' : lang === 'en' ? 'Surprise!' : 'Überraschung!', points: 0, emoji: '🎁' }

  const all = shuffle([...easyItems, ...midItems, ...hardItems, mysteryItem])

  return NextResponse.json({ items: all })
}
