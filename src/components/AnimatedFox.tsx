'use client'

type Mood = 'happy' | 'excited' | 'tryagain'

const SRC: Record<Mood, string> = {
  happy: '/videos/fox-happy-pp.mp4',
  excited: '/videos/fox-excited-pp.mp4',
  tryagain: '/videos/fox-tryagain-pp.mp4',
}

export default function AnimatedFox({
  mood = 'happy',
  size = 260,
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
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          WebkitMaskImage: 'radial-gradient(circle at center, black 70%, transparent 100%)',
          maskImage: 'radial-gradient(circle at center, black 70%, transparent 100%)',
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
            objectPosition: 'center top',
            display: 'block',
          }}
        />
      </div>
    </div>
  )
}
