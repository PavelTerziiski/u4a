'use client'

import { useState, useRef } from 'react'
import Fox from '@/components/fox/Fox'

type Phase = 'scan' | 'crop' | 'processing'

type Props = {
  open: boolean
  onClose: () => void
  onResult: (sentences: string[]) => void
  accentColor?: string  // primary color for buttons (default orange)
  title?: string
}

export default function ScanTextModal({
  open,
  onClose,
  onResult,
  accentColor = '#F97316',
  title = 'Снимай текста',
}: Props) {
  const [phase, setPhase] = useState<Phase>('scan')
  const [scanning, setScanning] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropRect, setCropRect] = useState({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 })

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cropContainerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<null | string>(null)
  const dragStart = useRef({ mx: 0, my: 0, rx: 0, ry: 0, rw: 0, rh: 0 })

  if (!open) return null

  const reset = () => {
    setPhase('scan')
    setScanning(false)
    setCropImageSrc(null)
    setCropRect({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 })
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileSelected = (file: File) => {
    const url = URL.createObjectURL(file)
    setCropImageSrc(url)
    setCropRect({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 })
    setPhase('crop')
  }

  const handleCropAndScan = async () => {
    if (!cropImageSrc) return
    setScanning(true)
    setPhase('processing')

    const img = new Image()
    img.onload = async () => {
      const canvas = document.createElement('canvas')
      const cw = Math.round(img.width * cropRect.w)
      const ch = Math.round(img.height * cropRect.h)
      const cx = Math.round(img.width * cropRect.x)
      const cy = Math.round(img.height * cropRect.y)
      const maxSize = 1200
      let w = cw, h = ch
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize }
        else { w = Math.round(w * maxSize / h); h = maxSize }
      }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, cx, cy, cw, ch, 0, 0, w, h)
      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]

      try {
        const res = await fetch('/api/ocr-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        })
        const data = await res.json()
        if (data.text) {
          const parsed = data.text
            .split('\n')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0)
          if (parsed.length > 0) {
            onResult(parsed)
            reset()
            return
          }
        }
        alert('Не успях да разпозная текст. Опитай отново с по-добро осветление.')
        setPhase('scan')
      } catch {
        alert('Грешка при разпознаване. Опитай отново.')
        setPhase('scan')
      } finally {
        setScanning(false)
      }
    }
    img.src = cropImageSrc
  }

  const handleCropPointerDown = (e: React.PointerEvent, handle: string) => {
    e.preventDefault()
    dragging.current = handle
    const el = cropContainerRef.current!
    const rect = el.getBoundingClientRect()
    dragStart.current = {
      mx: (e.clientX - rect.left) / rect.width,
      my: (e.clientY - rect.top) / rect.height,
      rx: cropRect.x, ry: cropRect.y, rw: cropRect.w, rh: cropRect.h,
    }
  }

  const handleCropPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const el = cropContainerRef.current!
    const rect = el.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / rect.width
    const my = (e.clientY - rect.top) / rect.height
    const dx = mx - dragStart.current.mx
    const dy = my - dragStart.current.my
    const { rx, ry, rw, rh } = dragStart.current
    let nx = rx, ny = ry, nw = rw, nh = rh
    const min = 0.1
    if (dragging.current === 'move') {
      nx = Math.max(0, Math.min(1 - rw, rx + dx))
      ny = Math.max(0, Math.min(1 - rh, ry + dy))
    } else {
      if (dragging.current.includes('e')) nw = Math.max(min, Math.min(1 - rx, rw + dx))
      if (dragging.current.includes('s')) nh = Math.max(min, Math.min(1 - ry, rh + dy))
      if (dragging.current.includes('w')) { const d = Math.min(dx, rw - min); nx = rx + d; nw = rw - d }
      if (dragging.current.includes('n')) { const d = Math.min(dy, rh - min); ny = ry + d; nh = rh - d }
    }
    setCropRect({ x: nx, y: ny, w: nw, h: nh })
  }

  // Modal backdrop styles
  const backdrop: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, overflow: 'auto',
  }
  const modal: React.CSSProperties = {
    background: 'white', borderRadius: 24, padding: 24, maxWidth: 480, width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  }

  // CROP phase
  if (phase === 'crop' && cropImageSrc) return (
    <div style={backdrop}>
      <div style={modal}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#374151', textAlign: 'center', marginBottom: 8 }}>Избери текста</h2>
        <p style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>Дръпни ъглите за да изрежеш само текста</p>
        <div
          ref={cropContainerRef}
          onPointerMove={handleCropPointerMove}
          onPointerUp={() => { dragging.current = null }}
          onPointerLeave={() => { dragging.current = null }}
          style={{ position: 'relative', width: '100%', touchAction: 'none', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
        >
          <img src={cropImageSrc} style={{ width: '100%', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${cropRect.y * 100}%`, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${(1 - cropRect.y - cropRect.h) * 100}%`, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'absolute', top: `${cropRect.y * 100}%`, left: 0, width: `${cropRect.x * 100}%`, height: `${cropRect.h * 100}%`, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'absolute', top: `${cropRect.y * 100}%`, right: 0, width: `${(1 - cropRect.x - cropRect.w) * 100}%`, height: `${cropRect.h * 100}%`, background: 'rgba(0,0,0,0.5)' }} />
          </div>
          <div
            onPointerDown={e => handleCropPointerDown(e, 'move')}
            style={{ position: 'absolute', left: `${cropRect.x * 100}%`, top: `${cropRect.y * 100}%`, width: `${cropRect.w * 100}%`, height: `${cropRect.h * 100}%`, border: `2px solid ${accentColor}`, boxSizing: 'border-box', cursor: 'move' }}
          >
            {[['nw','0%','0%'],['ne','0%','100%'],['sw','100%','0%'],['se','100%','100%']].map(([dir, top, left]) => (
              <div key={dir} onPointerDown={e => { e.stopPropagation(); handleCropPointerDown(e, dir) }}
                style={{ position: 'absolute', top, left, width: 22, height: 22, background: accentColor, borderRadius: 4, transform: 'translate(-50%,-50%)', cursor: 'pointer', zIndex: 10 }} />
            ))}
            {[['n','0%','50%'],['s','100%','50%'],['w','50%','0%'],['e','50%','100%']].map(([dir, top, left]) => (
              <div key={dir} onPointerDown={e => { e.stopPropagation(); handleCropPointerDown(e, dir) }}
                style={{ position: 'absolute', top, left, width: 18, height: 18, background: 'white', border: `2px solid ${accentColor}`, borderRadius: '50%', transform: 'translate(-50%,-50%)', cursor: 'pointer', zIndex: 10 }} />
            ))}
          </div>
        </div>
        <button onClick={handleCropAndScan}
          style={{ width: '100%', background: accentColor, color: 'white', fontWeight: 700, padding: '14px', borderRadius: 16, fontSize: 16, marginTop: 16, marginBottom: 8, border: 'none', cursor: 'pointer' }}>
          ✂️ Изрежи и разпознай
        </button>
        <button onClick={() => setPhase('scan')}
          style={{ width: '100%', background: 'white', color: accentColor, border: `2px solid ${accentColor}40`, fontWeight: 700, padding: '10px', borderRadius: 16, cursor: 'pointer' }}>
          ← Снимай отново
        </button>
      </div>
    </div>
  )

  // PROCESSING phase
  if (phase === 'processing') return (
    <div style={backdrop}>
      <div style={{ ...modal, textAlign: 'center' }}>
        <Fox mood="happy" size={120} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#374151', marginTop: 16 }}>Разпознавам текста...</h2>
        <p style={{ color: '#6B7280', marginTop: 8 }}>Това може да отнеме няколко секунди</p>
      </div>
    </div>
  )

  // SCAN phase (default)
  return (
    <div style={backdrop}>
      <div style={{ ...modal, textAlign: 'center' }}>
        <Fox mood="happy" size={120} />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#374151', marginTop: 12, marginBottom: 8 }}>{title}</h2>
        <p style={{ color: '#6B7280', marginBottom: 8 }}>Снимай страница или избери файл от устройството</p>
        <p style={{ fontSize: 12, color: '#92400E', fontStyle: 'italic', marginBottom: 16 }}>💡 Снимай на добро осветление, право над текста.</p>

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.[0]) { handleFileSelected(e.target.files[0]); e.target.value = '' } }} />
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.[0]) { handleFileSelected(e.target.files[0]); e.target.value = '' } }} />

        <button onClick={() => cameraInputRef.current?.click()} disabled={scanning}
          style={{ width: '100%', background: accentColor, color: 'white', fontWeight: 700, padding: '14px', borderRadius: 16, fontSize: 16, marginBottom: 10, border: 'none', cursor: 'pointer' }}>
          📷 Снимай с камера
        </button>
        <button onClick={() => fileInputRef.current?.click()} disabled={scanning}
          style={{ width: '100%', background: 'white', color: accentColor, border: `2px solid ${accentColor}`, fontWeight: 700, padding: '12px', borderRadius: 16, fontSize: 15, marginBottom: 10, cursor: 'pointer' }}>
          🖼️ Избери от файлове
        </button>
        <button onClick={handleClose}
          style={{ width: '100%', background: 'transparent', color: '#6B7280', fontWeight: 600, padding: '10px', borderRadius: 16, border: 'none', cursor: 'pointer' }}>
          Затвори
        </button>
      </div>
    </div>
  )
}
