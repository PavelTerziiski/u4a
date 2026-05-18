'use client'

type Mood = 'happy' | 'excited' | 'tryagain'

const SRC: Record<Mood, string> = {
  happy: '/videos/fox-happy-pp.mp4',
  excited: '/videos/fox-excited-pp.mp4',
  tryagain: '/videos/fox-tryagain-pp.mp4',
}

export default function AnimatedFox({
  mood = 'happy',
  size = 240,
}: {
  mood?: Mood
  size?: number
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        position: 'relative',
        WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 70%)',
        maskImage: 'radial-gradient(circle at center, black 40%, transparent 70%)',
      }}
    >
      <video
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
          objectPosition: 'center 30%',
          display: 'block',
        }}
      />
    </div>
  )
}
