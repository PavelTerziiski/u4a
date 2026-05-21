'use client'
import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { Text, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

type CubeItem = {
  type: 'word' | 'sentence_easy' | 'sentence_hard' | 'mystery'
  text: string
  points: number
  emoji: string
}

interface SceneCubeProps {
  position: [number, number, number]
  color1: string
  color2: string
  item: CubeItem
  isRevealed: boolean
  isShaking: boolean
  onClick: () => void
}

function SceneCube({ position, color1, color2, item, isRevealed, isShaking, onClick }: SceneCubeProps) {
  const groupRef = useRef<THREE.Group>(null)
  const targetRotY = useRef(0)
  const hover = useRef(false)
  const initialDelay = useRef(Math.random() * 0.5)
  const entryDone = useRef(false)
  const entryTime = useRef(0)

  useFrame((state) => {
    if (!groupRef.current) return
    const g = groupRef.current
    const t = state.clock.elapsedTime

    // Entry animation: pop in from scale 0
    if (!entryDone.current) {
      entryTime.current += 0.016
      const localT = Math.max(0, entryTime.current - initialDelay.current)
      const progress = Math.min(localT * 2, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const scale = eased * (1 + Math.sin(progress * Math.PI) * 0.15)
      g.scale.set(scale, scale, scale)
      if (progress >= 1) {
        entryDone.current = true
        g.scale.set(1, 1, 1)
      }
      return
    }

    // Reveal flip
    targetRotY.current = isRevealed ? Math.PI : 0
    g.rotation.y += (targetRotY.current - g.rotation.y) * 0.12

    // Idle wobble (only when not revealed)
    if (!isRevealed) {
      g.rotation.x = Math.sin(t * 0.7 + position[0]) * 0.06
      g.position.y = position[1] + Math.sin(t * 1.2 + position[0] * 2) * 0.03
    } else {
      g.rotation.x += (0 - g.rotation.x) * 0.1
      g.position.y += (position[1] - g.position.y) * 0.1
    }

    // Shake
    if (isShaking) {
      g.position.x = position[0] + Math.sin(t * 80) * 0.08
    } else {
      g.position.x += (position[0] - g.position.x) * 0.2
    }

    // Hover scale up
    const targetScale = hover.current && !isRevealed ? 1.08 : 1
    g.scale.x += (targetScale - g.scale.x) * 0.15
    g.scale.y += (targetScale - g.scale.y) * 0.15
    g.scale.z += (targetScale - g.scale.z) * 0.15
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (!isRevealed) onClick()
  }

  const handlePointerOver = () => { hover.current = true; document.body.style.cursor = 'pointer' }
  const handlePointerOut = () => { hover.current = false; document.body.style.cursor = 'default' }

  // For revealed back face, choose font size based on text length
  const isWord = item.type === 'word'
  const textLen = item.text.length
  const fontSize = isWord
    ? (textLen > 8 ? 0.18 : 0.24)
    : 0.11

  return (
    <group
      ref={groupRef}
      position={position}
      scale={0}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Outer rounded box with gradient-like material */}
      <RoundedBox args={[1.5, 1.5, 0.5]} radius={0.12} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial
          color={color1}
          metalness={0.15}
          roughness={0.35}
        />
      </RoundedBox>

      {/* Front face - question mark */}
      <group position={[0, 0, 0.255]}>
        <RoundedBox args={[1.35, 1.35, 0.02]} radius={0.08} smoothness={4}>
          <meshStandardMaterial
            color={color2}
            emissive={color2}
            emissiveIntensity={0.2}
            metalness={0.1}
            roughness={0.4}
          />
        </RoundedBox>
        <Text
          position={[0, 0, 0.02]}
          fontSize={0.7}
          color="white"
          anchorX="center"
          anchorY="middle"
          fontWeight={900}
          outlineWidth={0.02}
          outlineColor="rgba(0,0,0,0.3)"
        >
          ?
        </Text>
      </group>

      {/* Back face - word + points (visible after flip) */}
      <group position={[0, 0, -0.255]} rotation={[0, Math.PI, 0]}>
        <RoundedBox args={[1.35, 1.35, 0.02]} radius={0.08} smoothness={4}>
          <meshStandardMaterial color="#FFFBEB" metalness={0} roughness={0.6} />
        </RoundedBox>
        <Text
          position={[0, 0.1, 0.02]}
          fontSize={fontSize}
          color="#78350F"
          anchorX="center"
          anchorY="middle"
          fontWeight={900}
          maxWidth={1.2}
          textAlign="center"
          font="/fonts/Nunito-Black.ttf"
        >
          {item.text}
        </Text>
        <Text
          position={[0, -0.45, 0.02]}
          fontSize={0.18}
          color="#EAB308"
          anchorX="center"
          anchorY="middle"
          fontWeight={900}
        >
          +{item.points}
        </Text>
      </group>
    </group>
  )
}

interface CubeSceneProps {
  items: CubeItem[]
  tileColors: string[][]
  revealed: boolean[]
  shakingIdx: number | null
  onTileClick: (i: number) => void
}

export default function CubeScene({ items, tileColors, revealed, shakingIdx, onTileClick }: CubeSceneProps) {
  // 3x3 grid positions (col -1,0,1 × row -1,0,1 with row inverted for top-to-bottom visual order)
  const positions: [number, number, number][] = useMemo(() => {
    const arr: [number, number, number][] = []
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        arr.push([(c - 1) * 1.8, (1 - r) * 1.8, 0])
      }
    }
    return arr
  }, [])

  return (
    <Canvas
      shadows
      camera={{ position: [0, 0, 6.5], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%', touchAction: 'manipulation' }}
    >
      <color attach="background" args={['#00000000']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 6]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-4, -3, 4]} intensity={0.6} color="#FACC15" />
      <pointLight position={[4, 4, 2]} intensity={0.3} color="#A78BFA" />

      <Suspense fallback={null}>
        {items.map((item, i) => (
          <SceneCube
            key={i}
            position={positions[i]}
            color1={tileColors[i]?.[0] || '#9CA3AF'}
            color2={tileColors[i]?.[1] || '#6B7280'}
            item={item}
            isRevealed={revealed[i]}
            isShaking={shakingIdx === i}
            onClick={() => onTileClick(i)}
          />
        ))}
      </Suspense>
    </Canvas>
  )
}
