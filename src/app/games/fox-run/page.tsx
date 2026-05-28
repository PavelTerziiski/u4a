'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as THREE from 'three'

export default function FoxRunPage() {
  const mountRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!mountRef.current) return
    const container = mountRef.current

    // --- RENDERER ---
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)

    // --- SCENE ---
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a1a0a)
    scene.fog = new THREE.FogExp2(0x0a1a0a, 0.035)

    // --- CAMERA ---
    const camera = new THREE.PerspectiveCamera(
      70,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    )
    camera.position.set(0, 3.5, 7)
    camera.lookAt(0, 1, 0)

    // --- LIGHTS ---
    const ambient = new THREE.AmbientLight(0x334422, 1.5)
    scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xffdd88, 2.5)
    sun.position.set(10, 20, 10)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 100
    sun.shadow.camera.left = -20
    sun.shadow.camera.right = 20
    sun.shadow.camera.top = 20
    sun.shadow.camera.bottom = -20
    scene.add(sun)

    const rimLight = new THREE.DirectionalLight(0x2244ff, 0.8)
    rimLight.position.set(-10, 5, -10)
    scene.add(rimLight)

    // --- PATH ---
    const LANE_WIDTH = 1.5
    const PATH_WIDTH = LANE_WIDTH * 3
    const SEGMENT_LENGTH = 12
    const NUM_SEGMENTS = 20

    const pathMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a })
    const segments: THREE.Mesh[] = []

    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const geo = new THREE.BoxGeometry(PATH_WIDTH, 0.2, SEGMENT_LENGTH)
      const seg = new THREE.Mesh(geo, pathMat)
      seg.position.set(0, -0.1, -i * SEGMENT_LENGTH)
      seg.receiveShadow = true
      scene.add(seg)
      segments.push(seg)
    }

    // --- LANE LINES ---
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x8a6a3a })
    for (let lane = -1; lane <= 1; lane++) {
      for (let i = 0; i < NUM_SEGMENTS; i++) {
        const geo = new THREE.BoxGeometry(0.05, 0.01, SEGMENT_LENGTH * 0.7)
        const line = new THREE.Mesh(geo, lineMat)
        line.position.set(lane * LANE_WIDTH, 0.01, -i * SEGMENT_LENGTH)
        scene.add(line)
      }
    }

    // --- TREES ---
    function makeTree(x: number, z: number) {
      const g = new THREE.Group()
      const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, 2, 6)
      const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3d2010 })
      const trunk = new THREE.Mesh(trunkGeo, trunkMat)
      trunk.position.y = 1
      trunk.castShadow = true
      g.add(trunk)
      const colors = [0x1a4a10, 0x1e5c14, 0x245c18, 0x2d6e1e]
      const col = colors[Math.floor(Math.random() * colors.length)]
      const leafMat = new THREE.MeshLambertMaterial({ color: col })
      for (let l = 0; l < 3; l++) {
        const r = 1.2 - l * 0.25
        const leafGeo = new THREE.ConeGeometry(r, 1.5, 7)
        const leaf = new THREE.Mesh(leafGeo, leafMat)
        leaf.position.y = 2 + l * 1.1
        leaf.castShadow = true
        g.add(leaf)
      }
      g.position.set(x, 0, z)
      scene.add(g)
      return g
    }

    const trees: THREE.Group[] = []
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const z = -i * SEGMENT_LENGTH - 4
      trees.push(makeTree(-PATH_WIDTH / 2 - 1.5 - Math.random() * 3, z))
      trees.push(makeTree(PATH_WIDTH / 2 + 1.5 + Math.random() * 3, z))
      if (Math.random() > 0.5) {
        trees.push(makeTree(-PATH_WIDTH / 2 - 4 - Math.random() * 4, z - 3))
        trees.push(makeTree(PATH_WIDTH / 2 + 4 + Math.random() * 4, z - 3))
      }
    }

    // --- FOX (capsule placeholder) ---
    const foxGroup = new THREE.Group()
    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.7, 8, 16)
    const foxMat = new THREE.MeshLambertMaterial({ color: 0xe8621a })
    const body = new THREE.Mesh(bodyGeo, foxMat)
    body.position.y = 0.7
    body.castShadow = true
    foxGroup.add(body)
    // Head
    const headGeo = new THREE.SphereGeometry(0.28, 12, 12)
    const head = new THREE.Mesh(headGeo, foxMat)
    head.position.set(0, 1.55, 0.2)
    head.castShadow = true
    foxGroup.add(head)
    // Ears
    const earMat = new THREE.MeshLambertMaterial({ color: 0xd04a10 })
    const earGeo = new THREE.ConeGeometry(0.1, 0.25, 4)
    const earL = new THREE.Mesh(earGeo, earMat)
    earL.position.set(-0.15, 1.85, 0.1)
    earL.rotation.z = -0.3
    foxGroup.add(earL)
    const earR = earL.clone()
    earR.position.set(0.15, 1.85, 0.1)
    earR.rotation.z = 0.3
    foxGroup.add(earR)
    // Tail
    const tailGeo = new THREE.CapsuleGeometry(0.12, 0.5, 6, 8)
    const tailMat = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 })
    const tail = new THREE.Mesh(tailGeo, tailMat)
    tail.position.set(0, 0.6, -0.55)
    tail.rotation.x = 0.8
    foxGroup.add(tail)

    scene.add(foxGroup)

    // --- PARTICLES (fireflies) ---
    const particleCount = 120
    const particleGeo = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = Math.random() * 6 + 0.5
      positions[i * 3 + 2] = -Math.random() * 80
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particleMat = new THREE.PointsMaterial({
      color: 0xffff88,
      size: 0.08,
      transparent: true,
      opacity: 0.7,
    })
    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    // --- GAME STATE ---
    const state = {
      speed: 12,
      foxZ: 0,
      currentLane: 0,  // -1, 0, 1
      targetX: 0,
      isJumping: false,
      jumpVelocity: 0,
      foxY: 0,
      runTime: 0,
    }

    const JUMP_FORCE = 8
    const GRAVITY = -20

    // --- INPUT ---
    const keys: Record<string, boolean> = {}
    let laneChangeCooldown = 0

    function handleKey(e: KeyboardEvent) {
      if (e.type === 'keydown') keys[e.code] = true
      if (e.type === 'keyup') keys[e.code] = false
    }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('keyup', handleKey)

    // Touch / swipe
    let touchStartX = 0
    let touchStartY = 0
    function onTouchStart(e: TouchEvent) {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
    }
    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - touchStartX
      const dy = e.changedTouches[0].clientY - touchStartY
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 40) moveLane(1)
        else if (dx < -40) moveLane(-1)
      } else {
        if (dy < -40) jump()
      }
    }
    container.addEventListener('touchstart', onTouchStart)
    container.addEventListener('touchend', onTouchEnd)

    function moveLane(dir: number) {
      if (laneChangeCooldown > 0) return
      const newLane = Math.max(-1, Math.min(1, state.currentLane + dir))
      if (newLane !== state.currentLane) {
        state.currentLane = newLane
        state.targetX = newLane * LANE_WIDTH
        laneChangeCooldown = 0.25
      }
    }

    function jump() {
      if (!state.isJumping) {
        state.isJumping = true
        state.jumpVelocity = JUMP_FORCE
      }
    }

    // --- ANIMATION LOOP ---
    let lastTime = performance.now()
    let animId: number

    function animate() {
      animId = requestAnimationFrame(animate)
      const now = performance.now()
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      state.runTime += dt
      state.speed = 12 + state.runTime * 0.3
      if (laneChangeCooldown > 0) laneChangeCooldown -= dt

      // Input
      if (keys['ArrowLeft']) moveLane(-1)
      if (keys['ArrowRight']) moveLane(1)
      if (keys['ArrowUp'] || keys['Space']) jump()

      // Fox X (lane lerp)
      foxGroup.position.x += (state.targetX - foxGroup.position.x) * dt * 10

      // Fox jump
      if (state.isJumping) {
        state.jumpVelocity += GRAVITY * dt
        state.foxY += state.jumpVelocity * dt
        if (state.foxY <= 0) {
          state.foxY = 0
          state.isJumping = false
          state.jumpVelocity = 0
        }
      }
      foxGroup.position.y = state.foxY

      // Run bob
      const bob = Math.sin(state.runTime * 12) * 0.06
      foxGroup.position.y += bob
      const tilt = (state.targetX - foxGroup.position.x) * 0.3
      foxGroup.rotation.z = -tilt * 0.4
      foxGroup.rotation.y = tilt * 0.2

      // Tail wag
      if (foxGroup.children[3]) {
        foxGroup.children[3].rotation.z = Math.sin(state.runTime * 8) * 0.3
      }

      // Move world (path + trees scroll toward player)
      const moveZ = state.speed * dt
      segments.forEach(seg => {
        seg.position.z += moveZ
        if (seg.position.z > SEGMENT_LENGTH) {
          seg.position.z -= NUM_SEGMENTS * SEGMENT_LENGTH
        }
      })
      trees.forEach(tree => {
        tree.position.z += moveZ
        if (tree.position.z > 8) {
          const side = tree.position.x > 0 ? 1 : -1
          tree.position.z -= NUM_SEGMENTS * SEGMENT_LENGTH
          tree.position.x = side * (PATH_WIDTH / 2 + 1.5 + Math.random() * 4)
        }
      })

      // Particles
      const pos = particles.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3 + 2] += moveZ * 0.3
        if (pos[i * 3 + 2] > 8) pos[i * 3 + 2] -= 80
      }
      particles.geometry.attributes.position.needsUpdate = true
      particleMat.opacity = 0.4 + Math.sin(state.runTime * 2) * 0.3

      // Camera follow
      camera.position.x += (foxGroup.position.x * 0.3 - camera.position.x) * dt * 5
      camera.lookAt(foxGroup.position.x * 0.5, 1.5, foxGroup.position.z - 4)

      renderer.render(scene, camera)
    }

    animate()

    // Resize
    function onResize() {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('keyup', handleKey)
      window.removeEventListener('resize', onResize)
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchend', onTouchEnd)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Back button */}
      <button
        onClick={() => router.push('/games')}
        className="absolute top-4 left-4 z-10 bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border border-white/20 hover:bg-black/70 transition-all"
      >
        ← Назад
      </button>

      {/* Controls hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-3 text-white/50 text-xs">
        <span>← → смяна на лента</span>
        <span>·</span>
        <span>↑ / Space скок</span>
      </div>

      {/* Speed indicator */}
      <div className="absolute top-4 right-4 z-10 text-white/60 text-sm font-mono">
        🦊 Fox Run
      </div>

      <div ref={mountRef} className="w-full h-full" />
    </div>
  )
}
