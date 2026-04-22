'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import '../dashboard/dashboard.css'

const FOX_NAMES = ['Лисиче', 'Лисан', 'Лиско', 'Фокси', 'свое']
const GRADES = [1, 2, 3, 4]

const AVATARS = [
  { id: 1, file: 'fox.png', name: 'Лисица' },
  { id: 2, file: 'bear.png', name: 'Мечок' },
  { id: 3, file: 'owl.png', name: 'Бухал' },
  { id: 4, file: 'squirrel.png', name: 'Катерица' },
  { id: 5, file: 'deer.png', name: 'Еленче' },
  { id: 6, file: 'rabbit.png', name: 'Зайче' },
  { id: 7, file: 'hedgehog.png', name: 'Таралеж' },
  { id: 8, file: 'wolf.png', name: 'Вълче' },
]

export default function Register() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [foxName, setFoxName] = useState('')
  const [customFoxName, setCustomFoxName] = useState('')
  const [grade, setGrade] = useState<number | null>(null)
  const [avatarId, setAvatarId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isParent, setIsParent] = useState<boolean | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmedEmail, setConfirmedEmail] = useState('')

  const handleRegister = async () => {
    setLoading(true)
    setError('')
    const finalFoxName = foxName === 'свое' ? customFoxName : foxName
    try {
      // 1. Създаваме Auth потребител
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('Грешка при създаване на профил')

      // 2. Създаваме профил през API route (service role)
      const profileRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: authData.user.id,
          username,
          email: email.toLowerCase().trim(),
          fox_name: finalFoxName,
          grade,
          avatar_id: avatarId,
          display_name: username,
        })
      })
      if (!profileRes.ok) { const d = await profileRes.json(); throw new Error(d.error || 'Грешка при създаване на профил') }

      localStorage.setItem('u4a_username', username)
      setConfirmedEmail(email.toLowerCase().trim())
      setShowConfirm(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка при регистрация')
    } finally {
      setLoading(false)
    }
  }


  const handleParentRegister = async () => {
    setLoading(true)
    setError('')
    try {
      // Родителите се регистрират директно с service role — без email confirmation
      const profileRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email: email.toLowerCase().trim(),
          password,
          is_parent: true,
          parent_plan: 'premium',
        })
      })
      if (!profileRes.ok) { const d = await profileRes.json(); throw new Error(d.error || 'Грешка при създаване на профил') }
      // Влизаме веднага след регистрация
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      })
      if (signInError) throw signInError
      localStorage.setItem('u4a_username', username)
      localStorage.setItem('u4a_is_parent', 'true')
      router.push('/parent-dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка при регистрация')
    } finally {
      setLoading(false)
    }
  }


  if (isParent === null) { setIsParent(false); return null }

  if (isParent === true && step === 1) return (
    <div className="u4a-dash">
      <div className="u4a-dash-overlay" />
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', position: 'relative', zIndex: 1 }}>
        <div style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', borderRadius: 28, padding: '28px 24px', width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(249,115,22,0.3)', textAlign: 'center', boxSizing: 'border-box' }}>
          <img src="/fox-logo.png" alt="" style={{ width: 90, marginBottom: 12, background: '#3d1a00', borderRadius: 16, padding: 8 }} />
          <h2 style={{ color: 'white', fontFamily: 'Russo One, sans-serif', textAlign: 'center', marginBottom: 6 }}>Родителски профил</h2>
          <p style={{ color: '#FED7AA', fontSize: '0.85rem', marginBottom: 20 }}>Създай акаунт за да следиш напредъка на детето си</p>
          <input style={{ width: '100%', border: '2px solid #FED7AA', borderRadius: 16, padding: '14px 16px', fontSize: '1rem', fontFamily: 'Nunito, sans-serif', fontWeight: 600, marginBottom: 12, outline: 'none', boxSizing: 'border-box', color: '#1C0A00', background: 'white', display: 'block' }} type="text" placeholder="Вашето име" value={username} onChange={e => setUsername(e.target.value)} />
          <input style={{ width: '100%', border: '2px solid #FED7AA', borderRadius: 16, padding: '14px 16px', fontSize: '1rem', fontFamily: 'Nunito, sans-serif', fontWeight: 600, marginBottom: 12, outline: 'none', boxSizing: 'border-box', color: '#1C0A00', background: 'white', display: 'block' }} type="email" placeholder="Имейл адрес" value={email} onChange={e => setEmail(e.target.value)} />
          <input style={{ width: '100%', border: '2px solid #FED7AA', borderRadius: 16, padding: '14px 16px', fontSize: '1rem', fontFamily: 'Nunito, sans-serif', fontWeight: 600, marginBottom: 12, outline: 'none', boxSizing: 'border-box', color: '#1C0A00', background: 'white', display: 'block' }} type="password" placeholder="Парола" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <div style={{ background: '#FEE2E2', color: '#DC2626', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: '0.9rem' }}>{error}</div>}
          <button onClick={handleParentRegister} disabled={loading || !username || !email || !password}
            style={{ width: '100%', background: loading ? '#aaa' : 'white', color: '#EA580C', fontFamily: 'Russo One, sans-serif',
              fontSize: '1.1rem', padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer', marginTop: 8 }}>
            {loading ? '⏳ Зареждане...' : 'Влез в гората →'}
          </button>
        </div>
        <button onClick={() => setIsParent(null)} style={{ marginTop: 16, color: '#EA580C', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Назад
        </button>
      </div>
    </div>
  )

  if (showConfirm) return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 80 }}>🦊</div>
        <h1 className="text-3xl font-bold text-gray-700 mt-4 mb-3">Почти готово!</h1>
        <div className="bg-white rounded-3xl p-6 shadow-lg mb-6">
          <p className="text-gray-600 mb-2">Изпратихме имейл до:</p>
          <p className="text-orange-500 font-bold text-lg mb-4">{confirmedEmail}</p>
          <p className="text-gray-500 text-sm mb-4">
            🌲 Провери пощата си и кликни на линка за потвърждение. След това ще можеш да влезеш в гората!
          </p>
          <div style={{ background: '#FFF7ED', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
            <p className="text-orange-600 text-xs">💡 Не виждаш имейл? Провери папката &quot;Спам&quot; или изчакай няколко минути.</p>
          </div>
        </div>
        <button onClick={() => router.push('/login')}
          className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl text-lg hover:bg-orange-600">
          Към входа на гората 🌲
        </button>
      </div>
    </main>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Russo+One&family=Nunito:wght@400;600;700;800&display=swap');

        .reg-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          font-family: 'Nunito', sans-serif;
          position: relative;
          z-index: 1;
        }

        .reg-title {
          font-family: 'Russo One', sans-serif;
          font-size: 2.5rem;
          color: #F97316;
          text-align: center;
          margin-bottom: 4px;
        }

        .reg-sub {
          color: #C2410C;
          text-align: center;
          font-weight: 600;
          margin-bottom: 24px;
          font-size: 1rem;
        }

        .reg-card {
          background: linear-gradient(135deg, #F97316, #EA580C);
          border-radius: 28px;
          padding: 28px 24px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 8px 32px rgba(249,115,22,0.3);
          color: white;
        }

        .reg-step-title {
          font-family: 'Russo One', sans-serif;
          font-size: 1.5rem;
          color: white;
          text-align: center;
          margin-bottom: 20px;
        }

        .reg-input {
          width: 100%;
          border: 2px solid #FED7AA;
          border-radius: 16px;
          padding: 14px 16px;
          font-size: 1rem;
          font-family: 'Nunito', sans-serif;
          font-weight: 600;
          margin-bottom: 12px;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
          color: #92400E;
          background: #FFFBF5;
        }

        .reg-input:focus { border-color: #F97316; }

        .reg-btn {
          width: 100%;
          background: linear-gradient(135deg, #F97316, #EA580C);
          color: white;
          font-family: 'Russo One', sans-serif;
          font-size: 1.2rem;
          padding: 16px;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(249,115,22,0.3);
          transition: all 0.2s;
          margin-top: 8px;
        }

        .reg-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(249,115,22,0.4); }
        .reg-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        .reg-btn-back {
          background: none;
          border: none;
          color: #FB923C;
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          cursor: pointer;
          margin-bottom: 16px;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* Avatar grid */
        .avatar-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        .avatar-item {
          cursor: pointer;
          border-radius: 16px;
          overflow: hidden;
          border: 3px solid transparent;
          transition: all 0.2s;
          aspect-ratio: 1;
          position: relative;
        }

        .avatar-item:hover { transform: scale(1.05); border-color: #FED7AA; }
        .avatar-item.selected { border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.2); }

        .avatar-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .avatar-name {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.6));
          color: white;
          font-size: 0.6rem;
          font-weight: 800;
          text-align: center;
          padding: 4px 2px 3px;
          font-family: 'Nunito', sans-serif;
        }

        /* Grade buttons */
        .grade-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        .grade-btn {
          padding: 16px 8px;
          border-radius: 16px;
          border: 2px solid #FED7AA;
          background: white;
          font-family: 'Russo One', sans-serif;
          font-size: 1.4rem;
          color: #9CA3AF;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .grade-btn .grade-label {
          font-family: 'Nunito', sans-serif;
          font-size: 0.65rem;
          font-weight: 700;
          display: block;
          margin-top: 2px;
        }

        .grade-btn:hover { border-color: #F97316; color: #F97316; }
        .grade-btn.selected { background: linear-gradient(135deg, #F97316, #EA580C); border-color: transparent; color: white; box-shadow: 0 4px 12px rgba(249,115,22,0.3); }

        /* Fox name chips */
        .name-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .name-chip {
          padding: 8px 16px;
          border-radius: 99px;
          border: 2px solid #FED7AA;
          background: white;
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 0.95rem;
          color: #9CA3AF;
          cursor: pointer;
          transition: all 0.2s;
        }

        .name-chip:hover { border-color: #F97316; color: #F97316; }
        .name-chip.selected { background: #FFF7ED; border-color: #F97316; color: #EA580C; }

        /* Steps indicator */
        .steps {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-bottom: 20px;
        }

        .step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #FED7AA;
          transition: all 0.3s;
        }

        .step-dot.active {
          background: #F97316;
          width: 24px;
          border-radius: 4px;
        }

        .step-dot.done { background: #22C55E; }

        .error-msg {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #DC2626;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-top: 8px;
        }
      `}</style>

      <div className="u4a-dash" style={{minHeight:'100vh'}}>
        <div className="u4a-dash-overlay"></div>
        <div className="falling-leaf leaf-1"><img src="/leaves/vec_red.png" alt="" /></div>
        <div className="falling-leaf leaf-2"><img src="/leaves/vec_yellow.png" alt="" /></div>
        <div className="falling-leaf leaf-3"><img src="/leaves/vec_green.png" alt="" /></div>
        <div className="falling-leaf leaf-4"><img src="/leaves/vec_puhche1.png" alt="" /></div>
        <div className="falling-leaf leaf-5"><img src="/leaves/vec_rasp.png" alt="" /></div>
        <div className="falling-leaf leaf-6"><img src="/leaves/vec_puhche2.png" alt="" /></div>
        <div className="falling-leaf leaf-7"><img src="/leaves/vec_brown.png" alt="" /></div>
        <div className="falling-leaf leaf-8"><img src="/leaves/vec_green2.png" alt="" /></div>
        <div className="falling-leaf leaf-9"><img src="/leaves/vec_strwb.png" alt="" /></div>
        <div className="falling-leaf leaf-10"><img src="/leaves/vec_blckbr.png" alt="" /></div>
      <div className="reg-page">
        <button className="reg-btn-back" style={{ alignSelf: 'flex-start', maxWidth: 440, width: '100%' }} onClick={() => step === 1 ? router.push('/') : setStep(s => s - 1)}>
          ← Назад
        </button>

        <img src="/fox-logo.png" style={{height:120,objectFit:"contain",marginBottom:4}} alt="u4a" />
        <div className="reg-sub">Създай своя горски профил</div>

        <div className="steps">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`step-dot ${s < step ? 'done' : s === step ? 'active' : ''}`} />
          ))}
        </div>

        <div className="reg-card">

          {/* Step 1 — Username & Password */}
          {step === 1 && (
            <>
              <div className="reg-step-title">Как се казваш? 👋</div>
              <input
                className="reg-input"
                type="email"
                placeholder="Имейл адрес"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <input
                className="reg-input"
                type="text"
                placeholder="Потребителско име (показва се на другите)"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
              <input
                className="reg-input"
                type="password"
                placeholder="Парола"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && email && username && password && setStep(2)}
              />
              <button
                className="reg-btn"
                onClick={() => setStep(2)}
                disabled={!email || !username || !password}
              >
                Напред →
              </button>
            </>
          )}

          {/* Step 2 — Avatar */}
          {step === 2 && (
            <>
              <div className="reg-step-title">Избери своя герой 🌲</div>
              <div className="avatar-grid">
                {AVATARS.map(av => (
                  <div
                    key={av.id}
                    className={`avatar-item ${avatarId === av.id ? 'selected' : ''}`}
                    onClick={() => setAvatarId(av.id)}
                  >
                    <img src={`/avatars/${av.file}`} alt={av.name} />
                    <div className="avatar-name">{av.name}</div>
                  </div>
                ))}
              </div>
              <button
                className="reg-btn"
                onClick={() => setStep(3)}
                disabled={!avatarId}
              >
                Напред →
              </button>
            </>
          )}

          {/* Step 3 — Grade */}
          {step === 3 && (
            <>
              <div className="reg-step-title">В кой клас си? 📚</div>
              <div className="grade-grid">
                {GRADES.map(g => (
                  <div
                    key={g}
                    className={`grade-btn ${grade === g ? 'selected' : ''}`}
                    onClick={() => setGrade(g)}
                  >
                    {g}
                    <span className="grade-label">клас</span>
                  </div>
                ))}
              </div>
              <button
                className="reg-btn"
                onClick={() => setStep(4)}
                disabled={!grade}
              >
                Напред →
              </button>
            </>
          )}

          {/* Step 4 — Fox name */}
          {step === 4 && (
            <>
              <div className="reg-step-title">Как да се казва лисицата? 🦊</div>
              <div className="name-chips">
                {FOX_NAMES.map(name => (
                  <div
                    key={name}
                    className={`name-chip ${foxName === name ? 'selected' : ''}`}
                    onClick={() => setFoxName(name)}
                  >
                    {name === 'свое' ? '✏️ Свое' : name}
                  </div>
                ))}
              </div>
              {foxName === 'свое' && (
                <input
                  className="reg-input"
                  type="text"
                  placeholder="Напиши име..."
                  value={customFoxName}
                  onChange={e => setCustomFoxName(e.target.value)}
                  autoFocus
                />
              )}
              {error && <div className="error-msg">{error}</div>}
              <button
                className="reg-btn"
                onClick={handleRegister}
                disabled={loading || !foxName || (foxName === 'свое' && !customFoxName)}
              >
                {loading ? '⏳ Създавам...' : '🌲 Влез в гората!'}
              </button>
            </>
          )}

        </div>
      </div>
      </div>
    </>
  )
}