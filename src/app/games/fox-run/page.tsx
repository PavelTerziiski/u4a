'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const WORDS = [
  // Животни
  'КОН','КОТ','МЕЧ','РАК','ВОЛ','ЛЪВ','КУЧЕ','КОТКА','КОЗА','РИБА',
  'ПИЛЕ','ЗАЕК','СЛОН','ТИГЪР','ЖИРАФ','МАЙМУНА','ЛИСИЦА','МИШКА',
  'ВЪЛК','ОРЕЛ','ЛЕБЕД','ЩЪРКЕЛ','КАТЕРИЦА','ПАЯК','МЕЧО',
  // Природа
  'ДЪЖД','СНЯГ','ГОРА','ПОЛЕ','МОРЕ','РЕКА','ЕЗЕРО','СЛЪНЦЕ','ОБЛАК',
  'ВЯТЪР','КАМЪК','ЦВЕТЕ','ДЪРВО','ЛИСТО','КОРЕН','КЛОН','ЗЕМЯ',
  'ПЯСЪК','ВЪЛНА','ПЛАНИНА','ДОЛИНА','ПОТОК','МЪГЛА','ГРЪМ','ГРАДУШКА','КАЛ',
  // Храна
  'ХЛЯБ','МЛЯКО','ЯЙЦЕ','МЕД','МАСЛО','СИРЕНЕ','ТОРТА','ЯБЪЛКА',
  'КРУША','ГРОЗДЕ','ДИНЯ','ТИКВА','МОРКОВ','БОЗА','КАШКАВАЛ',
  'БАНИЦА','СУПА','ПИЦА','САЛАТА','ШОКОЛАД','БИСКВИТА','СЛАДКО','КОМПОТ',
  // Дом
  'СТОЛ','МАСА','ВРАТА','ПРОЗОРЕЦ','ПОКРИВ','СТЕНА','ПОД','ЛЕГЛО',
  'ДИВАН','ЛАМПА','ОГЛЕДАЛО','КИЛИМ','КУХНЯ','БАНЯ','ДВОР','ПОРТА','БАЛКОН',
  // Училище
  'МОЛИВ','ТЕТРАДКА','КНИГА','ЛИНИЯ','ГУМИЧКА','РАНИЦА','УЧИТЕЛ',
  'КЛАС','ДЪСКА','ЗВЪНЕЦ','УРОК','ЗАДАЧА','БУКВА','ЧИСЛО','ДУМА','ОЦЕНКА',
  // Тяло
  'РЪКА','КРАК','НОС','УХО','ОКО','ЗЪБИ','КОСА','ГРЪБ','КОРЕМ','СЪРЦЕ',
  // Дрехи
  'РИЗА','ПАНТАЛОН','РОКЛЯ','ШАПКА','ОБУВКИ','ЧОРАПИ','ШАЛ','ПАЛТО','ЯКЕ','ПОЛА','БЛУЗА','ПРЕСТИЛКА','РЪКАВИЦА',
]
for (let i = WORDS.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [WORDS[i], WORDS[j]] = [WORDS[j], WORDS[i]]
}

