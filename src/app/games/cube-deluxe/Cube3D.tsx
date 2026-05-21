'use client'
import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function RotatingCube({ color1, color2, isRevealed, isShaking }: {
  color1: string; color2: string; isRevealed: boolean; isShaking: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const targetRotY = useRef(0)

  useFrame((state, delta) => {
    if (!meshRef.current) return
    targetRotY.current = isRevealed ? Math.PI : 0
    meshRef.current.rotation.y += (targetRotY.current - meshRef.current.rotation.y) * 0.15
    if (!isRevealed) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.08
    } else {
      meshRef.current.rotation.x += (0 - meshRef.current.rotation.x) * 0.15
    }
    if (isShaking) {
      meshRef.current.position.x = Math.sin(state.clock.elapsedTime * 60) * 0.05
    } else {
      meshRef.current.position.x += (0 - meshRef.current.position.x) * 0.2
    }
  })

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <boxGeometry args={[1.7, 1.7, 0.5]} />
      <meshStandardMaterial color={color1} metalness={0.2} roughness={0.4} />
      <mesh position={[0, 0, 0.251]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshStandardMaterial color={color2} emissive={color2} emissiveIntensity={0.15} />
      </mesh>
    </mesh>
  )
}

export default function Cube3D({ color1, color2, isRevealed, isShaking }: {
  color1: string; color2: string; isRevealed: boolean; isShaking: boolean
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 35 }}
      shadows
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 5]} intensity={1.2} castShadow />
      <pointLight position={[-3, -3, 3]} intensity={0.4} color="#FACC15" />
      <RotatingCube color1={color1} color2={color2} isRevealed={isRevealed} isShaking={isShaking} />
    </Canvas>
  )
}
