'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Sentence = { text: string }
type Dictation = { id: string; title: string; grade: number; sentences: Sentence[]; category: string }

export default function AccentCheck() {
  const [dictations, setDictations] = useState<Dictation[]>([])
  const [openGrade, setOpenGrade] = useState<number | null>(1)
  const [selected, setSelected] = useState<Dictation | null>(null)
  const [playing, setPlaying] = useState(false)
  const [selectedWord, setSelectedWord] = useState<{sentIdx: number, word: string, wordIdx: number} | null>(null)
  const [replacement, setReplacement] = useState('')
  const [saved, setSaved] = useState<string[]>([])

  useEffect(() => {
    supabase.from('dictations')
      .select('id,title,grade,sentences,category')
      .eq('language', 'bg')
      .eq('category', 'original')
      .in('grade', [1,2,3,4])
      .order('grade')
      .order('title')
      .then(({ data }) => { if (data) setDictations(data) })
  }, [])

  const grades = [1, 2, 3, 4]

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

  const handleWordClick = (sentIdx: number, word: string, wordIdx: number) => {
    const clean = word.replace(/[.,!?;:„"]/g, '')
    setSelectedWord({ sentIdx, word: clean, wordIdx })
    setReplacement(clean)
  }

  const saveFix = async () => {
    if (!selectedWord || !replacement || replacement === selectedWord.word) return
    await supabase.from('accent_fixes').upsert({ wrong: selectedWord.word, correct: replacement })
    setSaved(prev => [...prev, `${selectedWord.word} → ${replacement}`])
    setSelectedWord(null)
    setReplacement('')
  }

  return (
    <div style={{display:'flex', height:'100vh', fontFamily:'sans-serif', background:'#fff'}}>
      
      {/* SIDEBAR */}
      <div style={{width:'240px', borderRight:'1px solid #e5e7eb', overflowY:'auto', padding:'16px'}}>
        <div style={{fontWeight:'bold', fontSize:'18px', marginBottom:'16px', color:'#000'}}>🎙️ Ударения</div>
        {grades.map(g => (
          <div key={g}>
            <button onClick={() => setOpenGrade(openGrade === g ? null : g)}
              style={{width:'100%', textAlign:'left', padding:'8px 12px', background: openGrade === g ? '#f97316' : '#f3f4f6', color: openGrade === g ? '#fff' : '#000', border:'none', borderRadius:'8px', marginBottom:'4px', cursor:'pointer', fontWeight:'bold', fontSize:'14px'}}>
              {openGrade === g ? '▼' : '▶'} {g} клас
            </button>
            {openGrade === g && dictations.filter(d => d.grade === g).map(d => (
              <button key={d.id} onClick={() => { setSelected(d); setSelectedWord(null) }}
                style={{width:'100%', textAlign:'left', padding:'6px 12px 6px 24px', background: selected?.id === d.id ? '#fff7ed' : 'transparent', color: selected?.id === d.id ? '#ea580c' : '#374151', border:'none', borderRadius:'6px', marginBottom:'2px', cursor:'pointer', fontSize:'13px', fontWeight: selected?.id === d.id ? 'bold' : 'normal'}}>
                {d.title}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div style={{flex:1, overflowY:'auto', padding:'24px'}}>
        {!selected ? (
          <div style={{color:'#9ca3af', textAlign:'center', marginTop:'80px', fontSize:'18px'}}>← Избери диктовка</div>
        ) : (
          <>
            <h2 style={{fontSize:'20px', fontWeight:'bold', color:'#000', marginBottom:'4px'}}>{selected.title}</h2>
            <p style={{color:'#6b7280', fontSize:'13px', marginBottom:'20px'}}>{selected.grade} клас · Кликни върху дума за корекция</p>

            {(selected.sentences as Sentence[]).map((s, i) => (
              <div key={i} style={{marginBottom:'12px', padding:'12px 16px', border:'1px solid #e5e7eb', borderRadius:'10px', display:'flex', gap:'12px', alignItems:'flex-start'}}>
                <span style={{color:'#9ca3af', fontSize:'13px', minWidth:'20px', paddingTop:'3px'}}>{i+1}.</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:'16px', lineHeight:'1.8', color:'#000'}}>
                    {s.text.split(' ').map((word, wi) => {
                      const isSelected = selectedWord?.sentIdx === i && selectedWord?.wordIdx === wi
                      return (
                        <span key={wi}>
                          <span onClick={() => handleWordClick(i, word, wi)}
                            style={{cursor:'pointer', borderRadius:'3px', padding:'1px 2px', background: isSelected ? '#fef08a' : 'transparent', borderBottom: isSelected ? '2px solid #f97316' : '1px dashed #d1d5db', color:'#000'}}>
                            {word}
                          </span>
                          {' '}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <button onClick={() => playText(s.text)} disabled={playing}
                  style={{background:'#f97316', color:'#fff', border:'none', borderRadius:'8px', padding:'6px 14px', cursor:'pointer', fontSize:'13px', opacity: playing ? 0.5 : 1, whiteSpace:'nowrap'}}>
                  {playing ? '⏳' : '▶ Чуй'}
                </button>
              </div>
            ))}

            {/* КОРЕКЦИЯ ПАНЕЛ */}
            {selectedWord && (
              <div style={{position:'sticky', bottom:'16px', background:'#fff', border:'2px solid #f97316', borderRadius:'12px', padding:'16px', marginTop:'16px', display:'flex', gap:'12px', alignItems:'center'}}>
                <div style={{color:'#000', fontSize:'15px'}}>
                  Замени <strong style={{color:'#ef4444'}}>&#8222;{selectedWord.word}&#8220;</strong> с:
                </div>
                <input value={replacement} onChange={e => setReplacement(e.target.value)}
                  autoFocus
                  style={{border:'1px solid #d1d5db', borderRadius:'8px', padding:'8px 12px', fontSize:'15px', color:'#000', width:'160px'}} />
                <button onClick={saveFix}
                  style={{background:'#22c55e', color:'#fff', border:'none', borderRadius:'8px', padding:'8px 20px', cursor:'pointer', fontWeight:'bold', fontSize:'15px'}}>
                  Запази
                </button>
                <button onClick={() => setSelectedWord(null)}
                  style={{background:'#f3f4f6', color:'#374151', border:'none', borderRadius:'8px', padding:'8px 16px', cursor:'pointer', fontSize:'15px'}}>
                  Отказ
                </button>
                {saved.length > 0 && (
                  <div style={{color:'#16a34a', fontSize:'13px', marginLeft:'8px'}}>
                    ✅ {saved[saved.length-1]}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
