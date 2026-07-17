'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js'

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WORD_PAIRS: [string, string][] = [
  ["дъб","дъп"],["хляб","хляп"],["зъб","зъп"],["гълъб","гълъп"],["гръб","гръп"],["клуб","клуп"],["дроб","дроп"],["боб","боп"],["гардероб","гардероп"],["джоб","джоп"],["лед","лет"],["мед","мет"],["ред","рет"],["глад","глат"],["град","грат"],["плод","плот"],["народ","нарот"],["вход","вхот"],["обяд","обят"],["брод","брот"],["рог","рок"],["праг","прак"],["враг","врак"],["бряг","бряк"],["сняг","сняк"],["кръг","крък"],["юг","юк"],["бог","бок"],["лев","леф"],["нов","ноф"],["здрав","здраф"],["крив","криф"],["прав","праф"],["сив","сиф"],["розов","розоф"],["готов","готоф"],["такъв","такъф"],["носов","нософ"],["мраз","мрас"],["низ","нис"],["образ","обрас"],["ряз","ряс"],["съюз","съюс"],["израз","израс"],["нож","нош"],["гараж","гараш"],["мъж","мъш"],["багаж","багаш"],["плаж","плаш"],["страж","страш"],["тираж","тираш"],["монтаж","монташ"],["ръка","рака"],["мъгла","магла"],["въже","важе"],["къща","каща"],["дъска","даска"],["тъга","тага"],["къпина","капина"],["лъжица","лажица"],["пътека","патека"],["въпрос","вапрос"],["късмет","касмет"],["дъга","дага"],["ръкав","ракав"],["мъничък","маничък"],["дънер","данер"],["тръба","траба"],["гъба","габа"],["мъх","мах"],["възел","вазел"],["дъх","дах"],["къс","кас"],["ръжен","ражен"],["тъпан","тапан"],["събота","сабота"],["зима","зема"],["лисица","лесица"],["игла","егла"],["пиле","пили"],["река","рика"],["дете","дити"],["зеле","зили"],["мечка","мичка"],["венец","винец"],["тетрадка","титрадка"],["седем","сидем"],["беля","биля"],["легло","лигло"],["череша","чиреша"],["снежен","снижен"],["телефон","тилифон"],["пеперуда","пиперуда"],["коте","коти"],["село","сило"],["ден","дин"],["медал","мидал"],["вестник","вистник"],["перо","пиро"],["десет","дисет"],["червен","чирвен"],["езеро","изеро"],["мелница","милница"],["бреза","бриза"],["детелина","дителина"],["безброй","безброи"],["бял","бел"],["пял","пел"],["видял","видел"],["седял","седел"],["летял","летел"],["живял","живел"],["стоял","стоел"],["зрял","зрел"],["безмислен","бесмислен"],["безсилен","бессилен"],["безстрашен","бесстрашен"],["безспорен","бесспорен"],["безсънен","бессънен"],["безсрамен","бессрамен"],["безцветен","бесцветен"],["безчувствен","бесчувствен"],["ябълка","абълка"],["яйце","айце"],["юнак","унак"],["ягода","агода"],["яма","ама"],["яке","аке"],["ястреб","астреб"],["юфка","уфка"],["южен","ужен"],["ютия","утия"],["юрган","урган"],["люлка","лулка"],["бонбон","бомбон"],["слънце","сланце"],["училище","учелише"],["приятел","преятел"],["рисувам","ресувам"],
]

// Ниво 3 (desert) word-pair target — win condition check and HUD display both
// read this instead of a hardcoded number so the two never drift apart.
const DESERT_WORDS_TARGET = 15

