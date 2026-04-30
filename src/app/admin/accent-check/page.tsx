'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Sentence = { text: string }
type Dictation = { id: string; title: string; grade: number; sentences: Sentence[] }

export default function AccentCheck() {
  const [dictations, setDictations] = useState<Dictation[]>([])
  const [openGrade, setOpenGrade] = useState<number | null>(1)
  const [selected, setSelected] = useState<Dictation | null>(null)
  const [playing, setPlaying] = useState(false)
  const [activeWord, setActiveWord] = useState<{sentIdx: number, wordIdx: number, word: string} | null>(null)
  const [phonetic, setPhonetic] = useState('')
  const [activeSent, setActiveSent] = useState<{sentIdx: number, text: string} | null>(null)
  const [editText, setEditText] = useState('')
  const [msg, setMsg] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleText, setTitleText] = useState('')
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    supabase.from('dictations').select('id,title,grade,sentences').eq('language', 'bg').eq('category', 'original').in('grade', [1,2,3,4]).order('grade').order('title')
      .then(({ data }) => { if (data) setDictations(data) })
  }, [])

  const playText = async (text: string) => {
    setPlaying(true)
    const res = await fetch('/api/tts-azure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: 'kalina', speed: 0.85, nocache: true, dictation_id: selected?.id })
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => setPlaying(false)
    audio.play()
  }

  const savePhonetic = async () => {
    if (!activeWord || !phonetic) return
    await supabase.from('accent_fixes').upsert({ wrong: activeWord.word, correct: phonetic, dictation_id: selected?.id }, { onConflict: 'wrong,dictation_id' })
    setMsg(`✅ Фонетика: „${activeWord.word}" → „${phonetic}"`)
    setActiveWord(null)
    setPhonetic('')
  }

  const saveText = async () => {
    if (!activeSent || !selected || !editText) return
    const sentences = [...(selected.sentences as Sentence[])]
    sentences[activeSent.sentIdx] = { text: editText }
    await supabase.from('dictations').update({ sentences }).eq('id', selected.id)
    const updated = { ...selected, sentences }
    setSelected(updated)
    setDictations(prev => prev.map(d => d.id === selected.id ? updated : d))
    setMsg(`✅ Текст обновен`)
    setActiveSent(null)
    setEditText('')
  }

  return (
    <div style={{display:'flex', height:'100vh', fontFamily:'sans-serif', background:'#fff'}}>

      {/* SIDEBAR */}
      <div style={{width:'220px', borderRight:'1px solid #e5e7eb', overflowY:'auto', padding:'16px'}}>
        <div style={{fontWeight:'bold', fontSize:'16px', marginBottom:'16px', color:'#000'}}>🎙️ Ударения</div>
        {[1,2,3,4].map(g => (
          <div key={g}>
            <button onClick={() => setOpenGrade(openGrade === g ? null : g)}
              style={{width:'100%', textAlign:'left', padding:'7px 10px', background: openGrade === g ? '#f97316' : '#f3f4f6', color: openGrade === g ? '#fff' : '#000', border:'none', borderRadius:'8px', marginBottom:'4px', cursor:'pointer', fontWeight:'bold', fontSize:'13px'}}>
              {openGrade === g ? '▼' : '▶'} {g} клас
            </button>
            {openGrade === g && dictations.filter(d => d.grade === g).map(d => (
              <button key={d.id} onClick={() => { setSelected(d); setActiveWord(null); setActiveSent(null); setMsg('') }}
                style={{width:'100%', textAlign:'left', padding:'5px 10px 5px 20px', background: selected?.id === d.id ? '#fff7ed' : 'transparent', color: selected?.id === d.id ? '#ea580c' : '#374151', border:'none', borderRadius:'6px', marginBottom:'2px', cursor:'pointer', fontSize:'12px', fontWeight: selected?.id === d.id ? 'bold' : 'normal'}}>
                {d.title}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div style={{flex:1, overflowY:'auto', padding:'24px', maxWidth:'900px'}}>
        {!selected ? (
          <div style={{color:'#9ca3af', textAlign:'center', marginTop:'80px', fontSize:'18px'}}>← Избери диктовка</div>
        ) : (
          <>
            <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px'}}>
              {editingTitle ? (
                <>
                  <input value={titleText} onChange={e => setTitleText(e.target.value)} autoFocus
                    style={{border:'1px solid #d1d5db', borderRadius:'8px', padding:'6px 12px', fontSize:'18px', fontWeight:'bold', color:'#000', flex:1}} />
                  <button onClick={async () => { await supabase.from('dictations').update({title: titleText}).eq('id', selected.id); const u = {...selected, title: titleText}; setSelected(u); setDictations(prev => prev.map(d => d.id === selected.id ? u : d)); setEditingTitle(false); setMsg('✅ Заглавието е обновено') }}
                    style={{background:'#3b82f6', color:'#fff', border:'none', borderRadius:'8px', padding:'6px 14px', cursor:'pointer', fontWeight:'bold'}}>Запази</button>
                  <button onClick={() => setEditingTitle(false)}
                    style={{background:'#f3f4f6', color:'#374151', border:'none', borderRadius:'8px', padding:'6px 12px', cursor:'pointer'}}>Отказ</button>
                </>
              ) : (
                <>
                  <h2 style={{fontSize:'20px', fontWeight:'bold', color:'#000', margin:0}}>{selected.title}</h2>
                  <button onClick={() => { setTitleText(selected.title); setEditingTitle(true) }}
                    style={{background:'none', border:'1px solid #d1d5db', borderRadius:'6px', padding:'3px 10px', cursor:'pointer', color:'#6b7280', fontSize:'12px'}}>✏️ Редактирай</button>
                  <button onClick={() => setShowDelete(true)}
                    style={{background:'none', border:'1px solid #fca5a5', borderRadius:'6px', padding:'3px 10px', cursor:'pointer', color:'#ef4444', fontSize:'12px', marginLeft:'auto'}}>🗑️ Изтрий</button>
                </>
              )}
            </div>
            {showDelete && (
              <div style={{background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:'8px', padding:'12px 16px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'10px'}}>
                <span style={{color:'#991b1b', fontSize:'14px'}}>Сигурен ли си че искаш да изтриеш <strong>{selected.title}</strong>?</span>
                <button onClick={async () => { await supabase.from('dictations').delete().eq('id', selected.id); setDictations(prev => prev.filter(d => d.id !== selected.id)); setSelected(null); setShowDelete(false); setMsg('') }}
                  style={{background:'#ef4444', color:'#fff', border:'none', borderRadius:'8px', padding:'6px 16px', cursor:'pointer', fontWeight:'bold'}}>Да, изтрий</button>
                <button onClick={() => setShowDelete(false)}
                  style={{background:'#f3f4f6', color:'#374151', border:'none', borderRadius:'8px', padding:'6px 12px', cursor:'pointer'}}>Отказ</button>
              </div>
            )}
            <p style={{color:'#6b7280', fontSize:'12px', marginBottom:'20px'}}>Клик върху дума = фонетика &nbsp;|&nbsp; Клик върху номер = редактирай изречение</p>

            {msg && <div style={{background:'#f0fdf4', border:'1px solid #86efac', borderRadius:'8px', padding:'10px 16px', marginBottom:'16px', color:'#16a34a', fontSize:'14px'}}>{msg}</div>}

            {(selected.sentences as Sentence[]).map((s, i) => (
              <div key={i} style={{marginBottom:'10px', padding:'12px 16px', border:'1px solid #e5e7eb', borderRadius:'10px', display:'flex', gap:'12px', alignItems:'flex-start'}}>
                
                {/* Номер — клик за редактиране на текст */}
                <button onClick={() => { setActiveSent({sentIdx: i, text: s.text}); setEditText(s.text); setActiveWord(null) }}
                  style={{color: activeSent?.sentIdx === i ? '#ea580c' : '#9ca3af', fontSize:'13px', minWidth:'24px', paddingTop:'3px', background:'none', border:'none', cursor:'pointer', fontWeight: activeSent?.sentIdx === i ? 'bold' : 'normal'}}>
                  {i+1}.
                </button>

                {/* Думи — клик за фонетика */}
                <div style={{flex:1, fontSize:'15px', lineHeight:'1.9', color:'#000'}}>
                  {s.text.split(' ').map((word, wi) => {
                    const clean = word.replace(/[.,!?;:„"«»]/g, '')
                    const isActive = activeWord?.sentIdx === i && activeWord?.wordIdx === wi
                    return (
                      <span key={wi}>
                        <span onClick={() => { setActiveWord({sentIdx: i, wordIdx: wi, word: clean}); setPhonetic(clean); setActiveSent(null) }}
                          style={{cursor:'pointer', borderRadius:'3px', padding:'1px 3px', background: isActive ? '#fef08a' : 'transparent', borderBottom: isActive ? '2px solid #f97316' : '1px dashed #d1d5db', color:'#000'}}>
                          {word}
                        </span>{' '}
                      </span>
                    )
                  })}
                </div>

                <button onClick={() => playText(s.text)} disabled={playing}
                  style={{background:'#f97316', color:'#fff', border:'none', borderRadius:'8px', padding:'5px 12px', cursor:'pointer', fontSize:'12px', opacity: playing ? 0.5 : 1, whiteSpace:'nowrap'}}>
                  {playing ? '⏳' : '▶ Чуй'}
                </button>
              </div>
            ))}

            {/* СЕКЦИЯ 1 — ФОНЕТИКА */}
            {activeWord && (
              <div style={{position:'sticky', bottom:'16px', background:'#fffbeb', border:'2px solid #f59e0b', borderRadius:'12px', padding:'14px 16px', marginTop:'12px'}}>
                <div style={{fontWeight:'bold', color:'#92400e', fontSize:'13px', marginBottom:'8px'}}>🔊 ФОНЕТИКА — не се вижда от потребителя</div>
                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                  <span style={{color:'#000', fontSize:'14px'}}>&#8222;<strong style={{color:'#ef4444'}}>{activeWord.word}</strong>&#8220; чете се като:</span>
                  <input value={phonetic} onChange={e => setPhonetic(e.target.value)} autoFocus
                    style={{border:'1px solid #d1d5db', borderRadius:'8px', padding:'6px 10px', fontSize:'14px', color:'#000', width:'150px'}} />
                  <button onClick={savePhonetic}
                    style={{background:'#f59e0b', color:'#fff', border:'none', borderRadius:'8px', padding:'7px 18px', cursor:'pointer', fontWeight:'bold'}}>
                    Запази
                  </button>
                  <button onClick={() => setActiveWord(null)}
                    style={{background:'#f3f4f6', color:'#374151', border:'none', borderRadius:'8px', padding:'7px 14px', cursor:'pointer'}}>
                    Отказ
                  </button>
                </div>
              </div>
            )}

            {/* СЕКЦИЯ 2 — РЕДАКТИРАНЕ НА ТЕКСТ */}
            {activeSent && (
              <div style={{position:'sticky', bottom:'16px', background:'#eff6ff', border:'2px solid #3b82f6', borderRadius:'12px', padding:'14px 16px', marginTop:'12px'}}>
                <div style={{fontWeight:'bold', color:'#1e40af', fontSize:'13px', marginBottom:'8px'}}>✏️ ТЕКСТ — променя реалното съдържание</div>
                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                  <input value={editText} onChange={e => setEditText(e.target.value)} autoFocus
                    style={{border:'1px solid #d1d5db', borderRadius:'8px', padding:'6px 10px', fontSize:'14px', color:'#000', flex:1}} />
                  <button onClick={saveText}
                    style={{background:'#3b82f6', color:'#fff', border:'none', borderRadius:'8px', padding:'7px 18px', cursor:'pointer', fontWeight:'bold'}}>
                    Запази
                  </button>
                  <button onClick={() => setActiveSent(null)}
                    style={{background:'#f3f4f6', color:'#374151', border:'none', borderRadius:'8px', padding:'7px 14px', cursor:'pointer'}}>
                    Отказ
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
