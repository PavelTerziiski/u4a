'use client'
import { useRouter } from 'next/navigation'

const s = {
  container: { minHeight: '100vh', background: '#FFF8ED', fontFamily: 'Nunito, sans-serif', padding: '24px 20px 60px' } as const,
  inner: { maxWidth: 720, margin: '0 auto' } as const,
  back: { background: 'none', border: 'none', color: '#F97316', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', padding: 0, marginBottom: 24 } as const,
  h1: { fontSize: '1.6rem', fontWeight: 900, color: '#7C4A1E', marginBottom: 6 } as const,
  updated: { fontSize: '0.9rem', color: '#92400E', marginBottom: 28 } as const,
  h2: { fontSize: '1.05rem', fontWeight: 800, color: '#7C4A1E', marginTop: 28, marginBottom: 10 } as const,
  p: { fontSize: '0.95rem', color: '#5C3A1A', lineHeight: 1.7, marginBottom: 12 } as const,
  ul: { paddingLeft: 20, marginBottom: 12 } as const,
  li: { fontSize: '0.95rem', color: '#5C3A1A', lineHeight: 1.8, marginBottom: 6 } as const,
  tableWrap: { overflowX: 'auto' as const, marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.88rem' },
  th: { textAlign: 'left' as const, padding: '10px 12px', background: '#FDE9CC', color: '#7C4A1E', fontWeight: 800, borderBottom: '2px solid #F3D6A6' },
  td: { padding: '10px 12px', color: '#5C3A1A', borderBottom: '1px solid #F3E3C8', verticalAlign: 'top' as const },
}

export default function CookiesPage() {
  const router = useRouter()

  return (
    <div style={s.container}>
      <div style={s.inner}>
        <button onClick={() => router.back()} style={s.back}>← Назад</button>

        <h1 style={s.h1}>Политика за бисквитки на u4a „Хитро&quot;</h1>
        <p style={s.updated}>Последна актуализация: 31 август 2026 г.</p>

        <h2 style={s.h2}>1. Какво представлява тази страница</h2>
        <p style={s.p}>
          Тази политика обяснява кои бисквитки (cookies) и подобни технологии за съхранение в браузъра
          (напр. localStorage) използва уебсайтът <strong>u4a.bg</strong>, за какво служат и как можете
          да ги управлявате. Тя допълва нашата{' '}
          <a href="/privacy" style={{ color: '#F97316', fontWeight: 700 }}>Политика за поверителност</a>.
          Отнася се само за уебсайта u4a.bg — мобилното приложение не използва браузърни бисквитки.
        </p>

        <h2 style={s.h2}>2. Бисквитки срещу localStorage — каква е разликата</h2>
        <p style={s.p}>
          <strong>Бисквитка (cookie)</strong> е малък файл, който браузърът изпраща автоматично към сървъра
          при всяка заявка. <strong>localStorage</strong> е подобен механизъм за съхранение в браузъра, но
          данните в него остават само на устройството на потребителя и не се изпращат автоматично към
          сървъра. За вход в профила си u4a.bg използва <strong>localStorage</strong>, не бисквитка — но
          законодателството за защита на личните данни третира двата механизма по сходен начин, затова ги
          описваме заедно тук.
        </p>
        <p style={s.p}>
          <strong>Сесийна бисквитка/запис</strong> се изтрива автоматично при затваряне на браузъра.{' '}
          <strong>Постоянна (persistent) бисквитка/запис</strong> остава на устройството за определен срок
          (или до ръчно изтриване), дори след затваряне на браузъра — конкретните срокове са посочени в
          таблицата по-долу.
        </p>

        <h2 style={s.h2}>3. Кои бисквитки/localStorage записи използваме</h2>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Име</th>
                <th style={s.th}>Цел</th>
                <th style={s.th}>Тип</th>
                <th style={s.th}>Срок</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={s.td}><code>sb-*-auth-token</code> (localStorage)</td>
                <td style={s.td}>Поддържа активна сесия при вход в родителския профил (Supabase)</td>
                <td style={s.td}>Задължителна — не е бисквитка (localStorage), не изисква съгласие</td>
                <td style={s.td}>Постоянен запис — до изход от профила или ръчно изтриване</td>
              </tr>
              <tr>
                <td style={s.td}><code>u4a_username</code>, <code>u4a_is_parent</code> (localStorage)</td>
                <td style={s.td}>Пази кой е логнатият потребител и дали е родителски профил, за да не се налага повторен вход при всяко зареждане</td>
                <td style={s.td}>Задължителна — не е бисквитка (localStorage), не изисква съгласие</td>
                <td style={s.td}>Постоянен запис — до изход от профила или ръчно изтриване</td>
              </tr>
              <tr>
                <td style={s.td}><code>_fbp</code></td>
                <td style={s.td}>Meta (Facebook) Pixel — разпознава браузъра за измерване на реклами и посещения от Facebook/Instagram кампании</td>
                <td style={s.td}>По избор — маркетинг/проследяване, трета страна (Meta)</td>
                <td style={s.td}>Постоянна бисквитка — стандартно 90 дни (по подразбиране на Meta Pixel)</td>
              </tr>
              <tr>
                <td style={s.td}><code>_fbc</code></td>
                <td style={s.td}>Meta (Facebook) Pixel — записва се само ако сте дошли през линк от реклама във Facebook/Instagram, за да свърже посещението с конкретната кампания</td>
                <td style={s.td}>По избор — маркетинг/проследяване, трета страна (Meta)</td>
                <td style={s.td}>Постоянна бисквитка — стандартно 90 дни (по подразбиране на Meta Pixel)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={s.p}>
          В допълнение, при регистрация изпращаме хеширан имейл адрес към Meta Conversions API (сървър-до-сървър,
          не през браузърна бисквитка), за да подобрим точността на измерване на регистрациите от реклами.
        </p>

        <h2 style={s.h2}>4. Управление на съгласието</h2>
        <p style={s.p}>
          Задължителните записи (вход в профила) са технически необходими за работата на сайта и не
          изискват съгласие. За бисквитките на Meta Pixel понастоящем <strong>нямаме вграден banner за
          съгласие</strong> на сайта. Можете да ги блокирате чрез:
        </p>
        <ul style={s.ul}>
          <li style={s.li}>настройките за бисквитки на трети страни във вашия браузър;</li>
          <li style={s.li}>разширения за поверителност/ad-blocker (напр. блокиращи <code>connect.facebook.net</code>);</li>
          <li style={s.li}>
            инструментите на Meta за контрол на рекламите, налични на{' '}
            <a href="https://www.facebook.com/help/568137493302217" target="_blank" rel="noopener noreferrer" style={{ color: '#F97316', fontWeight: 700 }}>
              facebook.com/help
            </a>.
          </li>
        </ul>
        <p style={s.p}>
          Изтриването на localStorage записите (напр. чрез настройките на браузъра) ще ви отпише от профила
          и ще изисква повторен вход при следващо посещение.
        </p>

        <h2 style={s.h2}>5. Промени в тази политика</h2>
        <p style={s.p}>При съществени промени в използваните бисквитки ще актуализираме тази страница.</p>

        <h2 style={s.h2}>6. Контакт</h2>
        <p style={s.p}>developer@twentyonemusic.com</p>
      </div>
    </div>
  )
}
