/**
 * Unified Whisper transcript matching for u4a.bg.
 * Used by /listening, /reading, /games/cube-deluxe.
 *
 * Designed to be FORGIVING — children often mispronounce or get cut off,
 * and even adult VO recordings fail with strict matching. We prefer false
 * positives (rewarding a near-miss) over false negatives (frustration).
 */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (umlauts, accents)
    .replace(/[.,!?;:„""''«»()\-—–]/g, '') // strip punctuation
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(s: string): string[] {
  return normalize(s).split(' ').filter(w => w.length > 0)
}

/**
 * Match a single word.
 * Returns true if transcript is a reasonable attempt at target.
 */
export function matchWord(transcript: string, target: string): boolean {
  const t = normalize(transcript)
  const g = normalize(target)
  if (t.length < 2 || g.length < 2) return false

  // Direct containment either way
  if (t.includes(g)) return true
  if (g.includes(t) && t.length >= Math.min(3, g.length - 1)) return true

  // First 3 chars match (catches truncated speech: "ябъ" → "ябълка")
  if (t.length >= 3 && g.length >= 3 && t.substring(0, 3) === g.substring(0, 3)) return true

  // Root match (60% of target)
  const rootLen = Math.max(3, Math.floor(g.length * 0.6))
  const root = g.substring(0, rootLen)
  if (t.includes(root)) return true

  return false
}

/**
 * Match a sentence.
 * Returns true if transcript captures the essence of the target.
 */
// Bulgarian stop words — filter out so they don't dilute the match ratio
const STOP_WORDS_BG = new Set([
  'и','на','в','във','от','се','да','не','с','със','за','по','до','при',
  'но','а','като','че','е','са','го','я','им','ги','ни','ви','му','й',
  'аз','ти','той','тя','то','ние','вие','те','ми','си','ще','бих','би',
  'a','the','is','am','are','was','were','of','to','in','on','at','it'
])

export function matchSentence(transcript: string, target: string): boolean {
  const tNorm = normalize(transcript)
  if (tNorm.length < 3) return false

  // Filter stop words from target so common short words don't inflate denominator
  const targetWords = tokenize(target).filter(w => !STOP_WORDS_BG.has(w))
  const transcriptWords = tokenize(transcript)
  if (targetWords.length === 0) return false

  // Exact-word matches (after normalization)
  const exactMatches = targetWords.filter(w => transcriptWords.includes(w)).length

  // Fuzzy matches: target word's root appears in any transcript word
  // (catches "пътувам" vs "пътува", "купувам" vs "купих")
  const fuzzyMatches = targetWords.filter(tw => {
    if (transcriptWords.includes(tw)) return false // already counted as exact
    if (tw.length < 4) return false // skip short words for fuzzy
    const root = tw.substring(0, Math.max(3, Math.floor(tw.length * 0.6)))
    return transcriptWords.some(transW => transW.includes(root) || tw.includes(transW.substring(0, 3)))
  }).length

  const totalMatches = exactMatches + fuzzyMatches
  const ratio = totalMatches / targetWords.length

  // 25% threshold (lower than the old 30%)
  if (ratio >= 0.25) return true

  // Short sentence bonus: if target has <=4 words and at least 1 matched
  if (targetWords.length <= 4 && totalMatches >= 1) return true

  // Long sentence forgiveness: if 60%+ of words matched, even if total ratio is below
  // (handles cases where child added filler words)
  if (totalMatches >= targetWords.length * 0.5) return true

  return false
}

/**
 * Generic matcher — auto-detects word vs sentence by space count.
 */
export function matchTranscript(transcript: string, target: string, type?: 'word' | 'sentence'): boolean {
  const kind = type ?? (target.trim().split(/\s+/).length === 1 ? 'word' : 'sentence')
  return kind === 'word' ? matchWord(transcript, target) : matchSentence(transcript, target)
}
