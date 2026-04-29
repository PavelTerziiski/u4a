'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Sentence = { text: string }
type Dictation = { id: string; title: string; grade: number; sentences: Sentence[] }

export default function AccentCheck() {
  const [dictations, setDictations] = useState<Dictation[]>([])
  const [selected, setSelected] = useState<Dictation | null>(null)
  const [wrong, setWrong] = useState('')
  const [correct, setCorrect] = useState('')
  const [saved, setSaved] = useState<string[]>([])
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    supabase.from('dictations').select('*').eq('language', 'bg').order('grade').then(({ data }) => {
      if (data) setDictations(data)
    })
  }, [])

  const playText = async (text: string) => {
    setPlaying(true)
    const res = await fetch('/api/tts-azure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: 'kalina', speed: 0.85 })
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => setPlaying(false)
    audio.play()
  }

  const saveFix = async () => {
    if (!wrong || !correct) return
    await supabase.from('accent_fixes').upsert({ wrong, correct })
    setSaved(prev => [...prev, wrong])
    setWrong('')
    setCorrect('')
  }

  return (
    <div style={{minHeight:'100vh', background:'#fff', padding:'24px', fontFamily:'sans-serif'}}>
      <h1 style={{fontSize:'24px', fontWeight:'bold', marginBottom:'24px', color:'#000'}}>Проверка на ударения</h1>
      <div style={{display:'flex', gap:'24px'}}>
        <div style={{width:'220px', background:'#f5f5f5', borderRadius:'12px', padding:'16px'}}>
          <h2 style={{fontWeight:'bold', marginBottom:'12px', color:'#000'}}>Диктовки</h2>
          {dictations.map(d => (
            <button key={d.id} onClick={() => setSelected(d)}
              style={{width:'100%', textAlign:'left', padding:'8px 12px', borderRadius:'8px', marginBottom:'4px', border:'none', cursor:'pointer', background: selected?.id === d.id ? '#f97316' : 'transparent', color: selected?.id === d.id ? '#fff' : '#000', fontWeight: selected?.id === d.id ? 'bold' : 'normal', fontSize:'14px'}}>
              {d.grade}кл. {d.title}
            </button>
          ))}
        </div>
        <div style={{flex:1}}>
          {selected ? (
            <div style={{background:'#fff', border:'1px solid #ddd', borderRadius:'12px', padding:'24px', marginBottom:'16px'}}>
              <h2 style={{fontWeight:'bold', fontSize:'18px', marginBottom:'16px', color:'#000'}}>{selected.title}</h2>
              {(selected.sentences as Sentence[]).map((s, i) => (
                <div key={i} style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px', padding:'12px', border:'1px solid #eee', borderRadius:'8px'}}>
                  <span style={{color:'#999', width:'20px'}}>{i+1}.</span>
                  <span style={{flex:1, color:'#000', fontSize:'16px', fontWeight:'500'}}>{s.text}</span>
                  <button onClick={() => playText(s.text)} disabled={playing}
                    style={{background:'#f97316', color:'#fff', border:'none', borderRadius:'8px', padding:'6px 16px', cursor:'pointer', opacity: playing ? 0.5 : 1}}>
                    {playing ? '⏳' : '▶️ Чуй'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{background:'#fff', border:'1px solid #ddd', borderRadius:'12px', padding:'24px', color:'#999', textAlign:'center', marginBottom:'16px'}}>
              ← Избери диктовка
            </div>
          )}
          <div style={{background:'#fff', border:'1px solid #ddd', borderRadius:'12px', padding:'24px'}}>
            <h2 style={{fontWeight:'bold', marginBottom:'16px', color:'#000'}}>Добави корекция</h2>
            <div style={{display:'flex', gap:'12px', alignItems:'flex-end'}}>
              <div>
                <div style={{fontSize:'13px', color:'#555', marginBottom:'4px'}}>Грешна дума</div>
                <input value={wrong} onChange={e => setWrong(e.target.value)} placeholder="паднали"
                  style={{border:'1px solid #ccc', borderRadius:'8px', padding:'8px 12px', width:'160px', color:'#000', fontSize:'15px'}} />
              </div>
              <div>
                <div style={{fontSize:'13px', color:'#555', marginBottom:'4px'}}>Правилно (с ударение)</div>
                <input value={correct} onChange={e => setCorrect(e.target.value)} placeholder="паднали"
                  style={{border:'1px solid #ccc', borderRadius:'8px', padding:'8px 12px', width:'160px', color:'#000', fontSize:'15px'}} />
              </div>
              <button onClick={saveFix}
                style={{background:'#22c55e', color:'#fff', border:'none', borderRadius:'8px', padding:'10px 24px', cursor:'pointer', fontWeight:'bold', fontSize:'15px'}}>
                Запази
              </button>
            </div>
            {saved.length > 0 && (
              <div style={{marginTop:'12px', color:'#16a34a', fontSize:'14px'}}>
                Запазени: {saved.join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
