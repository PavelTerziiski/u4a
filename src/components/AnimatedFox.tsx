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
        borderRadius: '50%',
        overflow: 'hidden',
        boxShadow: '0 0 60px 20px #FEF3E7',
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
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          height: '100%',
          width: 'auto',
          minWidth: '100%',
          display: 'block',
        }}
      />
    </div>
  )
}