export default function FoxRunPage() {
  const mountRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [targetWord, setTargetWord] = useState('')
  const [collected, setCollected] = useState<(string|null)[]>([])
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [wordsCompletedInLevel, setWordsCompletedInLevel] = useState(0)
  const [levelComplete, setLevelComplete] = useState(false)
  // selectedLevel starts null on both server and client so the first client
  // render matches the server-rendered HTML exactly (no hydration mismatch).
  // The ?level= URL param is only readable client-side, so it's picked up in
  // an effect after mount; levelParamChecked gates the world-select screen so
  // a direct ?level=X deep link (how LevelFlowScreen opens this WebView) never
  // flashes "Избери свят" before the game view takes over.
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [levelParamChecked, setLevelParamChecked] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const levelParam = parseInt(params.get('level') || '0')
    if (levelParam >= 1 && levelParam <= 5) setSelectedLevel(levelParam)
    setLevelParamChecked(true)
  }, [])

  const gameRef = useRef<{
    targetWord: string
    collected: string[]
    collectedIndices?: Set<number>
    score: number
    lives: number
    dead: boolean
    level: number
    wordsCompletedInLevel: number
  }>({ targetWord: '', collected: [], score: 0, lives: 3, dead: false, level: 1, wordsCompletedInLevel: 0 })

  useEffect(() => {
    if (!selectedLevel || !mountRef.current) return
    const container = mountRef.current

    // Shuffled word deck — use URL words param if provided (fill to 10), else default WORDS
    const urlWords = new URLSearchParams(window.location.search).get('words')
    function shuffle<T>(arr: T[]): T[] {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    }
    let wordDeck: string[]
    if (urlWords) {
      const custom = urlWords.split(',').map(w => w.trim().toUpperCase()).filter(Boolean)
      const extra = shuffle(WORDS.filter(w => !custom.includes(w))).slice(0, Math.max(0, 10 - custom.length))
      wordDeck = shuffle([...custom, ...extra])
    } else {
      wordDeck = [...WORDS]
    }
    let wordDeckIndex = 0
    function getNextWord(): string {
      if (wordDeckIndex >= wordDeck.length) {
        for (let i = wordDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[wordDeck[i], wordDeck[j]] = [wordDeck[j], wordDeck[i]]
        }
        wordDeckIndex = 0
      }
      return wordDeck[wordDeckIndex++]
    }

    const WORLDS = [
      { sky: 0x87CEEB, fog: 0x87CEEB },
      { sky: 0xd0eeff, fog: 0xc0e8ff },
      { sky: 0xf4a460, fog: 0xe8956a },
      { sky: 0x4a90d9, fog: 0x3a7fc9 },
      { sky: 0x1a1a2e, fog: 0x16213e },
    ]

    // Apply selected level
    const startLevel = selectedLevel ?? 1
    gameRef.current.level = startLevel
    setLevel(startLevel)
    if (startLevel === 3) { gameRef.current.lives = 5; setLives(5) }

    // Pick first word
    const firstWord = getNextWord()
    gameRef.current.targetWord = firstWord
    setTargetWord(firstWord)

    // --- RENDERER ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.85
    renderer.outputColorSpace = THREE.SRGBColorSpace
    // --- AUDIO CONTEXT ---
    const musicTracks = ['/sounds/fox-run-music-1.mp3', '/sounds/fox-run-music-2.mp3']
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const audioBuffers = new Map<string, AudioBuffer>()

    // Surfaces audio errors to the RN WebView console via postMessage (no-op
    // when running as a plain web page outside the app).
    function logAudioError(message: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rnWebView = (window as any).ReactNativeWebView
      if (rnWebView?.postMessage) {
        rnWebView.postMessage(JSON.stringify({ type: 'audio-error', message }))
      }
    }

    // Temporary diagnostic logging for the iOS silent-audio investigation —
    // always logs to console AND forwards to the RN WebView bridge, so it
    // shows up in Metro regardless of whether Safari Web Inspector is handy.
    function logAudioInfo(message: string) {
      console.log('[audio]', message)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rnWebView = (window as any).ReactNativeWebView
      if (rnWebView?.postMessage) {
        rnWebView.postMessage(JSON.stringify({ type: 'audio-info', message }))
      }
    }
    logAudioInfo(`audioCtx created, initial state = ${audioCtx.state}`)

    async function loadAudioBuffer(url: string): Promise<AudioBuffer> {
      if (audioBuffers.has(url)) return audioBuffers.get(url)!
      try {
        const res = await fetch(url)
        const ab = await res.arrayBuffer()
        const buf = await audioCtx.decodeAudioData(ab)
        audioBuffers.set(url, buf)
        logAudioInfo(`decoded ${url} ok (${buf.duration.toFixed(2)}s)`)
        return buf
      } catch (err) {
        logAudioError(`decodeAudioData failed for ${url}: ${err}`)
        throw err
      }
    }

    function playOnce(buf: AudioBuffer | null, volume: number) {
      if (!buf) return
      const gain = audioCtx.createGain(); gain.gain.value = volume; gain.connect(audioCtx.destination)
      const src = audioCtx.createBufferSource(); src.buffer = buf; src.connect(gain); src.start()
    }

    // Looping music
    let musicSource: AudioBufferSourceNode | null = null
    let musicStarted = false
    let currentMusicUrl = ''
    let musicSwitching = false
    const musicGain = audioCtx.createGain(); musicGain.gain.value = 0.35; musicGain.connect(audioCtx.destination)

    async function switchMusic(url: string) {
      if (musicSwitching) return
      musicSwitching = true
      if (url === currentMusicUrl) { musicSwitching = false; return }
      currentMusicUrl = url
      if (musicSource) { try { musicSource.stop() } catch {} musicSource = null }
      const buf = await loadAudioBuffer(url)
      musicSource = audioCtx.createBufferSource()
      musicSource.buffer = buf; musicSource.loop = true
      musicSource.connect(musicGain); musicSource.start()
      logAudioInfo(`musicSource.start() called for ${url}, audioCtx.state = ${audioCtx.state}`)
      musicSwitching = false
    }

    // Run loop
    let runSoundSource: AudioBufferSourceNode | null = null
    const runSoundGain = audioCtx.createGain(); runSoundGain.gain.value = 0.35; runSoundGain.connect(audioCtx.destination)

    async function startRunLoop() {
      if (runSoundSource) return
      const buf = await loadAudioBuffer('/sounds/fox-run-loop.mp3')
      runSoundSource = audioCtx.createBufferSource()
      runSoundSource.buffer = buf; runSoundSource.loop = true
      runSoundSource.connect(runSoundGain); runSoundSource.start()
      logAudioInfo(`runSoundSource.start() called, audioCtx.state = ${audioCtx.state}`)
    }

    // SFX buffers (loaded async)
    let sfxBufLeft: AudioBuffer | null = null
    let sfxBufRight: AudioBuffer | null = null
    let sfxBufJump: AudioBuffer | null = null
    ;(async () => {
      sfxBufLeft  = await loadAudioBuffer('/sounds/fox-left.mp3')
      sfxBufRight = await loadAudioBuffer('/sounds/fox-right.mp3')
      sfxBufJump  = await loadAudioBuffer('/sounds/fox-jump.mp3')
    })()

    // iOS requires resume() to happen synchronously inside a trusted
    // user-gesture event, so this is called from the real touchstart
    // handler below rather than immediately at mount.
    function unlockAndStartAudio() {
      logAudioInfo(`unlockAndStartAudio() called, audioCtx.state before resume() = ${audioCtx.state}`)
      audioCtx.resume().then(() => {
        logAudioInfo(`resume() resolved, audioCtx.state after = ${audioCtx.state}`)
        if (!musicStarted) { musicStarted = true; switchMusic(musicTracks[Math.floor(Math.random() * musicTracks.length)]) }
        startRunLoop()
      }).catch(err => logAudioError(`audioCtx.resume() failed: ${err}, state = ${audioCtx.state}`))
    }

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
    const texLoader = new THREE.TextureLoader()
    const groundTex = texLoader.load('/textures/ground.jpg')
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping
    groundTex.repeat.set(4, 4)
    const pathMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.9, metalness: 0 })
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.9, metalness: 0 })
    const segments: THREE.Mesh[] = []
    // Wooden curb strips along each path segment — tracked separately so
    // applyWorld() can hide them together with the deck for the ocean world
    // (a floating curb with no deck under it would read as broken, not surfing).
    const pathEdges: THREE.Mesh[] = []

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
      pathEdges.push(eL)
      const eR = eL.clone()
      eR.position.set(PATH_WIDTH / 2 + 0.15, -0.05, -i * SEGMENT_LENGTH)
      scene.add(eR)
      pathEdges.push(eR)
    }

    // --- GRASS ---
    const grassTex = texLoader.load('/textures/grass.jpg')
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping
    grassTex.repeat.set(8, 8)
    const snowTex = texLoader.load('/textures/snow.jpg')
    snowTex.wrapS = snowTex.wrapT = THREE.RepeatWrapping
    snowTex.repeat.set(8, 8)
    const snowPathTex = texLoader.load('/textures/snow-path.jpg')
    snowPathTex.wrapS = snowPathTex.wrapT = THREE.RepeatWrapping
    snowPathTex.repeat.set(4, 4)
    const sandTex = texLoader.load('/textures/sand.jpg')
    sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping
    sandTex.repeat.set(8, 8)
    const sandPathTex = texLoader.load('/textures/sand-path.jpg')
    sandPathTex.wrapS = sandPathTex.wrapT = THREE.RepeatWrapping
    sandPathTex.repeat.set(4, 4)
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x3a7a2a, map: grassTex, roughness: 0.8, metalness: 0 })
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

    // Dashed lane lines — tracked so applyWorld() can hide them for the ocean
    // world (they were previously untracked/always-visible: added straight to
    // scene with no array, so they kept floating over the water at y=0.02
    // after the deck/curbs were hidden, reading as leftover path).
    const dashMat = new THREE.MeshBasicMaterial({ color: 0x6a4a2a, transparent: true, opacity: 0.6 })
    const laneDashes: THREE.Mesh[] = []
    for (let lane = -1; lane <= 1; lane++) {
      for (let i = 0; i < NUM_SEGMENTS * 4; i++) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 1.2), dashMat)
        dash.position.set(lane * LANE_WIDTH, 0.02, -i * 3.5)
        scene.add(dash)
        laneDashes.push(dash)
      }
    }

    // --- TREES & FLOWERS ---
    // All trees are nature-pack GLTF models (public/models/nature/glTF) — no more
    // procedural Cone/Sphere placeholders. Everything loads async, so positions are
    // generated once the models are in.
    const trees: THREE.Group[] = []
    const flowers: THREE.Group[] = []
    const bushes: THREE.Group[] = []
    const mountains: THREE.Group[] = []
    // Ambient floating dust — declared here (assigned once created further down)
    // so applyWorld() can toggle it per-world even though it's first called
    // before the particle system itself exists.
    let particles: THREE.Points | null = null

    // Winter snow-cap effect: tints upward-facing surfaces white via a small
    // fragment-shader patch (dot product with world-up) instead of a separate
    // snow mesh, so it follows each model's actual shape (branch tops, rock
    // ridges) rather than reading as a flat paint job. snowUniform.value is
    // toggled 0/1 in applyWorld() — only the winter world turns it on.
    const snowMaterials: THREE.Material[] = []
    function makeSnowy(material: THREE.Material) {
      if (material.userData.snowUniform) return
      const snowUniform = { value: 0 }
      material.userData.snowUniform = snowUniform
      material.onBeforeCompile = shader => {
        shader.uniforms.snowAmount = snowUniform
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vWorldNormal;')
          .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvWorldNormal = normalize(mat3(modelMatrix) * normal);')
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float snowAmount;\nvarying vec3 vWorldNormal;')
          .replace('#include <dithering_fragment>', `
            float snowFace = smoothstep(0.35, 0.75, vWorldNormal.y) * snowAmount;
            gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.96, 0.98, 1.0), snowFace);
            #include <dithering_fragment>`)
      }
      material.needsUpdate = true
      snowMaterials.push(material)
    }
    function addSnowToModel(model: THREE.Object3D) {
      model.traverse(child => {
        const m = child as THREE.Mesh
        if (m.isMesh && m.material) {
          const mats = Array.isArray(m.material) ? m.material : [m.material]
          mats.forEach(makeSnowy)
        }
      })
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
        const naturePath = '/models/nature/glTF/'
        const [
          pine, oak, def, shroom, flower, stump,
          birch1, birch2, birch3, birch4, birch5,
          maple1, maple2, maple3, maple4, maple5,
          dead1, dead3, dead5, dead7, dead9,
          bush, bushFlowers, bushSmall,
          rocks,
        ] = await Promise.all([
          loadGLTF('/models/tree_pine.glb'),
          loadGLTF('/models/tree_oak.glb'),
          loadGLTF('/models/tree_default.glb'),
          loadGLTF('/models/mushroom_red.glb'),
          loadGLTF('/models/flower_purpleA.glb'),
          loadGLTF('/models/stump.glb'),
          loadGLTF(naturePath + 'BirchTree_1.gltf'),
          loadGLTF(naturePath + 'BirchTree_2.gltf'),
          loadGLTF(naturePath + 'BirchTree_3.gltf'),
          loadGLTF(naturePath + 'BirchTree_4.gltf'),
          loadGLTF(naturePath + 'BirchTree_5.gltf'),
          loadGLTF(naturePath + 'MapleTree_1.gltf'),
          loadGLTF(naturePath + 'MapleTree_2.gltf'),
          loadGLTF(naturePath + 'MapleTree_3.gltf'),
          loadGLTF(naturePath + 'MapleTree_4.gltf'),
          loadGLTF(naturePath + 'MapleTree_5.gltf'),
          loadGLTF(naturePath + 'DeadTree_1.gltf'),
          loadGLTF(naturePath + 'DeadTree_3.gltf'),
          loadGLTF(naturePath + 'DeadTree_5.gltf'),
          loadGLTF(naturePath + 'DeadTree_7.gltf'),
          loadGLTF(naturePath + 'DeadTree_9.gltf'),
          loadGLTF(naturePath + 'Bush.gltf'),
          loadGLTF(naturePath + 'Bush_Flowers.gltf'),
          loadGLTF(naturePath + 'Bush_Small.gltf'),
          loadGLTF(naturePath + 'Rocks.glb'),
        ])
        const treeSrcs = [pine, oak, def]
        const natureTreeSrcs = [
          birch1, birch2, birch3, birch4, birch5,
          maple1, maple2, maple3, maple4, maple5,
          dead1, dead3, dead5, dead7, dead9,
        ]
        const bushSrcs = [bush, bushFlowers, bushSmall]

        // Apply the snow shader once per loaded template — every instance placed
        // below is a clone that shares the same material reference, so this covers
        // all of them and applyWorld() only needs to flip one uniform per material.
        natureTreeSrcs.forEach(addSnowToModel)
        bushSrcs.forEach(addSnowToModel)
        addSnowToModel(rocks)

        const placeNatureTree = (x: number, z: number) => {
          const src = natureTreeSrcs[Math.floor(Math.random() * natureTreeSrcs.length)]
          const g = src.clone()
          g.scale.setScalar(0.6 + Math.random() * 0.5)
          g.rotation.y = Math.random() * Math.PI * 2
          g.position.set(x, 0, z)
          scene.add(g); trees.push(g)
        }

        // Nature-pack trees along the path (replaces the old procedural Cone/Sphere trees)
        for (let i = 0; i < NUM_SEGMENTS; i++) {
          const z = -i * SEGMENT_LENGTH - 4
          const spread = 3 + Math.random() * 4
          if (Math.random() > 0.3) placeNatureTree(-(PATH_WIDTH / 2 + 1.2 + spread), z)
          if (Math.random() > 0.3) placeNatureTree(PATH_WIDTH / 2 + 1.2 + spread, z)
          if (Math.random() > 0.4) {
            if (Math.random() > 0.3) placeNatureTree(-(PATH_WIDTH / 2 + 4 + Math.random() * 5), z - 5)
            if (Math.random() > 0.3) placeNatureTree(PATH_WIDTH / 2 + 4 + Math.random() * 5, z - 5)
          }
        }

        // 30% Kenney trees, layered in for extra variety
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

        // Nature-pack bushes hugging the path edge, well clear of the letter-orb lanes
        // (orbs only ever sit at x = lane * LANE_WIDTH, lane in [-1,0,1])
        for (let i = 0; i < NUM_SEGMENTS * 3; i++) {
          const side = Math.random() > 0.5 ? 1 : -1
          const x = side * (PATH_WIDTH / 2 + 0.5 + Math.random() * 2.5)
          const z = -Math.random() * NUM_SEGMENTS * SEGMENT_LENGTH
          const bg = bushSrcs[Math.floor(Math.random() * bushSrcs.length)].clone()
          bg.scale.setScalar(0.8 + Math.random() * 0.6)
          bg.rotation.y = Math.random() * Math.PI * 2
          bg.position.set(x, 0, z)
          scene.add(bg); bushes.push(bg)
        }

        // Rocky horizon layer — individual rocks from Rocks.glb, scaled way up and
        // placed past the hill line so they read as a distant rocky ridge, not
        // boulders next to the path.
        // Rocks.glb nests the 5 rocks under an empty "RootNode" wrapper (scene ->
        // RootNode -> Rock_1..5) with each rock's own transform baked ~190 units off
        // from the scene root by the source FBX export, so we walk down to the actual
        // meshes and re-ground each individually rather than scaling the whole row
        // (which is a wide, low 7x2x1 unit strip — scaling that for height instead of
        // per-rock would blow the width out to 30-40 units, reaching back toward the path).
        const rockMeshes: THREE.Object3D[] = []
        rocks.traverse(obj => { if ((obj as THREE.Mesh).isMesh) rockMeshes.push(obj) })
        const rockSrcs = rockMeshes.map(mesh => {
          const box = new THREE.Box3().setFromObject(mesh)
          const height = box.max.y - box.min.y
          const centerX = (box.min.x + box.max.x) / 2
          const centerZ = (box.min.z + box.max.z) / 2
          mesh.position.x -= centerX
          mesh.position.y -= box.min.y
          mesh.position.z -= centerZ
          const g = new THREE.Group()
          g.add(mesh)
          return { group: g, height }
        })

        for (let i = 0; i < NUM_SEGMENTS; i++) {
          const side = Math.random() > 0.5 ? 1 : -1
          const src = rockSrcs[Math.floor(Math.random() * rockSrcs.length)]
          const targetHeight = 8 + Math.random() * 8
          const s = targetHeight / src.height
          const mg = src.group.clone()
          mg.scale.setScalar(s)
          mg.rotation.y = Math.random() * Math.PI * 2
          const x = side * (PATH_WIDTH / 2 + grassWidth + 6 + Math.random() * 8)
          const z = -i * SEGMENT_LENGTH - 30 - Math.random() * SEGMENT_LENGTH
          mg.position.set(x, -0.5, z)
          scene.add(mg); mountains.push(mg)
        }

        // applyWorld() ran once already at setup, before any of the above existed
        // (trees/bushes/mountains/snowMaterials were all empty) — re-apply now so a
        // direct non-forest start (e.g. ?level=2) still gets correct visibility/snow.
        applyWorld(startLevel)
      } catch {}
    })()

    // --- HILLS ---
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x4a7c3f, roughness: 0.9, metalness: 0, side: THREE.DoubleSide })
    const hillWidth = 18
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


    const desertCacti: THREE.Group[] = []
    function spawnDesertCacti() {
      const mat = new THREE.MeshLambertMaterial({ color: 0x4a7c2f })
      const count = 24 + Math.floor(Math.random() * 9)
      for (let i = 0; i < count; i++) {
        const side = Math.random() > 0.5 ? 1 : -1
        const x = side * (PATH_WIDTH / 2 + 2 + Math.random() * 9)
        const z = -Math.random() * NUM_SEGMENTS * SEGMENT_LENGTH
        const g = new THREE.Group()
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.8, 6), mat)
        trunk.position.y = 0.9; g.add(trunk)
        const armH = 0.35 + Math.random() * 0.35
        ;[-1, 1].forEach((dir, idx) => {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 6), mat)
          arm.rotation.z = Math.PI / 2
          arm.position.set(dir * 0.28, armH + idx * 0.18, 0)
          g.add(arm)
        })
        g.position.set(x, 0, z)
        g.visible = false
        scene.add(g)
        desertCacti.push(g)
      }
    }
    spawnDesertCacti()

    // --- OCEAN WORLD (world index 3): wave-displaced water plane + palm/island horizon decor ---
    const oceanTimeUniform = { value: 0 }
    // roughness/metalness raised from the original 0.25/0.1 — that glossier
    // surface threw hard specular hotspots that, combined with bloom, read as
    // blown-out sun spots rather than foam.
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x0f4c75, roughness: 0.65, metalness: 0.05 })
    waterMat.onBeforeCompile = shader => {
      shader.uniforms.uTime = oceanTimeUniform
      // PlaneGeometry starts flat in local XY (normal +Z); the mesh below rotates
      // -90deg on X so local Z becomes world-up once placed — displacing
      // transformed.z here is what actually raises/lowers the surface.
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vWave;\nvarying vec2 vLocalXY;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          float wave = sin(position.x * 0.45 + uTime * 1.1) * 0.16
            + sin(position.x * 1.1 - position.y * 0.6 + uTime * 1.8) * 0.08;
          transformed.z += wave;
          vWave = wave;
          vLocalXY = position.xy;`)
        // The displacement above never touched the normal, so lighting still
        // saw a perfectly flat plane — the specular highlight collapsed into
        // one large flat-mirror blob instead of glinting off individual wave
        // crests. Rebuilding the normal from the wave function's own slope
        // (analytic dwave/dx, dwave/dy) breaks that highlight up correctly.
        .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
          float wArg1 = position.x * 0.45 + uTime * 1.1;
          float wArg2 = position.x * 1.1 - position.y * 0.6 + uTime * 1.8;
          float dWaveDx = cos(wArg1) * 0.16 * 0.45 + cos(wArg2) * 0.08 * 1.1;
          float dWaveDy = cos(wArg2) * 0.08 * -0.6;
          objectNormal = normalize(vec3(-dWaveDx, -dWaveDy, 1.0));`)
      // Prepended directly rather than anchored on '#include <common>' like
      // the vertex shader above — simpler, and guaranteed valid regardless of
      // where that chunk marker ends up in the assembled template.
      shader.fragmentShader = 'uniform float uTime;\nvarying float vWave;\nvarying vec2 vLocalXY;\n'
        + shader.fragmentShader.replace('#include <dithering_fragment>', `
          // Fragment-only detail noise, uncorrelated frequencies/uncorrelated
          // from the main wave (3.7/4.1 vs 0.45/1.1) and small amplitude
          // (0.02 vs the 0.055-wide smoothstep band) — only perturbs which
          // pixels cross the foam threshold, breaking the coarse 100x100
          // mesh's large foam patches into finer, more numerous flecks.
          // Never touches transformed.z or objectNormal, so wave shape/motion
          // and lighting are unaffected.
          float foamNoise = sin(vLocalXY.x * 3.7 + uTime * 2.3) * sin(vLocalXY.y * 4.1 - uTime * 1.7) * 0.02;
          float foam = smoothstep(0.17, 0.225, vWave + foamNoise);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.95, 0.98, 1.0), foam);
          #include <dithering_fragment>`)
    }
    waterMat.needsUpdate = true

    const OCEAN_DEPTH = NUM_SEGMENTS * SEGMENT_LENGTH + 60
    const waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(80, OCEAN_DEPTH, 100, 100), waterMat)
    waterPlane.rotation.x = -Math.PI / 2
    // Camera and fox never actually move in Z (only world props scroll toward
    // them), so unlike the tiled ground/hill segments this single static plane
    // never needs to scroll or wrap — it's procedural, so there's no seam to hide.
    waterPlane.position.set(0, -0.6, -(OCEAN_DEPTH / 2) + 30)
    waterPlane.visible = false
    waterPlane.receiveShadow = true
    scene.add(waterPlane)

    // Palms/islets — non-collidable horizon dressing, same "procedural group,
    // hidden until its world is active" pattern as spawnDesertCacti() above.
    const oceanIslands: THREE.Group[] = []
    function spawnOceanIslands() {
      const sandMat = new THREE.MeshLambertMaterial({ color: 0xe8d9a0 })
      const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a5a2f })
      const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f8f4f })
      const count = 14 + Math.floor(Math.random() * 8)
      for (let i = 0; i < count; i++) {
        const side = Math.random() > 0.5 ? 1 : -1
        const x = side * (PATH_WIDTH / 2 + 14 + Math.random() * 20)
        const z = -Math.random() * NUM_SEGMENTS * SEGMENT_LENGTH
        const g = new THREE.Group()
        const islet = new THREE.Mesh(new THREE.CylinderGeometry(1.4 + Math.random(), 1.8, 0.4, 10), sandMat)
        islet.position.y = 0.1
        g.add(islet)
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 2.4, 6), trunkMat)
        trunk.position.y = 1.4
        trunk.rotation.z = 0.15
        g.add(trunk)
        for (let l = 0; l < 5; l++) {
          const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 5), leafMat)
          const angle = (l / 5) * Math.PI * 2
          leaf.position.set(Math.cos(angle) * 0.35, 2.6, Math.sin(angle) * 0.35)
          leaf.rotation.x = Math.PI * 0.42
          leaf.rotation.y = angle
          g.add(leaf)
        }
        // Bumped up from 0.8-1.5 — read as a touch small/sparse against the
        // wide water plane at the original range.
        g.scale.setScalar(1.05 + Math.random() * 0.85)
        g.position.set(x, -0.15, z)
        g.visible = false
        scene.add(g)
        oceanIslands.push(g)
      }
    }
    spawnOceanIslands()

    // Sail ships — non-collidable horizon decor, same lazy-load + hidden-until-
    // active pattern as the rest of the ocean world's dressing. CC0 "Sail Ship"
    // by Quaternius (poly.pizza/m/cIzO4MBPqI).
    const oceanShips: THREE.Group[] = []
    const shipLoader = new GLTFLoader()
    shipLoader.load('/models/nature/SailShip.glb', gltf => {
      const shipSrc = gltf.scene
      // Node transforms inside the GLB already carry most of the real-world
      // scale (unlike the tiny raw accessor coordinates), so this only needs
      // a small multiplier to land around a ~10-unit ship length.
      shipSrc.scale.setScalar(1.7)
      shipSrc.traverse(child => {
        const m = child as THREE.Mesh
        if (m.isMesh) { m.castShadow = true; m.receiveShadow = true }
      })
      const shipSpots = [{ x: -32, z: -120 }, { x: 34, z: -230 }]
      shipSpots.forEach(({ x, z }) => {
        const g = shipSrc.clone()
        g.rotation.y = Math.random() * Math.PI * 2
        g.position.set(x, -0.55, z)
        g.visible = false
        scene.add(g)
        oceanShips.push(g)
      })
      // Model loaded after the initial applyWorld() call below (it's async) —
      // re-apply for the current level so a direct ocean-world deep link still
      // shows ships as soon as they're ready, same fixup as the nature pack.
      applyWorld(gameRef.current.level)
    })

    // Shark obstacle template — CC0 "Shark" by Quaternius (poly.pizza/m/AyHTK3zUSG).
    // Cloned per-spawn inside spawnObstacle() below; the initial synchronous
    // obstacle spawns happen before this async load resolves, so callers must
    // null-check and fall back (see the ocean branch of spawnObstacle).
    let sharkTemplate: THREE.Group | null = null
    const sharkLoader = new GLTFLoader()
    sharkLoader.load('/models/nature/Shark.glb', gltf => {
      const src = gltf.scene
      // Skinned mesh with a deep node hierarchy carrying large baked scales
      // (Armature x100, mesh node x~159) — Box3().setFromObject() is unusable
      // for calibration here (bind-pose confusion on a detached template), so
      // this was sized against live in-game screenshots instead, comparing its
      // on-screen width to the fox's (~0.85) at matched camera distance.
      src.scale.setScalar(0.09)
      src.rotation.y = Math.PI / 2
      src.traverse(child => {
        const m = child as THREE.Mesh
        if (m.isMesh) { m.castShadow = true }
      })
      sharkTemplate = src
      // Obstacles are a fixed pool spawned once at mount and only repositioned
      // afterward (never re-rolled) — this load almost always loses the race
      // against that initial synchronous spawn, so any coral fallback minted
      // in shark's slot needs upgrading retroactively once the model is ready.
      obstacles.forEach(o => {
        if (!o.mesh.userData.isSharkFallback) return
        const pos = o.mesh.position
        scene.remove(o.mesh)
        const shark = cloneSkinned(sharkTemplate!)
        shark.position.copy(pos)
        scene.add(shark)
        o.mesh = shark
      })
    })

    // Surfboard — loaded further down once foxGroup exists (its mount point),
    // but declared here so applyWorld()'s very first call (before it's loaded)
    // can safely null-check it, same pattern as oceanShips/waterPlane above.
    let surfboardMesh: THREE.Object3D | null = null

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.35, 0.4, 0.6
    )

    function applyWorld(lv: number) {
      const worldIdx = (lv - 1) % WORLDS.length
      const world = WORLDS[worldIdx]
      scene.background = new THREE.Color(world.sky)
      ;(scene.fog as THREE.Fog).color.set(world.fog)
      if (worldIdx === 1) {
        // Winter — trees keep their own GLTF textures/materials; only fog, sky and
        // ground react to the world so lighting stays consistent (no forced recolor).
        bloomPass.strength = 0.1
        bloomPass.threshold = 0.6
        pathMat.map = snowPathTex; pathMat.needsUpdate = true
        grassMat.map = snowTex; grassMat.color.set(0xddeeff); grassMat.needsUpdate = true
        segments.forEach(seg => { seg.visible = true })
        pathEdges.forEach(e => { e.visible = true })
        laneDashes.forEach(d => { d.visible = true })
        grassSegments.forEach(seg => { seg.visible = true })
        hillSegments.forEach(seg => { seg.visible = true })
        trees.forEach(tree => { tree.visible = true })
        bushes.forEach(b => { b.visible = true })
        desertCacti.forEach(c => { c.visible = false })
        oceanIslands.forEach(o => { o.visible = false })
        oceanShips.forEach(s => { s.visible = false })
        if (surfboardMesh) surfboardMesh.visible = false
        waterPlane.visible = false
        mountains.forEach(m => { m.visible = true })
        if (particles) particles.visible = true
        switchMusic('/sounds/forest-story-hyperfusion.mp3')
      } else if (worldIdx === 2) {
        // Desert
        bloomPass.strength = 0.2
        bloomPass.threshold = 0.6
        pathMat.map = sandPathTex; pathMat.needsUpdate = true
        grassMat.map = sandTex; grassMat.color.set(0xc2a45a); grassMat.needsUpdate = true
        segments.forEach(seg => { seg.visible = true })
        pathEdges.forEach(e => { e.visible = true })
        laneDashes.forEach(d => { d.visible = true })
        grassSegments.forEach(seg => { seg.visible = true })
        hillSegments.forEach(seg => { seg.visible = true })
        trees.forEach(tree => { tree.visible = false })
        bushes.forEach(b => { b.visible = false })
        desertCacti.forEach(c => { c.visible = true })
        oceanIslands.forEach(o => { o.visible = false })
        oceanShips.forEach(s => { s.visible = false })
        if (surfboardMesh) surfboardMesh.visible = false
        waterPlane.visible = false
        mountains.forEach(m => { m.visible = true })
        if (particles) particles.visible = false
        switchMusic('/sounds/fox-run-music-1.mp3')
      } else if (worldIdx === 3) {
        // Ocean — the fox surfs directly on the water: hide the path deck/curbs
        // and the grass/hill ground so the wave-shader water plane is the only
        // surface visible underneath, and swap in palm-islet horizon decor
        // instead of trees/desert cacti.
        // Lowered from 0.45 — that overexposed the water's specular
        // highlights into blown-out white blobs instead of readable foam.
        bloomPass.strength = 0.22
        // Raised from the shared 0.6 default — water's specular highlights
        // sit close to white, so the default threshold still bloomed them
        // into blown-out patches even at low strength.
        bloomPass.threshold = 0.82
        segments.forEach(seg => { seg.visible = false })
        pathEdges.forEach(e => { e.visible = false })
        laneDashes.forEach(d => { d.visible = false })
        grassSegments.forEach(seg => { seg.visible = false })
        hillSegments.forEach(seg => { seg.visible = false })
        trees.forEach(tree => { tree.visible = false })
        bushes.forEach(b => { b.visible = false })
        desertCacti.forEach(c => { c.visible = false })
        oceanIslands.forEach(o => { o.visible = true })
        oceanShips.forEach(s => { s.visible = true })
        if (surfboardMesh) surfboardMesh.visible = true
        waterPlane.visible = true
        // Sea stacks read as too dense/regular at the full nature-pack
        // spawn count — keep roughly a third of them for a sparser horizon.
        mountains.forEach((m, i) => { m.visible = i % 3 === 0 })
        if (particles) particles.visible = false
        // No dedicated ocean/sea track in /sounds/ yet — reusing an existing
        // track as a placeholder until one is added.
        switchMusic('/sounds/forest-story.mp3')
      } else {
        bloomPass.strength = 0.35
        bloomPass.threshold = 0.6
        pathMat.map = groundTex; pathMat.needsUpdate = true
        grassMat.map = grassTex; grassMat.color.set(0x3a7a2a); grassMat.needsUpdate = true
        segments.forEach(seg => { seg.visible = true })
        pathEdges.forEach(e => { e.visible = true })
        laneDashes.forEach(d => { d.visible = true })
        grassSegments.forEach(seg => { seg.visible = true })
        hillSegments.forEach(seg => { seg.visible = true })
        trees.forEach(tree => { tree.visible = true })
        bushes.forEach(b => { b.visible = true })
        desertCacti.forEach(c => { c.visible = false })
        oceanIslands.forEach(o => { o.visible = false })
        oceanShips.forEach(s => { s.visible = false })
        if (surfboardMesh) surfboardMesh.visible = false
        waterPlane.visible = false
        mountains.forEach(m => { m.visible = true })
        if (particles) particles.visible = true
        switchMusic(musicTracks[Math.floor(Math.random() * musicTracks.length)])
      }
      const snowOn = worldIdx === 1 ? 1 : 0
      snowMaterials.forEach(m => { m.userData.snowUniform.value = snowOn })
    }

    // --- FOX ---
    const foxGroup = new THREE.Group()
    scene.add(foxGroup)

    // Surfboard — CC-BY 3.0 "Surfboard" by jeremy (poly.pizza/m/3js4cQ-O-p2),
    // mounted as a foxGroup child so it inherits lerp/bank-tilt for free, same
    // as everything else attached there. Verified against a live render (not
    // guessed): raw mesh is authored upright, length along local Y (matching
    // its thumbnail pose), width along local Z (tapers at nose/tail, widest
    // ~8.62 at the middle), thickness along local X — deck (chevron-striped
    // face) has its normal on local +X, hull bulk toward -X.
    const surfLoader = new GLTFLoader()
    surfLoader.load('/models/nature/Surfboard.glb', gltf => {
      const board = gltf.scene
      // Non-uniform: the raw mesh's length:width ratio (~5:1) is too narrow
      // for a board a fox stands on at any single uniform scale — sized for
      // fox proportions (body width ~0.85) it'd be an oversized 5.7 units
      // long. Scaling axes independently instead gets a believably-wide
      // board (1.1, noticeably wider than the fox) at a reasonable length
      // (2.2) without the chunky over-thick hull uniform scaling produced.
      // X=thickness, Y=length, Z=width (pre-rotation, local axes).
      board.scale.set(0.032, 0.0511, 0.1276)
      // Exact 120° rotation about the (1,1,1) axis — the permutation matrix
      // that remaps local X(thickness)->world Y(up), Y(length)->world
      // Z(forward), Z(width)->world X(side), so the board lies flat with the
      // deck (local +X normal) facing up.
      board.quaternion.setFromAxisAngle(new THREE.Vector3(1, 1, 1).normalize(), (2 * Math.PI) / 3)
      board.position.set(0, -0.04, -0.16)
      board.traverse(child => {
        const m = child as THREE.Mesh
        if (m.isMesh) { m.castShadow = true; m.receiveShadow = true }
      })
      board.visible = false
      foxGroup.add(board)
      surfboardMesh = board
      applyWorld(gameRef.current.level)
    })

    // Console-inspectable scene handle for manual debugging (e.g.
    // window.__debugScene.state in Safari Web Inspector). obstacles/state
    // are declared further below but the forward references are fine here
    // since these are type-only (interfaces aren't subject to TDZ).
    interface FoxRunDebugScene {
      camera: THREE.PerspectiveCamera
      gameRef: typeof gameRef
      obstacles: () => Obstacle[]
      oceanIslands: THREE.Group[]
      THREE: typeof THREE
      state?: typeof state
    }

    applyWorld(selectedLevel ?? 1)
    ;(window as unknown as Window & { __debugScene: FoxRunDebugScene }).__debugScene = {
      camera, gameRef, obstacles: () => obstacles, oceanIslands, THREE,
    }

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
      mesh: THREE.Object3D
      glow: THREE.Object3D
      char: string
      lane: number
      collected: boolean
      isCorrectPair?: boolean
    }
    const letterOrbs: LetterOrb[] = []

    const fontLoadPromise: Promise<void> = (async () => {
      const font = new FontFace('Nunito', 'url(https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTQ3j6zbXWjgeg.woff2)')
      await font.load()
      document.fonts.add(font)
    })()

    // Word-sign texture cache (desert word-pair mechanic) — reuses the 1024x512
    // CanvasTexture for a given word instead of re-rasterizing + re-uploading it
    // to the GPU on every spawn. Bounded LRU so a long session doesn't just grow
    // the leak more slowly: oldest entry is disposed once the cap is hit.
    const wordTextureCache = new Map<string, THREE.CanvasTexture>()
    const WORD_TEXTURE_CACHE_LIMIT = 24
    function getWordTexture(word: string): THREE.CanvasTexture {
      const cached = wordTextureCache.get(word)
      if (cached) {
        // touch: move to the end so it's the most-recently-used entry
        wordTextureCache.delete(word)
        wordTextureCache.set(word, cached)
        return cached
      }
      const cv = document.createElement('canvas')
      cv.setAttribute('lang', 'bg'); cv.width = 1024; cv.height = 512
      const cx = cv.getContext('2d')!
      cx.clearRect(0, 0, 1024, 512)
      cx.fillStyle = 'rgba(10,20,80,0.95)'
      cx.roundRect(16, 16, 992, 480, 40); cx.fill()
      cx.fillStyle = '#ffffff'
      const fontSize = word.length > 6 ? 140 : word.length > 4 ? 170 : 200
      cx.font = `bold ${fontSize}px Nunito, Arial, sans-serif`
      cx.textAlign = 'center'; cx.textBaseline = 'middle'
      cx.fillText(word, 512, 270)
      const tex = new THREE.CanvasTexture(cv)
      wordTextureCache.set(word, tex)
      if (wordTextureCache.size > WORD_TEXTURE_CACHE_LIMIT) {
        const oldestKey = wordTextureCache.keys().next().value
        if (oldestKey !== undefined) {
          wordTextureCache.get(oldestKey)?.dispose()
          wordTextureCache.delete(oldestKey)
        }
      }
      return tex
    }

    // SpriteMaterial is per-instance (not shared), so it's always safe to dispose
    // on removal — but its .map is a cached texture that may still be referenced
    // by other live/cached sprites, so it must NOT be disposed here.
    function disposeWordSprite(obj: THREE.Object3D) {
      const mat = (obj as THREE.Sprite).material as THREE.SpriteMaterial | undefined
      mat?.dispose()
    }

    function drawWordOrb(word: string, lane: number, zPos: number, isCorrect: boolean) {
      const tex = getWordTexture(word)
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }))
      sprite.scale.set(3.5, 1.8, 1)
      sprite.position.set(lane * LANE_WIDTH, 1.8, zPos)
      scene.add(sprite)
      letterOrbs.push({ mesh: sprite, glow: sprite, char: word, lane, collected: false, isCorrectPair: isCorrect })
    }

    async function spawnLetter(zPos: number) {
      await fontLoadPromise
      const g = gameRef.current

      // Ниво 3: огромни спрайт орби
      if (g.level === 3) {
        const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)]
        const correctLeft = Math.random() > 0.5
        drawWordOrb(pair[0], correctLeft ? -1 : 1, zPos, true)
        drawWordOrb(pair[1], correctLeft ? 1 : -1, zPos, false)
        return
      }

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
    interface Obstacle { mesh: THREE.Object3D; lane: number; type: 'rock' | 'log' | 'bush' }
    const obstacles: Obstacle[] = []

    // Ocean obstacles — seaweed/coral are cheap procedural groups (no CC0
    // model matched the nature-pack style on poly.pizza), same "clustered
    // small primitives" pattern as the desert cactus below. Colors/shapes
    // random per spawn so a run doesn't look like copy-pasted obstacles.
    function makeSeaweed(): THREE.Group {
      const g = new THREE.Group()
      const colors = [0x1f7a4d, 0x2a9c5f, 0x186b42]
      for (let i = 0; i < 3; i++) {
        const h = 0.8 + Math.random() * 0.5
        const frond = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.07, h, 6),
          new THREE.MeshLambertMaterial({ color: colors[i % colors.length] })
        )
        frond.position.set((Math.random() - 0.5) * 0.25, h / 2, (Math.random() - 0.5) * 0.25)
        frond.rotation.z = (Math.random() - 0.5) * 0.5
        frond.rotation.x = (Math.random() - 0.5) * 0.3
        frond.castShadow = true
        g.add(frond)
      }
      return g
    }
    function makeCoral(): THREE.Group {
      const g = new THREE.Group()
      const colors = [0xff6f61, 0xff9770, 0xffb570, 0xe8636f]
      for (let i = 0; i < 5; i++) {
        const s = 0.12 + Math.random() * 0.12
        const piece = new THREE.Mesh(
          Math.random() < 0.5 ? new THREE.ConeGeometry(s, s * 2, 6) : new THREE.SphereGeometry(s, 6, 6),
          new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] })
        )
        piece.position.set((Math.random() - 0.5) * 0.5, s, (Math.random() - 0.5) * 0.5)
        piece.castShadow = true
        g.add(piece)
      }
      return g
    }

    function spawnObstacle(zPos: number) {
      const lane = [-1, 0, 1][Math.floor(Math.random() * 3)]
      const roll = Math.random()
      const lvl = gameRef.current.level
      const isWinter = lvl === 2
      const isDesert = lvl === 3
      const isOcean = lvl === 4

      if (isOcean) {
        let group: THREE.Group
        let type: 'rock' | 'log' | 'bush'
        if (roll < 0.33) { group = makeSeaweed(); type = 'log' }
        else if (roll < 0.66) { group = makeCoral(); type = 'rock' }
        else if (sharkTemplate) { group = cloneSkinned(sharkTemplate) as THREE.Group; type = 'bush' }
        else {
          // Template not loaded yet — stand in with coral, tagged so the
          // sharkLoader callback can retroactively swap it in once ready.
          group = makeCoral(); type = 'bush'
          group.userData.isSharkFallback = true
        }
        group.position.set(lane * LANE_WIDTH, 0.15, zPos)
        scene.add(group)
        obstacles.push({ mesh: group, lane, type })
        return
      }

      let geo: THREE.BufferGeometry
      let mat: THREE.MeshLambertMaterial
      let type: 'rock' | 'log' | 'bush'
      let posY: number

      if (roll < 0.33) {
        // Log / Ice log / Cactus
        if (isDesert) {
          // Кактус — вертикален цилиндър + две ръце
          geo = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 6)
          mat = new THREE.MeshLambertMaterial({ color: 0x4a7c2f })
          type = 'log'; posY = 0.6
        } else {
          geo = new THREE.CylinderGeometry(0.25, 0.25, LANE_WIDTH * 0.8, 8)
          mat = new THREE.MeshLambertMaterial({ color: isWinter ? 0xddeeff : 0x8B5E3C })
          type = 'log'; posY = 0.25
        }
      } else if (roll < 0.66) {
        geo = new THREE.DodecahedronGeometry(0.45, 0)
        mat = new THREE.MeshLambertMaterial({ color: isWinter ? 0xa8d8ea : isDesert ? 0xc19a6b : 0x667788 })
        type = 'rock'; posY = 0.45
      } else {
        // Bush / Snow bush / Tumbleweed
        if (isDesert) {
          geo = new THREE.TorusGeometry(0.3, 0.1, 6, 8)
          mat = new THREE.MeshLambertMaterial({ color: 0xd4a853 })
        } else {
          geo = new THREE.SphereGeometry(0.5, 8, 8)
          mat = new THREE.MeshLambertMaterial({ color: isWinter ? 0xffffff : 0x2d7a2d })
        }
        type = 'bush'; posY = 0.5
      }

      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(lane * LANE_WIDTH, posY, zPos)
      if (type === 'log' && !isDesert) mesh.rotation.z = Math.PI / 2
      mesh.castShadow = true
      scene.add(mesh)
      obstacles.push({ mesh, lane, type })

      // Кактус ръце
      if (isDesert && type === 'log') {
        const armMat = new THREE.MeshLambertMaterial({ color: 0x4a7c2f })
        const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 6), armMat)
        lArm.rotation.z = Math.PI / 2
        lArm.position.set(lane * LANE_WIDTH - 0.28, posY + 0.1, zPos)
        scene.add(lArm); obstacles.push({ mesh: lArm, lane, type: 'log' })
        const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 6), armMat)
        rArm.rotation.z = Math.PI / 2
        rArm.position.set(lane * LANE_WIDTH + 0.28, posY + 0.1, zPos)
        scene.add(rArm); obstacles.push({ mesh: rArm, lane, type: 'log' })
      }

      // Зимни снежни конусчета около храст
      if (isWinter && type === 'bush') {
        const snowMat = new THREE.MeshLambertMaterial({ color: 0xffffff })
        for (let s = 0; s < 4; s++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 5), snowMat)
          const angle = (s / 4) * Math.PI * 2
          spike.position.set(Math.cos(angle) * 0.35, posY + 0.1, Math.sin(angle) * 0.35)
          scene.add(spike); obstacles.push({ mesh: spike, lane, type: 'bush' })
        }
      }
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
    particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

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
    let sfxBufCollect: AudioBuffer | null = null
    let sfxBufWrong: AudioBuffer | null = null
    let sfxBufWin: AudioBuffer | null = null
    ;(async () => {
      sfxBufCollect = await loadAudioBuffer('/sounds/coin-collect.mp3')
      sfxBufWrong   = await loadAudioBuffer('/sounds/wrong.mp3')
      sfxBufWin     = await loadAudioBuffer('/sounds/fox-run-win.mp3')
    })()

    function playCollect() { playOnce(sfxBufCollect, 0.55) }
    function playWrong()   { playOnce(sfxBufWrong,   0.35) }

    // --- GAME STATE ---
    const state = {
      speed: 11,
      currentLane: 0,
      targetX: 0,
      foxX: 0, // continuous drag-steer X target, ocean world only
      waveBob: 0, // lerped vertical offset following the water surface height
      wavePitch: 0, // lerped rotation.x following the wave's local slope
      isJumping: false,
      jumpVelocity: 0,
      foxY: 0,
      isSliding: false,
      slideTimer: 0,
      runTime: 0,
      invincible: 0,
      letterSpawnTimer: startLevel === 3 ? -6 : startLevel === 1 ? -11 : 1.5,
      obstacleSpawnZ: startLevel === 1 ? -80 - 6 * 22 : -35 - 6 * 22,
    }
    console.log('letterSpawnTimer init:', state.letterSpawnTimer, 'startLevel:', startLevel)
    ;(window as unknown as Window & { __debugScene: FoxRunDebugScene }).__debugScene.state = state

    const JUMP_FORCE = 9
    const GRAVITY = -22
    const SLIDE_DURATION = 0.7

    // --- INPUT ---
    const keys: Record<string, boolean> = {}
    let laneChangeCooldown = 0
    

    function handleKeyDown(e: KeyboardEvent) {
      if (keys[e.code]) return
      keys[e.code] = true
      // Ocean world: arrows are polled every frame in animate() as continuous
      // drag-steer input (state.foxX), matching the touchmove control scheme,
      // instead of the discrete per-press moveLane() used elsewhere.
      if (currentWorldIdx() !== 3) {
        if (e.code === 'ArrowLeft') moveLane(-1)
        if (e.code === 'ArrowRight') moveLane(1)
      }
      if (e.code === 'ArrowUp' || e.code === 'Space') { e.preventDefault(); jump() }
      if (e.code === 'ArrowDown') slide()
    }
    function handleKeyUp(e: KeyboardEvent) { keys[e.code] = false }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    let touchStartX = 0, touchStartY = 0
    let oceanTouchX = 0
    function onTouchStart(e: TouchEvent) {
      unlockAndStartAudio()
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
      oceanTouchX = touchStartX
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
    // Continuous drag-steer — active only while the ocean world (index 3) is
    // current. Discrete moveLane()/currentLane logic above is untouched; this
    // just drives state.foxX, which the ocean branch of the animate loop lerps
    // foxGroup.position.x toward instead of state.targetX.
    function currentWorldIdx() { return (gameRef.current.level - 1) % WORLDS.length }
    function onOceanTouchMove(e: TouchEvent) {
      if (currentWorldIdx() !== 3) return
      e.preventDefault()
      const x = e.touches[0].clientX
      const dx = x - oceanTouchX
      oceanTouchX = x
      state.foxX = Math.max(-LANE_WIDTH * 1.5, Math.min(LANE_WIDTH * 1.5, state.foxX + dx * 0.03))
    }
    container.addEventListener('touchstart', onTouchStart)
    container.addEventListener('touchend', onTouchEnd)
    container.addEventListener('touchmove', onOceanTouchMove, { passive: false })

    function playSfx(buf: AudioBuffer | null, volume: number) { playOnce(buf, volume) }

    function moveLane(dir: number) {
      if (laneChangeCooldown > 0) return
      const n = Math.max(-1, Math.min(1, state.currentLane + dir))
      if (n !== state.currentLane) {
        state.currentLane = n; state.targetX = n * LANE_WIDTH
        laneChangeCooldown = 0.22
        playSfx(dir > 0 ? sfxBufRight : sfxBufLeft, 0.4)
      }
    }
    function jump() {
      if (!state.isJumping && !state.isSliding) {
        state.isJumping = true; state.jumpVelocity = JUMP_FORCE
        playSfx(sfxBufJump, 0.5)
      }
    }
    function slide() {
      if (!state.isJumping && !state.isSliding) {
        state.isSliding = true; state.slideTimer = SLIDE_DURATION
        playSfx(sfxBufJump, 0.5)
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
      oceanTimeUniform.value += dt
      if (mixer) mixer.update(dt)
      state.speed = Math.min(12 + state.runTime * 0.25, 20 + gameRef.current.level * 2)
      if (runSoundSource) runSoundSource.playbackRate.value = Math.min(1 + state.runTime * 0.008, 1.6)
      if (laneChangeCooldown > 0) laneChangeCooldown -= dt
      if (state.invincible > 0) state.invincible -= dt

      // Lane lerp — ocean world lerps toward the continuous drag target
      // (state.foxX) instead of the discrete lane target (state.targetX).
      const isOceanWorld = currentWorldIdx() === 3
      if (isOceanWorld) {
        // Keyboard drag-steer: polling held keys here (rather than stepping
        // state.foxX once per keydown) gives smooth continuous motion that
        // matches onOceanTouchMove's feel, and sidesteps inconsistent browser
        // key-repeat timing.
        const KEY_STEER_SPEED = 6
        if (keys.ArrowLeft) state.foxX -= KEY_STEER_SPEED * dt
        if (keys.ArrowRight) state.foxX += KEY_STEER_SPEED * dt
        state.foxX = Math.max(-LANE_WIDTH * 1.5, Math.min(LANE_WIDTH * 1.5, state.foxX))
        state.targetX = state.foxX
      } else {
        state.foxX = foxGroup.position.x // keep primed for a seamless handoff into ocean mode
      }
      const lerpTargetX = isOceanWorld ? state.foxX : state.targetX
      foxGroup.position.x += (lerpTargetX - foxGroup.position.x) * dt * 12

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

      // Ocean-only: ride the water's vertical profile instead of the gallop
      // bounce. Wave height/slope sampled with the exact same formula as the
      // water shader (see waterMat.onBeforeCompile above), converting the
      // fox's world position into the water plane's local space (plane is
      // unrotated-scale, only translated+rotated -90° about X, so local
      // x = worldX - plane.x, local y = plane.z - worldZ). foxGroup.position.z
      // is always 0 (the fox never actually translates in Z — see the
      // "camera and fox never move in Z" note by the water plane setup), so
      // this is really "how does the animated wave look under a fixed X,Z
      // point over time," which is what makes it move at all.
      let waveBobTarget = 0
      let wavePitchTarget = 0
      if (isOceanWorld) {
        const t = oceanTimeUniform.value
        const localX = foxGroup.position.x - waterPlane.position.x
        const localY = waterPlane.position.z - foxGroup.position.z
        const waveArg2 = localX * 1.1 - localY * 0.6 + t * 1.8
        waveBobTarget = Math.sin(localX * 0.45 + t * 1.1) * 0.16 + Math.sin(waveArg2) * 0.08
        // d(wave)/d(worldZ) — same 0.08/0.6 coefficients as the height term
        // above, chain-ruled through localY = plane.z - worldZ.
        const waveSlope = 0.08 * 0.6 * Math.cos(waveArg2)
        wavePitchTarget = Math.max(-0.12, Math.min(0.12, waveSlope * 2.5))
      }
      state.waveBob += (waveBobTarget - state.waveBob) * dt * 4
      state.wavePitch += (wavePitchTarget - state.wavePitch) * dt * 4

      // Fox position & animation — no gallop bounce while surfing (ocean world
      // stands on the board; wave bob above carries it instead).
      const bob = state.isJumping || state.isSliding ? 0 : (isOceanWorld ? state.waveBob : Math.sin(state.runTime * 13) * 0.055)
      foxGroup.position.y = state.foxY + bob

      // Animation state
      if (state.isSliding) playAnim('Idle_2_HeadLow', true)
      else if (state.isJumping) playAnim('Gallop_Jump', false)
      else if (isOceanWorld) playAnim('Idle', true)
      else playAnim('Gallop', true)

      // Slide tilt / ocean wave pitch (down the wave's front, up its back)
      foxGroup.rotation.x = state.isSliding ? 0.25 : (isOceanWorld ? state.wavePitch : 0)

      // Tilt on lane change / bank tilt while drag-steering in the ocean world.
      // The lerp error is proportional to velocity (exponential lerp), so the
      // same term drives both — ocean gets a wider swing clamped to ±0.3 rad,
      // which relaxes back to 0 as foxGroup.position.x catches up to the target.
      const tilt = (lerpTargetX - foxGroup.position.x) * (isOceanWorld ? 1.4 : 0.25)
      foxGroup.rotation.z = isOceanWorld ? Math.max(-0.3, Math.min(0.3, -tilt)) : -tilt * 0.5
      foxGroup.rotation.y = isOceanWorld ? 0 : tilt * 0.25



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
      desertCacti.forEach(c => {
        c.position.z += moveZ
        if (c.position.z > 10) {
          const side = c.position.x > 0 ? 1 : -1
          c.position.z -= NUM_SEGMENTS * SEGMENT_LENGTH + Math.random() * 20
          c.position.x = side * (PATH_WIDTH / 2 + 2 + Math.random() * 9)
        }
      })
      oceanIslands.forEach(o => {
        o.position.z += moveZ
        if (o.position.z > 10) {
          const side = o.position.x > 0 ? 1 : -1
          o.position.z -= NUM_SEGMENTS * SEGMENT_LENGTH + Math.random() * 20
          o.position.x = side * (PATH_WIDTH / 2 + 14 + Math.random() * 20)
        }
      })
      oceanShips.forEach(sh => {
        sh.position.z += moveZ
        if (sh.position.z > 10) {
          const side = sh.position.x > 0 ? 1 : -1
          sh.position.z -= NUM_SEGMENTS * SEGMENT_LENGTH + Math.random() * 20
          sh.position.x = side * (PATH_WIDTH / 2 + 20 + Math.random() * 14)
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
      bushes.forEach(b => {
        b.position.z += moveZ
        if (b.position.z > 10) {
          const side = b.position.x > 0 ? 1 : -1
          b.position.z -= NUM_SEGMENTS * SEGMENT_LENGTH + Math.random() * 10
          b.position.x = side * (PATH_WIDTH / 2 + 0.5 + Math.random() * 2.5)
        }
      })
      mountains.forEach(m => {
        m.position.z += moveZ
        if (m.position.z > 10) {
          const side = m.position.x > 0 ? 1 : -1
          m.position.z -= NUM_SEGMENTS * SEGMENT_LENGTH + Math.random() * 20
          m.position.x = side * (PATH_WIDTH / 2 + grassWidth + 6 + Math.random() * 8)
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
      for (const orb of letterOrbs) {
        if (orb.collected) continue
        orb.mesh.position.z += moveZ
        if (orb.isCorrectPair === undefined) {
          orb.glow.position.z += moveZ
          orb.mesh.rotation.y += dt * 1.5
          orb.glow.rotation.z += dt * 2
          orb.mesh.position.y = 1.1 + Math.sin(state.runTime * 3 + orb.lane) * 0.18
          orb.glow.position.y = orb.mesh.position.y
        }

        // Collision with fox
        const dx = foxGroup.position.x - orb.mesh.position.x
        const foxHeight = state.foxY
        const dz = orb.mesh.position.z - 0

        // Level 3: large sprite orbs
        if (orb.isCorrectPair !== undefined) {
          if (Math.abs(dx) < 1.5 && dz > -1.2 && dz < 2.0 && foxHeight < 0.8 && !state.isSliding) {
            for (const o of letterOrbs) {
              if (o.isCorrectPair !== undefined && !o.collected) {
                scene.remove(o.mesh); disposeWordSprite(o.mesh); o.collected = true
              }
            }
            const g = gameRef.current
            if (orb.isCorrectPair) {
              playCollect(); spawnBurst(orb.mesh.position.clone(), 0xFFD700)
              const newScore = g.score + 30; g.score = newScore; setScore(newScore)
              g.wordsCompletedInLevel++
              setWordsCompletedInLevel(g.wordsCompletedInLevel)
              if (g.wordsCompletedInLevel >= (g.level === 3 ? DESERT_WORDS_TARGET : g.level + 4)) {
                setLevelComplete(true)
                setTimeout(() => {
                  g.level++; g.wordsCompletedInLevel = 0
                  setLevel(g.level); setWordsCompletedInLevel(0); setLevelComplete(false)
                  state.runTime = 0; g.lives = 3; setLives(3)
                  applyWorld(g.level)
                  shuffle(wordDeck); wordDeckIndex = 0
                  const nextWord = getNextWord()
                  g.targetWord = nextWord; g.collected = []; g.collectedIndices = new Set()
                  setTargetWord(nextWord); setCollected([])
                  const bonus = g.score + 100; g.score = bonus; setScore(bonus)
                }, 2000)
              }
            } else {
              playWrong(); spawnBurst(orb.mesh.position.clone(), 0xff4444)
              if (state.invincible <= 0) {
                state.invincible = 2.5
                const newLives = g.lives - 1; g.lives = newLives; setLives(newLives)
                if (newLives <= 0) { g.dead = true; setGameOver(true) }
              }
            }
          }
          // Recycle off-screen — skipped pairs (player ran past without touching
          // either sign) never hit the collision branch above, so without this
          // they'd fly behind the camera and sit in the scene graph forever.
          if (!orb.collected && orb.mesh.position.z > 3) {
            scene.remove(orb.mesh); disposeWordSprite(orb.mesh); orb.collected = true
          }
          continue
        }

        if (Math.abs(dx) < 1.0 && dz > -1.2 && dz < 2.0 && foxHeight < 0.8 && !state.isSliding) {
          orb.collected = true
          scene.remove(orb.mesh); scene.remove(orb.glow)
          const g = gameRef.current

          // --- НОРМАЛНА ЛОГИКА (нива 1-2) ---
          const wordArr = g.targetWord.split('')
          if (!g.collectedIndices) g.collectedIndices = new Set<number>()
          const indices = g.collectedIndices as Set<number>
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
              playOnce(sfxBufWin, 0.32)
              // Word complete!
              setTimeout(() => {
                g.wordsCompletedInLevel++
                const wordsNeeded = g.level + 4
                const bonus = g.score + 50
                g.score = bonus; setScore(bonus)
                if (g.wordsCompletedInLevel >= wordsNeeded) {
                  setWordsCompletedInLevel(g.wordsCompletedInLevel)
                  setLevelComplete(true)
                  setTimeout(() => {
                    g.level++; g.wordsCompletedInLevel = 0
                    setLevel(g.level); setWordsCompletedInLevel(0); setLevelComplete(false)
                    state.runTime = 0
                    g.lives = 3; setLives(3)
                    applyWorld(g.level)
                    shuffle(wordDeck); wordDeckIndex = 0
                    const nextWord = getNextWord()
                    g.targetWord = nextWord; g.collected = []; g.collectedIndices = new Set()
                    setTargetWord(nextWord); setCollected([])
                    const lvlBonus = g.score + 100; g.score = lvlBonus; setScore(lvlBonus)
                  }, 2000)
                } else {
                  setWordsCompletedInLevel(g.wordsCompletedInLevel)
                  const nextWord = getNextWord()
                  g.targetWord = nextWord; g.collected = []; g.collectedIndices = new Set()
                  setTargetWord(nextWord); setCollected([])
                }
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
      }

      // Spawn new letters — timer-based, ~3-4s interval
      state.letterSpawnTimer -= dt
      if (state.letterSpawnTimer <= 0) {
        const spawnDist = startLevel === 1 && state.runTime < 12 ? state.speed * 8 : state.speed * 3.5
        spawnLetter(-spawnDist)
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
    composer.addPass(bloomPass)

    animate()

    if (startLevel !== 1) spawnLetter(-20)



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
      container.removeEventListener('touchmove', onOceanTouchMove)
      if (musicSource) { try { musicSource.stop() } catch {} }
      if (runSoundSource) { try { runSoundSource.stop() } catch {} }
      audioCtx.close()
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [selectedLevel])

  const WORLD_META = [
    { icon: '🌲', label: 'Гора',    card: 'bg-green-500 border-green-300',               text: 'text-white' },
    { icon: '❄️', label: 'Зима',    card: 'bg-blue-200 border-blue-100',                 text: 'text-blue-900' },
    { icon: '🏜️', label: 'Пустиня', card: 'bg-yellow-400 border-yellow-200',             text: 'text-white' },
    { icon: '🌊', label: 'Море',    card: 'bg-cyan-400 border-cyan-200',                 text: 'text-white' },
    { icon: '🌙', label: 'Нощ',     card: 'bg-purple-800 border-purple-400',             text: 'text-white' },
  ]

  // Same markup shape server and client render before the mount effect above
  // has run — this is what actually fixes the hydration mismatch. Once
  // levelParamChecked flips, we know whether a ?level= param was present and
  // can skip straight to the game without ever painting the select screen.
  if (!levelParamChecked) {
    return <div className="w-full h-screen bg-black" />
  }

  if (selectedLevel === null) {
    return (
      <div className="relative w-full h-screen bg-gradient-to-b from-green-800 to-green-950 overflow-hidden flex flex-col items-center justify-center gap-6">
        <button onClick={() => router.push('/games')}
          className="absolute top-4 left-4 z-10 bg-black/40 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border border-white/20 hover:bg-black/60 transition-all">
          ← Назад
        </button>
        <h1 className="text-yellow-300 text-5xl font-bold tracking-tight drop-shadow-lg">🦊 Избери свят!</h1>
        <p className="text-white/80 text-base font-medium">Събирай думи и отключвай нови светове!</p>
        <div className="grid grid-cols-3 gap-4 px-6 sm:grid-cols-5">
          {WORLD_META.map((w, i) => {
            const lvl = i + 1
            const unlocked = true // TODO: върни заключването преди launch
            return (
              <button
                key={lvl}
                disabled={!unlocked}
                onClick={() => unlocked && setSelectedLevel(lvl)}
                className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${w.card} ${w.text}
                  ${unlocked ? 'hover:scale-110 cursor-pointer shadow-lg' : 'opacity-40 cursor-not-allowed'}`}
              >
                <span className="text-5xl">{unlocked ? w.icon : '🔒'}</span>
                <span className="font-bold text-lg">{lvl}</span>
                <span className="text-xs opacity-80">{w.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Back */}
      {/* Word UI — скрито при ниво 3 */}
      {level !== 3 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <div className="text-white/50 text-xs uppercase tracking-widest">Събери думата</div>
          <div className="flex justify-center gap-1">
            {(targetWord || '').split('').map((letter, i) => (
              <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                collected[i]
                  ? 'bg-yellow-400 border-yellow-300 text-gray-900 scale-110'
                  : 'bg-black/40 border-white/20 text-gray-600'
              }`}>
                {collected[i] ?? letter}
              </div>
            ))}
          </div>
          <div className="text-white/60 text-xs font-medium">
            Ниво {level} • {wordsCompletedInLevel}/{level + 4} думи
          </div>
          <div className="text-white/40 text-xs">Събери буквите за всяка дума</div>
        </div>
      )}
      {/* Ниво 3 индикатор */}
      {level === 3 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
          <div className="text-white/60 text-xs font-medium">
            Верни: {wordsCompletedInLevel}/{DESERT_WORDS_TARGET}
          </div>
        </div>
      )}


      {/* Level complete overlay */}
      {levelComplete && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-6xl mb-3">🎉</div>
            <h2 className="text-white text-4xl font-bold mb-1">Ниво {level} завършено!</h2>
            <p className="text-yellow-400 text-xl">Напред към ниво {level + 1}…</p>
          </div>
        </div>
      )}

      {/* Score */}
      <div className="absolute top-4 right-4 z-10">
        <div className="text-yellow-400 font-bold text-lg">⭐ {score}</div>
      </div>
      {/* Lives */}
      <div className="absolute top-4 left-4 z-10 flex gap-1">
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
