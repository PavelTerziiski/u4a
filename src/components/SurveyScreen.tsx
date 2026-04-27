import { useState } from 'react'
type Props = { profileId: string; onDone: (gotPremium: boolean) => void }
export default function SurveyScreen({ profileId, onDone }: Props) {
  const [useful, setUseful] = useState('')
  const [dislike, setDislike] = useState('')
  const [feature, setFeature] = useState('')
  const [recommend, setRecommend] = useState('')
  const [loading, setLoading] = useState(false)
  const handleSubmit = async () => {
    setLoading(true)
    await fetch('/api/survey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId, useful, dislike, featureRequest: feature, recommend }) })
    setLoading(false)
    onDone(true)
  }
  const fields = [
    { label: '💚 Какво намираш за полезно?', value: useful, set: setUseful },
    { label: '🔧 Какво трябва да подобрим?', value: dislike, set: setDislike },
    { label: '✨ Какво още би искал да има?', value: feature, set: setFeature },
    { label: '👨‍👩‍👧 Би ли препоръчал на приятел?', value: recommend, set: setRecommend },
  ]
  return (
    <main className="u4a-dash min-h-screen flex flex-col items-center justify-center p-6">
      <div className="u4a-dash-overlay"></div>
      <div className="w-full max-w-md">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '4rem', marginBottom: 12 }}>🦊</div>
          <div style={{ background: 'linear-gradient(135deg, #F97316, #EF4444)', borderRadius: 24, padding: '24px 20px', marginBottom: 16, boxShadow: '0 8px 32px rgba(249,115,22,0.4)' }}>
            <div style={{ fontFamily: 'Russo One, sans-serif', fontSize: '2.4rem', color: 'white', lineHeight: 1.1, marginBottom: 4 }}>7 ДНИ MAX</div>
            <div style={{ fontFamily: 'Russo One, sans-serif', fontSize: '2.4rem', color: '#FEF3C7', lineHeight: 1.1, marginBottom: 16 }}>БЕЗПЛАТНО! 🎁</div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: '1rem', color: 'white', lineHeight: 1.5 }}>Отговори на 4 бързи въпроса и получи<br/><strong>пълен достъп без карта!</strong></div>
          </div>
          <p style={{ fontFamily: 'Nunito, sans-serif', color: '#1F1F1F', fontSize: '0.85rem' }}>⏱️ Отнема само 2 минути</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fields.map(({ label, value, set }) => (
            <div key={label}>
              <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#92400E', fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>{label}</label>
              <textarea value={value} onChange={e => set(e.target.value)} rows={2} style={{ width: '100%', borderRadius: 10, border: '2px solid #FED7AA', padding: '8px 12px', fontFamily: 'Nunito, sans-serif', fontSize: '0.9rem', resize: 'none', boxSizing: 'border-box', color: '#1F1F1F' }} />
            </div>
          ))}
        </div>
        <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', marginTop: 20, background: 'linear-gradient(135deg, #F97316, #EF4444)', color: 'white', border: 'none', borderRadius: 16, padding: '18px', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.15rem', cursor: 'pointer', boxShadow: '0 4px 24px rgba(249,115,22,0.5)', opacity: loading ? 0.7 : 1 }}>
          {loading ? '⏳ Изпращане...' : '🎁 Вземи 7 дни Max безплатно →'}
        </button>
        <button onClick={() => onDone(false)} style={{ width: '100%', marginTop: 10, background: 'transparent', color: '#D97706', border: 'none', fontFamily: 'Nunito, sans-serif', fontSize: '0.8rem', cursor: 'pointer', opacity: 0.7 }}>Пропусни</button>
      </div>
    </main>
  )
}
