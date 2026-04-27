'use client'
import { useState, useEffect } from 'react'
import type { Profile } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function PlansPage() {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    const username = localStorage.getItem('u4a_username')
    if (!username) { router.push('/login'); return }
    supabase.from('profiles').select('*').eq('username', username).single()
      .then(({ data }) => { if (data) setProfile(data) })
  }, [])

  const handleCheckout = async (priceId: string) => {
    if (!profile) return
    setLoading(priceId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, username: profile.username, priceId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.upgraded) {
        router.push('/dashboard')
      }
    } catch {
      // ignore
    }
    setLoading(null)
  }

  const premiumMonthly = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_NT!
  const premiumYearly = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_NT!
  const maxMonthly = process.env.NEXT_PUBLIC_STRIPE_MAX_MONTHLY_NT!
  const maxYearly = process.env.NEXT_PUBLIC_STRIPE_MAX_YEARLY_NT!

  const currentPlan = profile?.plan_type || 'free'
  const hasBeenCustomer = !!profile?.stripe_customer_id

  const getButtonLabel = (targetPlan: 'premium' | 'max', priceId: string) => {
    if (currentPlan === targetPlan) return 'Текущ план'
    if (loading === priceId) return 'Зарежда...'
    if (currentPlan === 'premium' && targetPlan === 'max') return 'Ъпгрейд към Max →'
    if (hasBeenCustomer) return 'Абонирай се →'
    return 'Абонирай се'
  }

  const isUpgrade = (targetPlan: 'premium' | 'max') =>
    currentPlan === 'premium' && targetPlan === 'max'

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)', padding: '40px 20px', fontFamily: 'Nunito, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'Russo One, sans-serif', fontSize: '2rem', color: '#7C2D12', margin: 0 }}>Избери своя план</h1>
          <p style={{ color: '#92400E', marginTop: 8 }}>{hasBeenCustomer ? 'Промени своя план по всяко време' : 'Неограничени диктовки · Отказ по всяко време'}</p>
          <div style={{ display: 'inline-flex', background: '#FED7AA', borderRadius: 99, padding: 4, marginTop: 16, gap: 4 }}>
            <button onClick={() => setBilling('monthly')} style={{ padding: '8px 20px', borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.9rem', background: billing === 'monthly' ? '#F97316' : 'transparent', color: billing === 'monthly' ? 'white' : '#92400E' }}>Месечно</button>
            <button onClick={() => setBilling('yearly')} style={{ padding: '8px 20px', borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.9rem', background: billing === 'yearly' ? '#F97316' : 'transparent', color: billing === 'yearly' ? 'white' : '#92400E' }}>Годишно <span style={{ fontSize: '0.75rem', background: '#16A34A', color: 'white', borderRadius: 99, padding: '2px 6px', marginLeft: 4 }}>-2 месеца</span></button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {/* FREE */}
          <div style={{ background: 'white', borderRadius: 24, padding: 28, border: currentPlan === 'free' ? '3px solid #F97316' : '2px solid #FED7AA', position: 'relative', display: 'none' }}>
            {currentPlan === 'free' && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#F97316', color: 'white', borderRadius: 99, padding: '2px 14px', fontSize: '0.75rem', fontWeight: 700 }}>Твоят план</div>}
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🌱</div>
            <h2 style={{ fontFamily: 'Russo One, sans-serif', color: '#7C2D12', margin: '0 0 4px' }}>Free</h2>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#F97316' }}>0€</div>
            <div style={{ color: '#92400E', fontSize: '0.85rem', marginBottom: 20 }}>завинаги</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['2 диктовки на седмица', '🎙️ Базов глас: Господин Бобър', 'Резултати и статистика'].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7C2D12', fontSize: '0.9rem' }}>
                  <span style={{ color: '#16A34A' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button disabled style={{ width: '100%', padding: '12px', borderRadius: 12, border: '2px solid #FED7AA', background: 'transparent', color: '#92400E', fontFamily: 'Nunito, sans-serif', fontWeight: 700, cursor: 'default' }}>Текущ план</button>
          </div>

          {/* PREMIUM */}
          <div style={{ background: 'white', borderRadius: 24, padding: 28, border: currentPlan === 'premium' ? '3px solid #F97316' : '2px solid #FED7AA', position: 'relative' }}>
            {currentPlan === 'premium' && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#F97316', color: 'white', borderRadius: 99, padding: '2px 14px', fontSize: '0.75rem', fontWeight: 700 }}>Твоят план</div>}
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⭐</div>
            <h2 style={{ fontFamily: 'Russo One, sans-serif', color: '#7C2D12', margin: '0 0 4px' }}>Premium</h2>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#F97316' }}>{billing === 'monthly' ? '4.50€' : '45€'}</div>
            <div style={{ color: '#92400E', fontSize: '0.85rem', marginBottom: 20 }}>{billing === 'monthly' ? 'на месец' : 'на година (2 месеца безплатно)'}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Неограничени диктовки', '🎙️ 2 специални гласа: Госпожа Лисица & Господин Бухал', '📷 Снимай текст от учебника', '🦊 Обяснения на грешките от лисицата', 'Подробна статистика'].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7C2D12', fontSize: '0.9rem' }}>
                  <span style={{ color: '#16A34A' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout(billing === 'monthly' ? premiumMonthly : premiumYearly)}
              disabled={currentPlan === 'premium' || !!loading}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: currentPlan === 'premium' ? '#FED7AA' : '#F97316', color: 'white', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '1rem', cursor: currentPlan === 'premium' ? 'default' : 'pointer' }}>
              {getButtonLabel('premium', billing === 'monthly' ? premiumMonthly : premiumYearly)}
            </button>
          </div>

          {/* MAX */}
          <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', borderRadius: 24, padding: 28, border: currentPlan === 'max' ? '3px solid #818CF8' : '2px solid #4338CA', position: 'relative' }}>
            {currentPlan === 'max' && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#818CF8', color: 'white', borderRadius: 99, padding: '2px 14px', fontSize: '0.75rem', fontWeight: 700 }}>Твоят план</div>}
            <div style={{ position: 'absolute', top: -12, right: 20, background: 'linear-gradient(90deg, #818CF8, #C084FC)', color: 'white', borderRadius: 99, padding: '2px 14px', fontSize: '0.75rem', fontWeight: 700 }}>НОВ ✨</div>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>👑</div>
            <h2 style={{ fontFamily: 'Russo One, sans-serif', color: 'white', margin: '0 0 4px' }}>Max</h2>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#A5B4FC' }}>{billing === 'monthly' ? '7.50€' : '75€'}</div>
            <div style={{ color: '#C7D2FE', fontSize: '0.85rem', marginBottom: 20 }}>{billing === 'monthly' ? 'на месец' : 'на година (2 месеца безплатно)'}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Всичко от Premium', 'Английски и немски диктовки', 'Нива A1 / A2 / B1', 'Госпожа Коала & Господин Щраус', 'Приоритетна поддръжка'].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E0E7FF', fontSize: '0.9rem' }}>
                  <span style={{ color: '#86EFAC' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            {isUpgrade('max') && (
              <p style={{ color: '#C7D2FE', fontSize: '0.78rem', marginBottom: 10, textAlign: 'center' }}>
                💜 Доплащаш само разликата за оставащите дни
              </p>
            )}
            <button
              onClick={() => handleCheckout(billing === 'monthly' ? maxMonthly : maxYearly)}
              disabled={currentPlan === 'max' || !!loading}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: currentPlan === 'max' ? '#4338CA' : 'linear-gradient(90deg, #818CF8, #C084FC)', color: 'white', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '1rem', cursor: currentPlan === 'max' ? 'default' : 'pointer' }}>
              {getButtonLabel('max', billing === 'monthly' ? maxMonthly : maxYearly)}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#92400E', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>← Назад</button>
        </div>
      </div>
    </div>
  )
}
