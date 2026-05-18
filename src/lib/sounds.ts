'use client'

// SOUND CONFIG — за смяна на звук просто замени файла в /public/sounds/
// със същото име. Volume е 0-1 (1 = пълно).
export const SOUNDS = {
  correct: { src: '/sounds/correct.mp3', volume: 0.7 },
  wrong:   { src: '/sounds/wrong.mp3',   volume: 0.6 },
  click:   { src: '/sounds/click.mp3',   volume: 0.5 },
  finish:  { src: '/sounds/finish.mp3',  volume: 0.8 },
} as const

export type SoundName = keyof typeof SOUNDS

const audioCache: Partial<Record<SoundName, HTMLAudioElement>> = {}

export function playSound(name: SoundName) {
  if (typeof window === 'undefined') return
  try {
    const cfg = SOUNDS[name]
    let audio = audioCache[name]
    if (!audio) {
      audio = new Audio(cfg.src)
      audio.volume = cfg.volume
      audioCache[name] = audio
    }
    audio.currentTime = 0
    audio.play().catch(() => {})
  } catch {
    // тихо игнорираме ако файлът липсва
  }
}

export function useSound() {
  return { play: playSound }
}
