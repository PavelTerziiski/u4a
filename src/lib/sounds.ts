'use client'

export const SOUNDS = {
  correct: { src: '/sounds/correct.mp3', volume: 0.5 },
  wrong:   { src: '/sounds/wrong.mp3',   volume: 0.45 },
  click:   { src: '/sounds/click.mp3',   volume: 0.4 },
  finish:  { src: '/sounds/finish.mp3',  volume: 0.35 },
  tickle1: { src: '/sounds/tickle1.mp3', volume: 0.5 },
  tickle2: { src: '/sounds/tickle2.mp3', volume: 0.5 },
  tickle3: { src: '/sounds/tickle3.mp3', volume: 0.5 },
  tickle4: { src: '/sounds/tickle4.mp3', volume: 0.5 },
  'cube-break':    { src: '/sounds/cube-break.mp3',    volume: 0.5 },
  'cube-open':     { src: '/sounds/cube-open.mp3',     volume: 0.5 },
  'coin-collect':  { src: '/sounds/coin-collect.mp3',  volume: 0.55 },
} as const

export type SoundName = keyof typeof SOUNDS

// --- HTML Audio fallback (Android, и където няма AudioContext) ---
const audioCache: Partial<Record<SoundName, HTMLAudioElement>> = {}

export function playSound(name: SoundName) {
  if (typeof window === 'undefined') return
  try {
    let audio = audioCache[name]
    if (!audio) {
      audio = new Audio(SOUNDS[name].src)
      audio.volume = SOUNDS[name].volume
      audioCache[name] = audio
    }
    audio.currentTime = 0
    audio.play().catch(() => {})
  } catch {}
}

// --- Web Audio API (iOS Safari работи когато TTS вече е bud-нал AudioContext) ---
const bufferCache: Partial<Record<SoundName, AudioBuffer>> = {}

async function getBuffer(ctx: AudioContext, name: SoundName): Promise<AudioBuffer | null> {
  if (bufferCache[name]) return bufferCache[name]!
  try {
    const res = await fetch(SOUNDS[name].src)
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(arrayBuffer, resolve, reject)
    })
    bufferCache[name] = decoded
    return decoded
  } catch {
    return null
  }
}

export async function playSoundViaContext(ctx: AudioContext | null, name: SoundName) {
  if (!ctx) { playSound(name); return }
  try {
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {})
    }
    const buffer = await getBuffer(ctx, name)
    if (!buffer) { playSound(name); return }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const gain = ctx.createGain()
    gain.gain.value = SOUNDS[name].volume
    source.connect(gain)
    gain.connect(ctx.destination)
    source.start(0)
  } catch {
    playSound(name)
  }
}


// Random tickle — пуска един от 4-те варианта произволно
export function playTickle() {
  const variants: SoundName[] = ['tickle1', 'tickle2', 'tickle3', 'tickle4']
  const pick = variants[Math.floor(Math.random() * variants.length)]
  playSound(pick)
}

export function useSound() {
  return { play: playSound }
}
