'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import '../dashboard/dashboard.css'

type Child = {
  id: string
  username: string
  display_name: string
  avatar_id: number
  grade: number
  streak: number
  total_sessions: number
}

type WordResult = { word: string; correct: boolean; input: string }
type SentenceResult = { sentence: string; input: string; wordResults: WordResult[]; correct: boolean; explanation?: string }
type Session = {
  id: string
  dictation_title: string
  score: number
  total: number
  created_at: string
  results: SentenceResult[]
}

const AVATARS: Record<number, string> = {
  1: 'fox.png', 2: 'bear.png', 3: 'owl.png', 4: 'squirrel.png',
  5: 'deer.png', 6: 'rabbit.png', 7: 'hedgehog.png', 8: 'wolf.png'
}

export default function ParentDashboard() {
  const router = useRouter()
  const [parent, setParent] = useState<{id: string; email: string; username: string; is_parent: boolean} | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [showAddChild, setShowAddChild] = useState(false)
  const [childUsername, setChildUsername] = useState('')
  const [childPassword, setChildPassword] = useState('')
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  useEffect(() => {
    const username = localStorage.getItem('u4a_username')
    if (!username) { router.push('/login'); return }
    supabase.from('profiles').select('*').eq('username', username).single()
      .then(({ data }) => {
        if (!data || !data.is_parent) { router.push('/dashboard'); return }
        setParent(data)
        loadChildren(data.id)
      })
  }, [])

  const loadChildren = async (parentId: string) => {
    const { data: links } = await supabase
      .from('parent_children')
      .select('child_id')
      .eq('parent_id', parentId)
    if (!links || links.length === 0) return
    const ids = links.map((l: {child_id: string}) => l.child_id)
    const { data: kids } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids)
    if (kids) setChildren(kids)
  }

  const loadSessions = async (childId: string) => {
    const { data } = await supabase
      .from('dictation_sessions')
      .select('*')
      .eq('profile_id', childId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setSessions(data)
  }

  const selectChild = (child: Child) => {
    setSelectedChild(child)
    loadSessions(child.id)
  }

  const handleAddChild = async () => {
    setAddLoading(true)
    setAddError('')
    try {
      const { data: childProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', childUsername.trim())
        .single()
      if (!childProfile) throw new Error('Не намерихме такъв потребител')
      if (childProfile.is_parent) throw new Error('Това е родителски акаунт')

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: childProfile.email,
        password: childPassword,
      })
      if (authError) throw new Error('Грешна парола')

      if (!parent) throw new Error('Не сте влезли')
      const { error } = await supabase.from('parent_children').insert({
        parent_id: parent.id,
        child_id: childProfile.id,
      })
      if (error && error.code !== '23505') throw error

      await supabase.auth.signInWithPassword({
        email: parent.email,
        password: childPassword,
      })

      setChildren(prev => [...prev, childProfile])
      setShowAddChild(false)
      setChildUsername('')
      setChildPassword('')
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Грешка')
    } finally {
      setAddLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('u4a_username')
    localStorage.removeItem('u4a_is_parent')
    router.push('/login')
  }

  const avgScore = (sessions: Session[]) => {
    if (!sessions.length) return 0
    return Math.round(sessions.reduce((acc, s) => acc + Math.round((s.score / s.total) * 100), 0) / sessions.length)
  }

  return (
    <div className="u4a-dash">
      <div className="u4a-dash-overlay" />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <img src="/logo-letters.png" alt="u4a" style={{ height: 36 }} />
          <button onClick={handleLogout}
            style={{ background: 'none', border: 'none', color: '#EA580C', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>
            Изход
          </button>
        </div>

        <h1 style={{ fontFamily: 'Russo One, sans-serif', color: '#92400E', fontSize: '1.4rem', marginBottom: 20 }}>
          👨‍👩‍👧 Родителски панел
        </h1>

        {/* Деца */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {children.map(child => (
            <button key={child.id} onClick={() => selectChild(child)}
              style={{
                background: selectedChild?.id === child.id ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'white',
                color: selectedChild?.id === child.id ? 'white' : '#92400E',
                border: '2px solid #FED7AA', borderRadius: 16, padding: '12px 20px',
                fontFamily: 'Russo One, sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
              }}>
              <img src={`/avatars/${AVATARS[child.avatar_id]}`} style={{ width: 32, height: 32, borderRadius: '50%' }} />
              {child.display_name || child.username}
            </button>
          ))}
          <button onClick={() => setShowAddChild(true)}
            style={{ background: 'white', border: '2px dashed #FED7AA', borderRadius: 16, padding: '12px 20px',
              color: '#F97316', fontFamily: 'Russo One, sans-serif', cursor: 'pointer' }}>
            + Добави дете
          </button>
        </div>

        {/* Добави дете модал */}
        {showAddChild && (
          <div style={{ background: 'white', borderRadius: 20, padding: 24, marginBottom: 24, border: '2px solid #FED7AA' }}>
            <h3 style={{ fontFamily: 'Russo One, sans-serif', color: '#92400E', marginBottom: 16 }}>🧒 Добави дете</h3>
            <input value={childUsername} onChange={e => setChildUsername(e.target.value)}
              placeholder="Потребителско име на детето"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #FED7AA',
                fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#92400E',
                background: '#FFFBF5', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
            <input value={childPassword} onChange={e => setChildPassword(e.target.value)}
              type="password" placeholder="Парола на детето"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #FED7AA',
                fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#92400E',
                background: '#FFFBF5', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
            {addError && <div style={{ background: '#FEE2E2', color: '#DC2626', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>{addError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddChild} disabled={addLoading || !childUsername || !childPassword}
                style={{ flex: 1, background: 'linear-gradient(135deg, #F97316, #EA580C)', color: 'white',
                  fontFamily: 'Russo One, sans-serif', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer' }}>
                {addLoading ? '⏳...' : '✓ Добави'}
              </button>
              <button onClick={() => { setShowAddChild(false); setAddError('') }}
                style={{ flex: 1, background: 'white', color: '#92400E', border: '2px solid #FED7AA',
                  fontFamily: 'Russo One, sans-serif', padding: '14px', borderRadius: 12, cursor: 'pointer' }}>
                Откажи
              </button>
            </div>
          </div>
        )}

        {/* Резултати на избраното дете */}
        {selectedChild && (
          <>
            {/* Статистика */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Среден резултат', value: avgScore(sessions) + '%' },
                { label: 'Диктовки', value: sessions.length },
                { label: 'Streak 🔥', value: selectedChild.streak + ' дни' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 16, padding: '16px 12px', textAlign: 'center', border: '2px solid #FED7AA' }}>
                  <div style={{ fontFamily: 'Russo One, sans-serif', fontSize: '1.4rem', color: '#F97316' }}>{s.value}</div>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: '0.75rem', color: '#92400E', fontWeight: 700 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* История на диктовките */}
            <div style={{ background: 'white', borderRadius: 20, padding: 20, border: '2px solid #FED7AA' }}>
              <h3 style={{ fontFamily: 'Russo One, sans-serif', color: '#92400E', marginBottom: 16 }}>
                📝 Диктовки на {selectedChild.display_name || selectedChild.username}
              </h3>
              {sessions.length === 0 && (
                <p style={{ color: '#92400E', fontFamily: 'Nunito, sans-serif', textAlign: 'center', padding: '16px 0' }}>
                  Все още няма диктовки 🦊
                </p>
              )}
              {sessions.map((s, i) => {
                const percent = Math.round((s.score / s.total) * 100)
                const medal = percent >= 90 ? '🥇' : percent >= 70 ? '🥈' : percent >= 50 ? '🥉' : '💪'
                const wrongResults = (s.results || []).filter((r: SentenceResult) => !r.correct)
                return (
                  <div key={s.id} style={{ borderBottom: i < sessions.length - 1 ? '1px solid #FED7AA' : 'none', paddingBottom: 16, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <span style={{ fontFamily: 'Russo One, sans-serif', color: '#92400E' }}>{medal} {s.dictation_title}</span>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: '0.8rem', color: '#aaa' }}>
                          {new Date(s.created_at).toLocaleDateString('bg-BG')}
                        </div>
                      </div>
                      <span style={{ fontFamily: 'Russo One, sans-serif', fontSize: '1.2rem', color: percent >= 70 ? '#16A34A' : '#EF4444' }}>
                        {percent}%
                      </span>
                    </div>
                    {/* Грешките с обяснения на лисицата */}
                    {wrongResults.length > 0 && (
                      <div style={{ background: '#FFFBF5', borderRadius: 12, padding: 12 }}>
                        {wrongResults.map((r: SentenceResult, j: number) => (
                          <div key={j} style={{ marginBottom: j < wrongResults.length - 1 ? 12 : 0 }}>
                            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: '0.85rem', color: '#92400E', marginBottom: 4 }}>
                              ✗ <span style={{ color: '#aaa' }}>{r.sentence}</span>
                            </div>
                            {r.explanation && (
                              <div style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', borderRadius: 10, padding: '8px 12px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'white', fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>
                                  🦊 {r.explanation}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {!selectedChild && children.length > 0 && (
          <div style={{ textAlign: 'center', color: '#92400E', fontFamily: 'Nunito, sans-serif', padding: '40px 0' }}>
            👆 Избери дете за да видиш резултатите
          </div>
        )}

        {children.length === 0 && !showAddChild && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🧒</div>
            <p style={{ color: '#92400E', fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>
              Все още нямаш добавени деца
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
