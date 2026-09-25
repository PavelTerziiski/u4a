import Link from 'next/link'

const APP_STORE_URL = 'https://apps.apple.com/app/id6792350070'
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.u4ahitro.app'

export const metadata = {
  title: 'Отвори u4a.bg в приложението',
}

export default function ConfirmFallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
      background: '#FFFBF5', textAlign: 'center',
    }}>
      <img src="/fox-logo.png" style={{ height: 120, objectFit: 'contain', marginBottom: 16 }} alt="u4a" />
      <h1 style={{
        fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.3rem',
        color: '#92400E', marginBottom: 8, maxWidth: 340,
      }}>
        Отвори приложението, за да продължиш 🦊
      </h1>
      <p style={{
        fontFamily: 'Nunito, sans-serif', fontSize: '0.95rem',
        color: '#7C2D12', marginBottom: 28, maxWidth: 320, lineHeight: 1.6,
      }}>
        Имейлът ти е потвърден. Ако u4a Хитро вече е инсталирано на устройството ти, този линк трябваше да го отвори автоматично — иначе изтегли приложението отдолу.
      </p>

      <Link href={APP_STORE_URL} style={{
        display: 'block', width: '100%', maxWidth: 280, marginBottom: 12,
        background: '#1a1a2e', color: '#fff', borderRadius: 12,
        padding: '12px 20px', textDecoration: 'none', fontFamily: 'Nunito, sans-serif',
        fontWeight: 700, fontSize: '0.95rem',
      }}>
        📱 Изтегли от App Store
      </Link>
      <Link href={PLAY_STORE_URL} style={{
        display: 'block', width: '100%', maxWidth: 280,
        background: '#F97316', color: '#fff', borderRadius: 12,
        padding: '12px 20px', textDecoration: 'none', fontFamily: 'Nunito, sans-serif',
        fontWeight: 700, fontSize: '0.95rem',
      }}>
        🤖 Изтегли от Google Play
      </Link>
    </div>
  )
}
