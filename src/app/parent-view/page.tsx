'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import '../dashboard/dashboard.css'
import ReactMarkdown from 'react-markdown'

type Child = {
  id: string; username: string; display_name: string
  avatar_id: number; grade: number; streak: number; total_sessions: number
}
type WordResult = { word: string; correct: boolean; input: string }
type SentenceResult = { sentence: string; input: string; wordResults: WordResult[]; correct: boolean; explanation?: string }
type Session = {
  id: string; dictation_title: string; score: number; total: number
  created_at: string; results: SentenceResult[]; is_scan?: boolean
  ocr_raw?: string; child_correction?: string
  parent_confirmed?: boolean; parent_corrected_results?: SentenceResult[]
}

const AVATARS: Record<number, string> = {
  1: 'fox.png', 2: 'bear.png', 3: 'owl.png', 4: 'squirrel.png',
  5: 'deer.png', 6: 'rabbit.png', 7: 'hedgehog.png', 8: 'wolf.png'
}

const F = { russo: 'Russo One, sans-serif', nunito: 'Nunito, sans-serif' }

export default function ParentView() {
  const router = useRouter()
  const [parent, setParent] = useState<{id: string; email: string; username: string; is_parent: boolean} | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [showAddChild, setShowAddChild] = useState(false)
  const [childEmail, setChildEmail] = useState('')
  const [childPassword, setChildPassword] = useState('')
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [editSession, setEditSession] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [confirmLoading, setConfirmLoading] = useState<string | null>(null)

  useEffect(() => {
    const username = localStorage.getItem('u4a_username')
    if (!username) { router.push('/login'); return }
    supabase.from('profiles').select('*').eq('username', username).single()
      .then(({ data }) => {
        if (!data) { router.push('/login'); return }
        if (data.is_parent) { router.push('/parent-dashboard'); return }
        setParent(data)
        loadSessions(data.id)
      })
  }, [])


  const handleAddChild = async () => {
    setAddLoading(true); setAddError('')
    try {
      const res = await fetch('/api/verify-child', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: childEmail.trim(), password: childPassword })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (!parent) throw new Error('Не сте влезли')
      const { error } = await supabase.from('parent_children').insert({ parent_id: parent.id, child_id: json.profile.id })
      if (error && error.code !== '23505') throw error
      setChildren(prev => [...prev, json.profile])
      setShowAddChild(false); setChildEmail(''); setChildPassword('')
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Грешка')
    } finally { setAddLoading(false) }
  }

  const handleConfirm = async (session: Session) => {
    setConfirmLoading(session.id)
    await fetch('/api/confirm-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, parentId: parent?.id })
    })
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, parent_confirmed: true } : s))
    setConfirmLoading(null)
  }

  const handleSaveCorrection = async (session: Session) => {
    const inputSentences = editText.trim().split('\n').filter(s => s.trim())
    const newResults: SentenceResult[] = session.results.map((r, i) => {
      const userInput = inputSentences[i] || r.input
      const normalize = (s: string) => s.trim().toLowerCase().replace(/[.,!?;:»«–]/g, '')
      const originalWords = r.sentence.trim().split(/\s+/)
      const inputWords = userInput.trim().split(/\s+/)
      const wordResults: WordResult[] = originalWords.map((word, j) => ({
        word, input: inputWords[j] || '',
        correct: normalize(word) === normalize(inputWords[j] || '')
      }))
      return { ...r, input: userInput, wordResults, correct: wordResults.every(w => w.correct) }
    })
    const newScore = newResults.filter(r => r.correct).length
    await fetch('/api/confirm-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, parentId: parent?.id, correctedResults: newResults, newScore })
    })
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, parent_confirmed: true, parent_corrected_results: newResults, score: newScore } : s))
    setEditSession(null)
  }

  const pending = sessions.filter(s => !s.parent_confirmed).length

  const statusBadge = (s: Session) => {
    if (s.parent_confirmed) return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#EAF3DE', color: '#27500A', fontFamily: F.nunito, fontWeight: 700 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3B6D11', display: 'inline-block' }} /> Потвърдено
      </span>
    )
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#FAEEDA', color: '#633806', fontFamily: F.nunito, fontWeight: 700 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#BA7517', display: 'inline-block' }} /> Чака
      </span>
    )
  }

  return (
    <div className="u4a-dash">
      <div className="u4a-dash-overlay" />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 620, margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <img src="/logo-letters.png" alt="u4a" style={{ height: 36 }} />
          <button onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', color: '#EA580C', cursor: 'pointer', fontFamily: F.nunito, fontWeight: 700 }}>
            ← Назад
          </button>
        </div>

        <h1 style={{ fontFamily: F.russo, color: '#92400E', fontSize: '1.3rem', marginBottom: 20 }}>📊 Панел за родителя</h1>

        {/* Деца */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {children.map(child => (
            <button key={child.id} onClick={() => selectChild(child)} style={{
              background: selectedChild?.id === child.id ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'white',
              color: selectedChild?.id === child.id ? 'white' : '#92400E',
              border: '2px solid #FED7AA', borderRadius: 16, padding: '10px 18px',
              fontFamily: F.russo, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem'
            }}>
              <img src={`/avatars/${AVATARS[child.avatar_id]}`} style={{ width: 28, height: 28, borderRadius: '50%' }} alt="" />
              {child.display_name || child.username}
            </button>
          ))}
          <button onClick={() => setShowAddChild(true)} style={{
            background: 'white', border: '2px dashed #FED7AA', borderRadius: 16, padding: '10px 18px',
            color: '#F97316', fontFamily: F.russo, cursor: 'pointer', fontSize: '0.9rem'
          }}>+ Добави дете</button>
        </div>

        {/* Добави дете */}
        {showAddChild && (
          <div style={{ background: 'white', borderRadius: 20, padding: 20, marginBottom: 20, border: '2px solid #FED7AA' }}>
            <h3 style={{ fontFamily: F.russo, color: '#92400E', marginBottom: 14, fontSize: '1rem' }}>Добави дете</h3>
            {['Имейл на детето', 'Парола на детето'].map((ph, i) => (
              <input key={i} value={i === 0 ? childEmail : childPassword} onChange={e => i === 0 ? setChildEmail(e.target.value) : setChildPassword(e.target.value)}
                type={i === 1 ? 'password' : 'email'} placeholder={ph}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '2px solid #FED7AA', fontFamily: F.nunito, fontWeight: 700, fontSize: '0.95rem', color: '#92400E', background: '#FFFBF5', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
            ))}
            {addError && <div style={{ background: '#FEE2E2', color: '#DC2626', borderRadius: 10, padding: '8px 12px', marginBottom: 10, fontSize: '0.85rem' }}>{addError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddChild} disabled={addLoading || !childEmail || !childPassword}
                style={{ flex: 1, background: 'linear-gradient(135deg, #F97316, #EA580C)', color: 'white', fontFamily: F.russo, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer' }}>
                {addLoading ? '⏳' : '✓ Добави'}
              </button>
              <button onClick={() => { setShowAddChild(false); setAddError('') }}
                style={{ flex: 1, background: 'white', color: '#92400E', border: '2px solid #FED7AA', fontFamily: F.russo, padding: '12px', borderRadius: 12, cursor: 'pointer' }}>
                Откажи
              </button>
            </div>
          </div>
        )}

        {selectedChild && (
          <>
            {/* Статистика */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Среден резултат', value: Math.round(sessions.filter(s => s.parent_confirmed).reduce((acc, s) => acc + Math.round((s.score / s.total) * 100), 0) / (sessions.filter(s => s.parent_confirmed).length || 1)) + '%' },
                { label: 'Диктовки', value: sessions.filter(s => s.parent_confirmed).length },
                { label: 'Чакат', value: pending },
              ].map((s, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 14, padding: '14px 10px', textAlign: 'center', border: '2px solid #FED7AA' }}>
                  <div style={{ fontFamily: F.russo, fontSize: '1.3rem', color: i === 2 && pending > 0 ? '#BA7517' : '#F97316' }}>{s.value}</div>
                  <div style={{ fontFamily: F.nunito, fontSize: '0.72rem', color: '#92400E', fontWeight: 700 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Диктовки */}
            {sessions.length === 0 && (
              <p style={{ color: '#92400E', fontFamily: F.nunito, textAlign: 'center', padding: '24px 0' }}>Все още няма диктовки 🦊</p>
            )}

            {sessions.map((s) => {
              const noScore = s.score === null || s.score === undefined
              const percent = noScore ? null : Math.round((s.score / s.total) * 100)
              const isOpen = expanded[s.id]
              const activeResults = s.parent_corrected_results || s.results || []

              const wrongResults = activeResults.filter(r => !r.correct)

              return (
                <div key={s.id} style={{ background: 'white', borderRadius: 16, marginBottom: 10, border: '2px solid #FED7AA', overflow: 'hidden' }}>
                  {/* Header */}
                  <div onClick={() => setExpanded(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.parent_confirmed ? '#3B6D11' : '#BA7517', display: 'inline-block', flexShrink: 0 }} />
                      <div>
                        <p style={{ margin: 0, fontSize: '0.95rem', fontFamily: F.russo, color: '#92400E' }}>{s.dictation_title}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#aaa', fontFamily: F.nunito }}>
                          {new Date(s.created_at).toLocaleDateString('bg-BG')} · {s.is_scan ? 'снимана' : 'вградена'}
                          {s.parent_corrected_results && ' · коригирана'}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: F.russo, fontSize: '1rem', color: noScore ? '#9CA3AF' : (percent as number) >= 70 ? '#16A34A' : '#EF4444' }}>{noScore ? '—' : `${percent}%`}</span>
                      {statusBadge(s)}
                      <span style={{ color: '#aaa', fontSize: 12, transform: isOpen ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▼</span>
                    </div>
                  </div>

                  {/* Body */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid #FED7AA', padding: 16 }}>

                      {editSession === s.id ? (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                            <div>
                              <p style={{ fontSize: 11, color: '#aaa', fontFamily: F.nunito, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Оригинал</p>
                              <div style={{ background: '#FFFBF5', borderRadius: 10, padding: '10px 12px', fontSize: '0.82rem', color: '#92400E', fontFamily: F.nunito, lineHeight: 1.7 }}>
                                {(s.results || []).map((r, i) => <div key={i}>{i + 1}. {r.sentence}</div>)}
                              </div>
                            </div>
                            <div>
                              <p style={{ fontSize: 11, color: '#aaa', fontFamily: F.nunito, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Коригирай</p>
                              <textarea value={editText} onChange={e => setEditText(e.target.value)}
                                rows={s.results.length + 1}
                                style={{ width: '100%', border: '2px solid #FED7AA', borderRadius: 10, padding: '10px 12px', fontSize: '0.82rem', fontFamily: F.nunito, color: '#92400E', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleSaveCorrection(s)}
                              style={{ flex: 1, background: 'linear-gradient(135deg, #F97316, #EA580C)', color: 'white', fontFamily: F.russo, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                              💾 Запази и потвърди
                            </button>
                            <button onClick={() => setEditSession(null)}
                              style={{ background: 'white', color: '#92400E', border: '2px solid #FED7AA', fontFamily: F.russo, padding: '10px 16px', borderRadius: 10, cursor: 'pointer', fontSize: '0.85rem' }}>
                              Откажи
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {/* Оригинал vs Написано */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                              <p style={{ fontSize: 11, color: '#aaa', fontFamily: F.nunito, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Оригинал</p>
                              <div style={{ background: '#FFFBF5', borderRadius: 10, padding: '10px 12px', fontSize: '0.82rem', color: '#92400E', fontFamily: F.nunito, lineHeight: 1.7 }}>
                                {(s.results || []).map((r, i) => <div key={i}>{r.sentence}</div>)}
                              </div>
                            </div>
                            <div>
                              {s.is_scan && s.ocr_raw && (
                                <div style={{ marginBottom: 8 }}>
                                  <p style={{ fontSize: 11, color: '#aaa', fontFamily: F.nunito, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>OCR разпозна</p>
                                  <div style={{ background: '#FEF3E2', borderRadius: 10, padding: '10px 12px', fontSize: '0.82rem', color: '#92400E', fontFamily: F.nunito, lineHeight: 1.7 }}>
                                    {s.ocr_raw}
                                  </div>
                                </div>
                              )}
                              {s.child_correction && (
                                <div style={{ marginBottom: 8 }}>
                                  <p style={{ fontSize: 11, color: '#27500A', fontFamily: F.nunito, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Детето коригира</p>
                                  <div style={{ background: '#EAF3DE', borderRadius: 10, padding: '10px 12px', fontSize: '0.82rem', color: '#27500A', fontFamily: F.nunito, lineHeight: 1.7, border: '1px solid #3B6D11' }}>
                                    {s.child_correction}
                                  </div>
                                </div>
                              )}
                              {!s.ocr_raw && !s.child_correction && (
                                <div>
                                  <p style={{ fontSize: 11, color: '#aaa', fontFamily: F.nunito, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Написано</p>
                                  <div style={{ background: '#FFFBF5', borderRadius: 10, padding: '10px 12px', fontSize: '0.82rem', color: '#92400E', fontFamily: F.nunito, lineHeight: 1.7 }}>
                                    {activeResults.map((r, i) => <div key={i}>{r.input || '—'}</div>)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Грешки с обяснения */}
                          {wrongResults.length > 0 && (
                            <div style={{ background: '#FFFBF5', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                              {wrongResults.map((r, j) => (
                                <div key={j} style={{ marginBottom: j < wrongResults.length - 1 ? 12 : 0 }}>
                                  <div style={{ fontFamily: F.nunito, fontSize: '0.82rem', color: '#92400E', marginBottom: 4 }}>
                                    ✗ <span style={{ color: '#aaa' }}>{r.sentence}</span>
                                  </div>
                                  {r.explanation && (
                                    <div style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', borderRadius: 10, padding: '8px 12px' }}>
                                      <span style={{ fontSize: '0.75rem', color: 'white', fontFamily: F.nunito, fontWeight: 700 }}>
                                        🦊 <ReactMarkdown>{r.explanation}</ReactMarkdown>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Бутони */}
                          {!s.parent_confirmed && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => handleConfirm(s)} disabled={confirmLoading === s.id}
                                style={{ flex: 1, background: '#EAF3DE', color: '#27500A', border: '1px solid #3B6D11', fontFamily: F.russo, padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: '0.85rem' }}>
                                {confirmLoading === s.id ? '⏳' : '🟢 Потвърди резултата'}
                              </button>
                              <button onClick={() => { setEditSession(s.id); setEditText(activeResults.map(r => r.input).join('\n')) }}
                                style={{ background: 'white', color: '#92400E', border: '2px solid #FED7AA', fontFamily: F.russo, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontSize: '0.85rem' }}>
                                ✏️ Коригирай
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {!selectedChild && children.length > 0 && (
          <p style={{ textAlign: 'center', color: '#92400E', fontFamily: F.nunito, padding: '40px 0' }}>👆 Избери дете</p>
        )}
        {children.length === 0 && !showAddChild && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🧒</div>
            <p style={{ color: '#92400E', fontFamily: F.nunito, fontWeight: 700 }}>Все още нямаш добавени деца</p>
          </div>
        )}
      </div>
    </div>
  )
}
