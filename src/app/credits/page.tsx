'use client'
import { useRouter } from 'next/navigation'

export default function CreditsPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8ED', fontFamily: 'Nunito, sans-serif', padding: '24px 20px 60px' }}>
      <button
        onClick={() => router.back()}
        style={{
          background: 'none', border: 'none', color: '#F97316', fontWeight: 800,
          fontSize: '0.95rem', cursor: 'pointer', padding: 0, marginBottom: 24,
        }}
      >
        ← Назад
      </button>

      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#7C4A1E', marginBottom: 20 }}>
        Благодарности
      </h1>

      <p style={{ fontSize: '0.95rem', color: '#92400E', marginBottom: 12 }}>
        3D модели, използвани в игрите:
      </p>

      <ul style={{ fontSize: '0.95rem', color: '#5C3A1A', lineHeight: 1.9, paddingLeft: 20 }}>
        <li>Nature Pack, Sail Ship — Quaternius (CC0)</li>
        <li>
          Surfboard — jeremy (
          <a
            href="https://poly.pizza/m/3js4cQ-O-p2"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#F97316', fontWeight: 700 }}
          >
            poly.pizza
          </a>
          ), CC-BY 3.0
        </li>
      </ul>
    </div>
  )
}
