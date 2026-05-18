'use client'

type Mood = 'happy' | 'excited' | 'tryagain'

const SRC: Record<Mood, string> = {
  happy: '/videos/fox-happy-pp.mp4',
  excited: '/videos/fox-excited-pp.mp4',
  tryagain: '/videos/fox-tryagain-pp.mp4',
}

export default function AnimatedFox({
  mood = 'happy',
  size = 220,
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
        // Radial gradient mask — fades video edges into background
        WebkitMaskImage: 'radial-gradient(circle, black 55%, transparent 75%)',
        maskImage: 'radial-gradient(circle, black 55%, transparent 75%)',
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
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  )
}
