'use client'

type Mood = 'happy' | 'excited' | 'tryagain'

const SRC: Record<Mood, string> = {
  happy: '/videos/fox-happy.mp4',
  excited: '/videos/fox-excited.mp4',
  tryagain: '/videos/fox-tryagain.mp4',
}

export default function AnimatedFox({
  mood = 'happy',
  size = 180,
}: {
  mood?: Mood
  size?: number
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: '#FEF3E7',
        display: 'inline-block',
        position: 'relative',
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
          display: 'block',
        }}
      />
    </div>
  )
}