export default function FoxRunPage() {
  const mountRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [targetWord, setTargetWord] = useState('')
  const [collected, setCollected] = useState<(string|null)[]>([])
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [lives, setLives] = useState(3)

  const gameRef = useRef<{
    targetWord: string
    collected: string[]
    collectedIndices?: Set<number>
    score: number
    lives: number
    dead: boolean
  }>({ targetWord: '', collected: [], score: 0, lives: 3, dead: false })

  useEffect(() => {
    if (!mountRef.current) return
    const container = mountRef.current

    // Pick first word
    const firstWord = WORDS[Math.floor(Math.random() * WORDS.length)]
    gameRef.current.targetWord = firstWord
    setTargetWord(firstWord)

    // --- RENDERER ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.outputColorSpace = THREE.SRGBColorSpace
    // --- МУЗИКА ---
    const musicTracks = ['/sounds/fox-run-music-1.mp3', '/sounds/fox-run-music-2.mp3']
    const music = new Audio(musicTracks[Math.floor(Math.random() * musicTracks.length)])
    music.loop = true
    music.volume = 0.35
    // Autoplay при първи user gesture
    const startMusic = () => {
      music.play().catch(() => {})
      window.removeEventListener('keydown', startMusic)
      window.removeEventListener('click', startMusic)
      container.removeEventListener('touchstart', startMusic)
    }
    window.addEventListener('keydown', startMusic)
    window.addEventListener('click', startMusic)
    container.addEventListener('touchstart', startMusic)

    renderer.domElement.setAttribute('tabindex', '0')
    renderer.domElement.style.outline = 'none'
    renderer.domElement.setAttribute('tabindex', '0')
    renderer.domElement.style.outline = 'none'
    container.appendChild(renderer.domElement)
    renderer.domElement.focus()
    renderer.domElement.focus()

    // --- SCENE ---
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x87CEEB)
    scene.fog = new THREE.Fog(0x87CEEB, 40, 120)

    // --- CAMERA ---
    const camera = new THREE.PerspectiveCamera(
      75, container.clientWidth / container.clientHeight, 0.1, 200
    )
    camera.position.set(0, 6.5, 9)
    camera.lookAt(0, 1.5, -4)

    // --- LIGHTS ---
    scene.add(new THREE.AmbientLight(0xffeedd, 0.4))
    const sun = new THREE.DirectionalLight(0xfffbe0, 2.5)
    sun.position.set(8, 18, 8)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -25
    sun.shadow.camera.right = 25
    sun.shadow.camera.top = 25
    sun.shadow.camera.bottom = -25
    scene.add(sun)
    const rim = new THREE.DirectionalLight(0xaaccff, 2.5)
    rim.position.set(-12, 6, -8)
    scene.add(rim)
    const fill = new THREE.PointLight(0x44ff88, 1.5, 30)
    fill.position.set(0, 5, -10)
    scene.add(fill)

    // --- CONSTANTS ---
    const LANE_WIDTH = 2.2
    const PATH_WIDTH = LANE_WIDTH * 3
    const SEGMENT_LENGTH = 14
    const NUM_SEGMENTS = 22

    // --- PATH ---
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0e, roughness: 0.9, metalness: 0 })
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.9, metalness: 0 })
    const segments: THREE.Mesh[] = []

    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const geo = new THREE.BoxGeometry(PATH_WIDTH, 0.25, SEGMENT_LENGTH)
      const seg = new THREE.Mesh(geo, pathMat)
      seg.position.set(0, -0.12, -i * SEGMENT_LENGTH)
      seg.receiveShadow = true
      scene.add(seg)
      segments.push(seg)
      // Edge left
      const eL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, SEGMENT_LENGTH), edgeMat)
      eL.position.set(-PATH_WIDTH / 2 - 0.15, -0.05, -i * SEGMENT_LENGTH)
      scene.add(eL)
      const eR = eL.clone()
      eR.position.set(PATH_WIDTH / 2 + 0.15, -0.05, -i * SEGMENT_LENGTH)
      scene.add(eR)
    }

    // --- GRASS ---
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x3a8c3a, roughness: 0.8, metalness: 0 })
    const grassSegments: THREE.Mesh[] = []
    const grassWidth = 6
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const geoG = new THREE.PlaneGeometry(grassWidth, SEGMENT_LENGTH)
      const gL = new THREE.Mesh(geoG, grassMat)
      gL.rotation.x = -Math.PI / 2
      gL.position.set(-(PATH_WIDTH / 2 + 0.15 + grassWidth / 2), 0, -i * SEGMENT_LENGTH)
      gL.receiveShadow = true
      scene.add(gL)
      grassSegments.push(gL)
      const gR = new THREE.Mesh(geoG, grassMat)
      gR.rotation.x = -Math.PI / 2
      gR.position.set(PATH_WIDTH / 2 + 0.15 + grassWidth / 2, 0, -i * SEGMENT_LENGTH)
      gR.receiveShadow = true
      scene.add(gR)
      grassSegments.push(gR)
    }

    // Dashed lane lines
    const dashMat = new THREE.MeshBasicMaterial({ color: 0x6a4a2a, transparent: true, opacity: 0.6 })
    for (let lane = -1; lane <= 1; lane++) {
      for (let i = 0; i < NUM_SEGMENTS * 4; i++) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 1.2), dashMat)
        dash.position.set(lane * LANE_WIDTH, 0.02, -i * 3.5)
        scene.add(dash)
      }
    }

    // --- TREES & FLOWERS ---
    function makePineTree(x: number, z: number, scale = 1) {
      const g = new THREE.Group()
      const trunkH = (1.8 + Math.random() * 1.2) * scale
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12 * scale, 0.2 * scale, trunkH, 6),
        new THREE.MeshStandardMaterial({ color: 0x2d1508, roughness: 0.85, metalness: 0 })
      )
      trunk.position.y = trunkH / 2; trunk.castShadow = true; g.add(trunk)
      const greens = [0x0d3a08, 0x124a0c, 0x1a5c12, 0x0f4510]
      const leafMat = new THREE.MeshStandardMaterial({ color: greens[Math.floor(Math.random() * greens.length)], roughness: 0.85, metalness: 0 })
      const layers = 3 + Math.floor(Math.random() * 2)
      for (let l = 0; l < layers; l++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry((1.4 - l * 0.22) * scale, 1.8 * scale, 7), leafMat)
        cone.position.y = trunkH + l * 1.2 * scale; cone.castShadow = true; g.add(cone)
      }
      g.position.set(x, 0, z); scene.add(g); return g
    }

    function makeBroadleafTree(x: number, z: number, scale = 1) {
      const g = new THREE.Group()
      const trunkH = (1.5 + Math.random() * 1.0) * scale
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14 * scale, 0.22 * scale, trunkH, 7),
        new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.85, metalness: 0 })
      )
      trunk.position.y = trunkH / 2; trunk.castShadow = true; g.add(trunk)
      const crownR = (1.3 + Math.random() * 0.5) * scale
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(crownR, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.85, metalness: 0 })
      )
      crown.position.y = trunkH + crownR * 0.8; crown.castShadow = true; g.add(crown)
      g.position.set(x, 0, z); scene.add(g); return g
    }

    function makeFruitTree(x: number, z: number, scale = 1) {
      const g = new THREE.Group()
      const trunkH = (1.2 + Math.random() * 0.8) * scale
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1 * scale, 0.18 * scale, trunkH, 6),
        new THREE.MeshStandardMaterial({ color: 0x4a2506, roughness: 0.85, metalness: 0 })
      )
      trunk.position.y = trunkH / 2; trunk.castShadow = true; g.add(trunk)
      const crownR = (1.0 + Math.random() * 0.4) * scale
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(crownR, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.85, metalness: 0 })
      )
      crown.position.y = trunkH + crownR * 0.85; crown.castShadow = true; g.add(crown)
      const fruitMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.7, metalness: 0 })
      const fruitCount = 5 + Math.floor(Math.random() * 4)
      for (let f = 0; f < fruitCount; f++) {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.random() * Math.PI
        const fr = crownR * (0.7 + Math.random() * 0.3)
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.1 * scale, 5, 5), fruitMat)
        fruit.position.set(
          Math.sin(phi) * Math.cos(theta) * fr,
          crown.position.y + Math.cos(phi) * fr * 0.5,
          Math.sin(phi) * Math.sin(theta) * fr
        )
        g.add(fruit)
      }
      g.position.set(x, 0, z); scene.add(g); return g
    }

    function makeRandomTree(x: number, z: number, scale = 1) {
      const t = Math.floor(Math.random() * 3)
      if (t === 0) return makePineTree(x, z, scale)
      if (t === 1) return makeBroadleafTree(x, z, scale)
      return makeFruitTree(x, z, scale)
    }

    const trees: THREE.Group[] = []
    const flowers: THREE.Group[] = []

    // Spawn 70% procedural trees immediately; Kenney 30% + all flowers loaded async
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const z = -i * SEGMENT_LENGTH - 4
      const spread = 3 + Math.random() * 4
      if (Math.random() > 0.3) trees.push(makeRandomTree(-(PATH_WIDTH / 2 + 1.2 + spread), z, 0.7 + Math.random() * 0.7))
      if (Math.random() > 0.3) trees.push(makeRandomTree(PATH_WIDTH / 2 + 1.2 + spread, z, 0.7 + Math.random() * 0.7))
      if (Math.random() > 0.4) {
        if (Math.random() > 0.3) trees.push(makeRandomTree(-(PATH_WIDTH / 2 + 4 + Math.random() * 5), z - 5, 0.7 + Math.random() * 0.7))
        if (Math.random() > 0.3) trees.push(makeRandomTree(PATH_WIDTH / 2 + 4 + Math.random() * 5, z - 5, 0.7 + Math.random() * 0.7))
      }
    }

    ;(async () => {
      const natureLoader = new GLTFLoader()
      const loadGLTF = (url: string): Promise<THREE.Group> =>
        new Promise((resolve, reject) =>
          natureLoader.load(url, gltf => {
            gltf.scene.traverse(child => {
              const m = child as THREE.Mesh
              if (m.isMesh) { m.castShadow = true; m.receiveShadow = true }
            })
            resolve(gltf.scene)
          }, undefined, reject)
        )
      try {
        const [pine, oak, def, shroom, flower, stump] = await Promise.all([
          loadGLTF('/models/tree_pine.glb'),
          loadGLTF('/models/tree_oak.glb'),
          loadGLTF('/models/tree_default.glb'),
          loadGLTF('/models/mushroom_red.glb'),
          loadGLTF('/models/flower_purpleA.glb'),
          loadGLTF('/models/stump.glb'),
        ])
        const treeSrcs = [pine, oak, def]

        // 30% Kenney trees
        for (let i = 0; i < NUM_SEGMENTS; i++) {
          const z = -i * SEGMENT_LENGTH - 4
          const spread = 3 + Math.random() * 4
          if (Math.random() < 0.3) {
            const g = treeSrcs[Math.floor(Math.random() * treeSrcs.length)].clone()
            g.scale.setScalar(1.5 + Math.random() * 0.8)
            g.position.set(-(PATH_WIDTH / 2 + 1.2 + spread), 0, z)
            scene.add(g); trees.push(g)
          }
          if (Math.random() < 0.3) {
            const g = treeSrcs[Math.floor(Math.random() * treeSrcs.length)].clone()
            g.scale.setScalar(1.5 + Math.random() * 0.8)
            g.position.set(PATH_WIDTH / 2 + 1.2 + spread, 0, z)
            scene.add(g); trees.push(g)
          }
        }

        // Kenney flowers, mushrooms, stumps — NUM_SEGMENTS * 12
        const smallSrcs = [shroom, flower, stump]
        for (let i = 0; i < NUM_SEGMENTS * 12; i++) {
          const side = Math.random() > 0.5 ? 1 : -1
          const x = side * (PATH_WIDTH / 2 + 0.6 + Math.random() * 7)
          const z = -Math.random() * NUM_SEGMENTS * SEGMENT_LENGTH
          const fg = smallSrcs[Math.floor(Math.random() * smallSrcs.length)].clone()
          fg.scale.setScalar(0.5 + Math.random() * 0.5)
          fg.position.set(x, 0, z)
          scene.add(fg); flowers.push(fg)
        }
      } catch {}
    })()

    // --- HILLS ---
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x4a90d9, roughness: 0.9, metalness: 0.1, side: THREE.DoubleSide })
    const hillWidth = 10
    const hillSegments: THREE.Mesh[] = []
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const geoH = new THREE.PlaneGeometry(hillWidth, SEGMENT_LENGTH)
      const hL = new THREE.Mesh(geoH, hillMat)
      hL.rotation.x = -Math.PI / 2; hL.rotation.z = 0.3
      hL.position.set(-(PATH_WIDTH / 2 + grassWidth + hillWidth / 2), -0.05, -i * SEGMENT_LENGTH)
      hL.receiveShadow = true; scene.add(hL); hillSegments.push(hL)
      const hR = new THREE.Mesh(geoH, hillMat)
      hR.rotation.x = -Math.PI / 2; hR.rotation.z = -0.3
      hR.position.set(PATH_WIDTH / 2 + grassWidth + hillWidth / 2, -0.05, -i * SEGMENT_LENGTH)
      hR.receiveShadow = true; scene.add(hR); hillSegments.push(hR)
    }

    // --- MOUNTAINS (static backdrop) ---
    const matLow  = new THREE.MeshStandardMaterial({ color: 0x4a7c4e, roughness: 1, metalness: 0 })
    const matHigh = new THREE.MeshStandardMaterial({ color: 0x8fa882, roughness: 1, metalness: 0 })
    const mountainDefs = [
      { x: -28, z: -40, h: 14, r: 7 }, { x: -38, z: -10, h: 18, r: 9 }, { x: -25, z: -80, h: 10, r: 5 },
      { x: -42, z: -55, h: 20, r: 10 }, { x: -30, z: -120, h: 12, r: 6 }, { x: -45, z: -95, h: 16, r: 8 },
      { x: -27, z: -160, h: 8,  r: 4 }, { x: -40, z: -140, h: 15, r: 7 },
      { x:  28, z: -40, h: 16, r: 8 }, { x:  35, z: -15, h: 12, r: 6 }, { x:  26, z: -75, h: 20, r: 10 },
      { x:  44, z: -55, h: 10, r: 5 }, { x:  32, z: -110, h: 18, r: 9 }, { x:  41, z: -90, h: 13, r: 7 },
      { x:  29, z: -150, h: 8,  r: 4 }, { x:  38, z: -135, h: 15, r: 8 },
    ]
    mountainDefs.forEach(({ x, z, h, r }) => {
      const g = new THREE.Group()
      // Base — wide & low, dark green
      const base = new THREE.Mesh(new THREE.ConeGeometry(r * 1.25, h * 0.65, 7), matLow)
      base.position.y = h * 0.65 / 2
      g.add(base)
      // Peak — narrow & tall, light grey-green
      const peak = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, h * 0.75, 6), matHigh)
      peak.position.y = h * 0.65 * 0.72 + h * 0.75 / 2
      g.add(peak)
      // Optional secondary ridge offset
      if (Math.random() > 0.45) {
        const ridge = new THREE.Mesh(new THREE.ConeGeometry(r * 0.35, h * 0.5, 5), matHigh)
        ridge.position.set(r * 0.4 * (Math.random() > 0.5 ? 1 : -1), h * 0.65 * 0.5 + h * 0.5 / 2, r * 0.2)
        g.add(ridge)
      }
      g.position.set(x, 0, z)
      scene.add(g)
    })

    // --- FOX ---
    const foxGroup = new THREE.Group()
    scene.add(foxGroup)

    // Mixer + animations
    let mixer: THREE.AnimationMixer | null = null
    const actions: Record<string, THREE.AnimationAction> = {}
    let currentAction = ''

    function playAnim(name: string, loop = true) {
      if (currentAction === name) return
      const action = actions[name]
      if (!action) return
      const prev = actions[currentAction]
      if (prev) { prev.fadeOut(0.2) }
      action.reset().fadeIn(0.2).play()
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
      if (!loop) action.clampWhenFinished = true
      currentAction = name
    }

    const loader = new GLTFLoader()
    loader.load('/models/Fox.gltf', (gltf) => {
      const model = gltf.scene
      model.scale.set(0.8, 0.8, 0.8)
      model.rotation.y = Math.PI
      model.position.set(0, 0, 0)
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true
        }
      })
      foxGroup.add(model)

      mixer = new THREE.AnimationMixer(model)
      gltf.animations.forEach((clip) => {
        actions[clip.name] = mixer!.clipAction(clip)
      })
      playAnim('Gallop')
    })


    // --- LETTER ORBS ---
    interface LetterOrb {
      mesh: THREE.Mesh
      glow: THREE.Mesh
      char: string
      lane: number
      collected: boolean
    }
    const letterOrbs: LetterOrb[] = []

    const fontLoadPromise: Promise<void> = (async () => {
      const font = new FontFace('Nunito', 'url(https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTQ3j6zbXWjgeg.woff2)')
      await font.load()
      document.fonts.add(font)
    })()

    async function spawnLetter(zPos: number) {
      await fontLoadPromise
      const g = gameRef.current
      if (!g.targetWord) return

      // Всички букви от думата които още не са събрани
      const wordLetters = g.targetWord.split('')
      const indices = (g.collectedIndices || new Set()) as Set<number>
      const remaining = wordLetters.filter((_, i) => !indices.has(i))
      if (remaining.length === 0) return

      const distractors = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧ'.split('').filter(c => !wordLetters.includes(c))
      const orbColors = [0xff4444, 0xaa44ff, 0xff8800, 0x44bbff, 0x44dd88, 0xff44aa, 0xffdd00, 0xff6688]

      // Винаги 3 ленти, само 1 правилна за повече екшън
      const laneCount = Math.random() < 0.3 ? 2 : 3
      const shuffledLanes = [-1, 0, 1].sort(() => Math.random() - 0.5).slice(0, laneCount)
      const correctLanes = [shuffledLanes[0]]

      shuffledLanes.forEach(lane => {
        const isCorrect = correctLanes.includes(lane)
        // Случайна буква от оставащите или distractor
        const char = isCorrect
          ? remaining[Math.floor(Math.random() * remaining.length)]
          : distractors[Math.floor(Math.random() * distractors.length)]
        const color = orbColors[Math.floor(Math.random() * orbColors.length)]

        const orbGeo = new THREE.SphereGeometry(0.38, 16, 16)
        const orbMat = new THREE.MeshStandardMaterial({
          color, emissive: color, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.1,
        })
        const orb = new THREE.Mesh(orbGeo, orbMat)
        orb.position.set(lane * LANE_WIDTH, 1.3, zPos)
        scene.add(orb)

        const glowGeo = new THREE.TorusGeometry(0.48, 0.05, 8, 24)
        const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 })
        const glow = new THREE.Mesh(glowGeo, glowMat)
        glow.position.copy(orb.position)
        scene.add(glow)

        const canvas = document.createElement('canvas')
        canvas.setAttribute('lang', 'bg')
        canvas.width = 256; canvas.height = 256
        const ctx2d = canvas.getContext('2d')!
        ctx2d.clearRect(0, 0, 256, 256)
        // Тъмен полупрозрачен кръг зад буквата
        ctx2d.beginPath()
        ctx2d.arc(128, 128, 110, 0, Math.PI * 2)
        ctx2d.fillStyle = 'rgba(0,0,0,0.45)'
        ctx2d.fill()
        ctx2d.shadowColor = 'rgba(0,0,0,0.95)'
        ctx2d.shadowBlur = 8
        ctx2d.fillStyle = '#ffffff'
        ctx2d.font = 'bold 155px Nunito, Arial, sans-serif'
        ctx2d.textAlign = 'center'
        ctx2d.textBaseline = 'middle'
        ctx2d.fillText(char, 128, 148)
        const tex = new THREE.CanvasTexture(canvas)
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
        sprite.scale.set(0.75, 0.75, 1)
        sprite.position.set(0, 0, 0.56)
        orb.add(sprite)

        letterOrbs.push({ mesh: orb, glow, char, lane, collected: false })
      })
    }

    // --- OBSTACLES ---
    interface Obstacle { mesh: THREE.Mesh; lane: number; type: 'rock' | 'log' }
    const obstacles: Obstacle[] = []

    function spawnObstacle(zPos: number) {
      const lane = [-1, 0, 1][Math.floor(Math.random() * 3)]
      const isLog = Math.random() > 0.5
      let geo: THREE.BufferGeometry
      let mat: THREE.MeshLambertMaterial
      if (isLog) {
        geo = new THREE.CylinderGeometry(0.25, 0.25, LANE_WIDTH * 0.8, 8)
        mat = new THREE.MeshLambertMaterial({ color: 0x4a2a10 })
      } else {
        geo = new THREE.DodecahedronGeometry(0.45, 0)
        mat = new THREE.MeshLambertMaterial({ color: 0x667788 })
      }
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(lane * LANE_WIDTH, isLog ? 0.25 : 0.45, zPos)
      if (isLog) mesh.rotation.z = Math.PI / 2
      mesh.castShadow = true
      scene.add(mesh)
      obstacles.push({ mesh, lane, type: isLog ? 'log' : 'rock' })
    }
    for (let i = 0; i < 6; i++) spawnObstacle(-35 - i * 22)

    // --- PARTICLES ---
    const particleCount = 180
    const particleGeo = new THREE.BufferGeometry()
    const pPos = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 24
      pPos[i * 3 + 1] = Math.random() * 7 + 0.5
      pPos[i * 3 + 2] = -Math.random() * 100
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const particleMat = new THREE.PointsMaterial({ color: 0xaaffaa, size: 0.07, transparent: true, opacity: 0.6 })
    scene.add(new THREE.Points(particleGeo, particleMat))

    // --- COLLECT BURST ---
    function spawnBurst(pos: THREE.Vector3, color: number) {
      for (let i = 0; i < 12; i++) {
        const b = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 4, 4),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
        )
        b.position.copy(pos)
        const vx = (Math.random() - 0.5) * 6
        const vy = 2 + Math.random() * 4
        const vz = (Math.random() - 0.5) * 6
        scene.add(b)
        let t = 0
        const tick = () => {
          t += 0.016
          b.position.x += vx * 0.016
          b.position.y += vy * 0.016 - 9.8 * t * 0.016
          b.position.z += vz * 0.016
          ;(b.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t * 2)
          if (t < 0.6) requestAnimationFrame(tick)
          else scene.remove(b)
        }
        requestAnimationFrame(tick)
      }
    }

    // --- SOUND ---
    function playCollect() {
      try {
        const audio = new Audio('/sounds/coin-collect.mp3')
        audio.volume = 0.55
        audio.play().catch(() => {})
      } catch {}
    }
    function playWrong() {
      try {
        const audio = new Audio('/sounds/wrong.mp3')
        audio.volume = 0.35
        audio.play().catch(() => {})
      } catch {}
    }

    // --- GAME STATE ---
    const state = {
      speed: 11,
      currentLane: 0,
      targetX: 0,
      isJumping: false,
      jumpVelocity: 0,
      foxY: 0,
      isSliding: false,
      slideTimer: 0,
      runTime: 0,
      invincible: 0,
      letterSpawnTimer: 1.5,
      obstacleSpawnZ: -35 - 6 * 22,
    }

    const JUMP_FORCE = 9
    const GRAVITY = -22
    const SLIDE_DURATION = 0.7

    // --- INPUT ---
    const keys: Record<string, boolean> = {}
    let laneChangeCooldown = 0
    

    function handleKeyDown(e: KeyboardEvent) {
      if (keys[e.code]) return
      keys[e.code] = true
      // lastKeyDown = e.code
      if (e.code === 'ArrowLeft') moveLane(-1)
      if (e.code === 'ArrowRight') moveLane(1)
      if (e.code === 'ArrowUp' || e.code === 'Space') { e.preventDefault(); jump() }
      if (e.code === 'ArrowDown') slide()
    }
    function handleKeyUp(e: KeyboardEvent) { keys[e.code] = false }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    let touchStartX = 0, touchStartY = 0
    function onTouchStart(e: TouchEvent) {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
    }
    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - touchStartX
      const dy = e.changedTouches[0].clientY - touchStartY
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 35) moveLane(1); else if (dx < -35) moveLane(-1)
      } else {
        if (dy < -35) jump(); else if (dy > 35) slide()
      }
    }
    container.addEventListener('touchstart', onTouchStart)
    container.addEventListener('touchend', onTouchEnd)

    // Pre-load звуци за да не секат
    const sfxLeft = new Audio('/sounds/fox-left.mp3'); sfxLeft.volume = 0.4
    const sfxRight = new Audio('/sounds/fox-right.mp3'); sfxRight.volume = 0.4
    const sfxJump = new Audio('/sounds/fox-jump.mp3'); sfxJump.volume = 0.5

    function playSfx(audio: HTMLAudioElement) {
      try { audio.currentTime = 0; audio.play().catch(() => {}) } catch {}
    }

    // Run loop звук
    const runSound = new Audio('/sounds/fox-run-loop.mp3')
    runSound.loop = true
    runSound.volume = 0.35
    const startRunSound = () => {
      runSound.play().catch(() => {})
      window.removeEventListener('keydown', startRunSound)
      window.removeEventListener('click', startRunSound)
      container.removeEventListener('touchstart', startRunSound)
    }
    window.addEventListener('keydown', startRunSound)
    window.addEventListener('click', startRunSound)
    container.addEventListener('touchstart', startRunSound)

    function moveLane(dir: number) {
      if (laneChangeCooldown > 0) return
      const n = Math.max(-1, Math.min(1, state.currentLane + dir))
      if (n !== state.currentLane) {
        state.currentLane = n; state.targetX = n * LANE_WIDTH
        laneChangeCooldown = 0.22
        playSfx(dir > 0 ? sfxRight : sfxLeft)
      }
    }
    function jump() {
      if (!state.isJumping && !state.isSliding) {
        state.isJumping = true; state.jumpVelocity = JUMP_FORCE
        playSfx(sfxJump)
      }
    }
    function slide() {
      if (!state.isJumping && !state.isSliding) {
        state.isSliding = true; state.slideTimer = SLIDE_DURATION
        playSfx(sfxJump)
      }
    }

    // --- ANIMATION LOOP ---
    let lastTime = performance.now()
    let animId: number

    function animate() {
      animId = requestAnimationFrame(animate)
      if (gameRef.current.dead) { composer.render(); return }

      const now = performance.now()
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      state.runTime += dt
      if (mixer) mixer.update(dt)
      state.speed = 12 + state.runTime * 0.25
      runSound.playbackRate = Math.min(1 + state.runTime * 0.008, 1.6)
      if (laneChangeCooldown > 0) laneChangeCooldown -= dt
      if (state.invincible > 0) state.invincible -= dt

      // Lane lerp
      foxGroup.position.x += (state.targetX - foxGroup.position.x) * dt * 12

      // Jump
      if (state.isJumping) {
        state.jumpVelocity += GRAVITY * dt
        state.foxY += state.jumpVelocity * dt
        if (state.foxY <= 0) { state.foxY = 0; state.isJumping = false; state.jumpVelocity = 0 }
      }

      // Slide
      if (state.isSliding) {
        state.slideTimer -= dt
        if (state.slideTimer <= 0) state.isSliding = false
      }

      // Fox position & animation
      const bob = state.isJumping || state.isSliding ? 0 : Math.sin(state.runTime * 13) * 0.055
      foxGroup.position.y = state.foxY + bob

      // Animation state
      if (state.isSliding) playAnim('Idle_2_HeadLow', true)
      else if (state.isJumping) playAnim('Gallop_Jump', false)
      else playAnim('Gallop', true)

      // Slide tilt
      foxGroup.rotation.x = state.isSliding ? 0.25 : 0

      // Tilt on lane change
      const tilt = (state.targetX - foxGroup.position.x) * 0.25
      foxGroup.rotation.z = -tilt * 0.5
      foxGroup.rotation.y = tilt * 0.25



      // Move world
      const moveZ = state.speed * dt

      segments.forEach(seg => {
        seg.position.z += moveZ
        if (seg.position.z > SEGMENT_LENGTH * 1.5) seg.position.z -= NUM_SEGMENTS * SEGMENT_LENGTH
      })
      grassSegments.forEach(seg => {
        seg.position.z += moveZ
        if (seg.position.z > SEGMENT_LENGTH * 1.5) seg.position.z -= NUM_SEGMENTS * SEGMENT_LENGTH
      })
      // Move edge pieces too (children of scene by index - simpler: just move all non-fox meshes)
      scene.children.forEach(obj => {
        if (obj === foxGroup || obj === sun || obj === rim || obj === fill ||
            obj instanceof THREE.AmbientLight || obj instanceof THREE.Points) return
        if (obj instanceof THREE.Mesh && obj.geometry instanceof THREE.BoxGeometry) {
          const w = (obj.geometry.parameters as {width:number}).width
          if (w < 1 && w > 0) { // lane dashes
            obj.position.z += moveZ
            if (obj.position.z > 5) obj.position.z -= NUM_SEGMENTS * SEGMENT_LENGTH
          }
        }
      })

      trees.forEach(tree => {
        tree.position.z += moveZ
        if (tree.position.z > 10) {
          const side = tree.position.x > 0 ? 1 : -1
          tree.position.z -= NUM_SEGMENTS * SEGMENT_LENGTH + Math.random() * 20
          tree.position.x = side * (PATH_WIDTH / 2 + 1.2 + 2 + Math.random() * 5)
        }
      })

      flowers.forEach(f => {
        f.position.z += moveZ
        if (f.position.z > 10) {
          const side = f.position.x > 0 ? 1 : -1
          f.position.z -= NUM_SEGMENTS * SEGMENT_LENGTH + Math.random() * 10
          f.position.x = side * (PATH_WIDTH / 2 + 0.6 + Math.random() * 7)
        }
      })

      grassSegments.forEach(seg => {
        seg.position.z += moveZ
        if (seg.position.z > SEGMENT_LENGTH * 1.5) seg.position.z -= NUM_SEGMENTS * SEGMENT_LENGTH
      })
      hillSegments.forEach(seg => {
        seg.position.z += moveZ
        if (seg.position.z > SEGMENT_LENGTH * 1.5) seg.position.z -= NUM_SEGMENTS * SEGMENT_LENGTH
      })

      // Letter orbs
      letterOrbs.forEach(orb => {
        if (orb.collected) return
        orb.mesh.position.z += moveZ
        orb.glow.position.z += moveZ
        orb.mesh.rotation.y += dt * 1.5
        orb.glow.rotation.z += dt * 2
        // Hover bob
        orb.mesh.position.y = 1.1 + Math.sin(state.runTime * 3 + orb.lane) * 0.18
        orb.glow.position.y = orb.mesh.position.y

        // Collision with fox
        const dx = foxGroup.position.x - orb.mesh.position.x
        const foxHeight = state.foxY
        const dz = orb.mesh.position.z - 0
        // dy removed
        if (Math.abs(dx) < 1.0 && dz > -1.2 && dz < 2.0 && foxHeight < 0.8 && !state.isSliding) {
          orb.collected = true
          scene.remove(orb.mesh); scene.remove(orb.glow)
          const g = gameRef.current
          const wordArr = g.targetWord.split('')
          // collectedIndices е Set<number> - кои позиции са събрани
          if (!g.collectedIndices) g.collectedIndices = new Set<number>()
          const indices = g.collectedIndices as Set<number>
          // Намери първата несъбрана позиция с тази буква
          const targetIdx = wordArr.findIndex((l, i) => l === orb.char && !indices.has(i))
          const isNeeded = targetIdx !== -1
          if (isNeeded) {
            playCollect()
            spawnBurst(orb.mesh.position.clone(), 0xFFD700)
            indices.add(targetIdx)
            // Rebuild display array
            const display = wordArr.map((l, i) => indices.has(i) ? l : null)
            const newCollected = display.filter(Boolean) as string[]
            g.collected = newCollected
            setCollected(display)
            const newScore = g.score + 10
            g.score = newScore
            setScore(newScore)
            if (indices.size === g.targetWord.length) {
              try { const s = new Audio('/sounds/fox-run-win.mp3'); s.volume = 0.32; s.play().catch(() => {}) } catch {}
              // Word complete!
              setTimeout(() => {
                const nextWord = WORDS[Math.floor(Math.random() * WORDS.length)]
                g.targetWord = nextWord; g.collected = []; g.collectedIndices = new Set()
                setTargetWord(nextWord); setCollected([])
                const bonus = g.score + 50
                g.score = bonus; setScore(bonus)
              }, 400)
            }
          } else {
            playWrong()
            spawnBurst(orb.mesh.position.clone(), 0xff4444)
          }
        }

        // Recycle off-screen
        if (orb.mesh.position.z > 3) {
          scene.remove(orb.mesh); scene.remove(orb.glow)
          orb.collected = true
        }
      })

      // Spawn new letters — timer-based, ~3-4s interval
      state.letterSpawnTimer -= dt
      if (state.letterSpawnTimer <= 0) {
        spawnLetter(-(state.speed * 3.5))
        state.letterSpawnTimer = 3 + Math.random() * 1
      }

      // Obstacles
      obstacles.forEach(obs => {
        obs.mesh.position.z += moveZ
        obs.mesh.rotation.y += dt * 0.5

        if (state.invincible <= 0) {
          const dx = Math.abs(foxGroup.position.x - obs.mesh.position.x)
          const dz = obs.mesh.position.z
          const clearHeight = state.isJumping && foxGroup.position.y > 0.8
          const clearSlide = state.isSliding && obs.type === 'log'
          if (dx < 1.0 && dz > -1.0 && dz < 2.0 && !clearHeight && !clearSlide) {
            state.invincible = 2.5
            const newLives = gameRef.current.lives - 1
            gameRef.current.lives = newLives
            setLives(newLives)
            spawnBurst(foxGroup.position.clone(), 0xff4400)
            if (newLives <= 0) { gameRef.current.dead = true; setGameOver(true) }
          }
        }

        if (obs.mesh.position.z > 12) {
          obs.mesh.position.z -= NUM_SEGMENTS * SEGMENT_LENGTH * 0.7 + Math.random() * 30
          obs.mesh.position.x = [-1,0,1][Math.floor(Math.random()*3)] * LANE_WIDTH
        }
      })

      // Particles
      const pa = particleGeo.attributes.position.array as Float32Array
      for (let i = 0; i < particleCount; i++) {
        pa[i*3+2] += moveZ * 0.25
        if (pa[i*3+2] > 8) pa[i*3+2] -= 100
      }
      particleGeo.attributes.position.needsUpdate = true
      particleMat.opacity = 0.3 + Math.sin(state.runTime * 1.8) * 0.2

      // Invincible flash
      if (state.invincible > 0) {
        foxGroup.visible = Math.floor(state.invincible * 8) % 2 === 0
      } else {
        foxGroup.visible = true
      }

      // Camera — smooth follow
      const camTargetX = foxGroup.position.x * 0.35
      const camTargetY = state.isJumping ? 7.5 + foxGroup.position.y * 0.3 : 6.5
      camera.position.x += (camTargetX - camera.position.x) * dt * 6
      camera.position.y += (camTargetY - camera.position.y) * dt * 4
      camera.lookAt(foxGroup.position.x * 0.4, 1.5 + foxGroup.position.y * 0.2, -5)

      composer.render()
    }

    // --- POSTPROCESSING ---
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.8, 0.4, 0.6
    ))

    animate()

    spawnLetter(-20)

    function onResize() {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
      composer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('resize', onResize)
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchend', onTouchEnd)
      music.pause()
      music.src = ''
      runSound.pause()
      runSound.src = ''
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Back */}
      <button onClick={() => router.push('/games')}
        className="absolute top-4 left-4 z-10 bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border border-white/20 hover:bg-black/70 transition-all">
        ← Назад
      </button>

      {/* Word UI */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <div className="text-white/50 text-xs uppercase tracking-widest">Събери думата</div>
        <div className="flex gap-2">
          {(targetWord || '').split('').map((letter, i) => (
            <div key={i} className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold border-2 transition-all duration-300 ${
              collected[i]
                ? 'bg-yellow-400 border-yellow-300 text-yellow-900 scale-110'
                : 'bg-black/40 border-white/20 text-white/40'
            }`}>
              {collected[i] ?? letter}
            </div>
          ))}
        </div>
      </div>

      {/* Score */}
      <div className="absolute top-4 right-4 z-10">
        <div className="text-yellow-400 font-bold text-lg">⭐ {score}</div>
      </div>
      {/* Lives */}
      <div className="absolute top-11 right-4 z-10 flex gap-1">
        {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
          <span key={i} className="text-lg">❤️</span>
        ))}
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex gap-4 text-white/40 text-xs">
        <span>← → лента</span><span>·</span>
        <span>↑ скок</span><span>·</span>
        <span>↓ slide</span>
      </div>

      {/* Game Over */}
      {gameOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-6xl mb-4">🦊</div>
            <h2 className="text-white text-4xl font-bold mb-2">Край на играта!</h2>
            <p className="text-yellow-400 text-2xl mb-6">⭐ {score} точки</p>
            <button
              onClick={() => { setGameOver(false); setScore(0); setLives(3); setCollected([]); window.location.reload() }}
              className="bg-yellow-400 text-yellow-900 px-8 py-3 rounded-full text-xl font-bold hover:bg-yellow-300 transition-all">
              Играй отново
            </button>
          </div>
        </div>
      )}

      <div ref={mountRef} className="w-full h-full" />
    </div>
  )
}
