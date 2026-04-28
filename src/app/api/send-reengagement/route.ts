import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { secret } = await req.json()
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, fox_name, username, total_sessions')
    .eq('is_parent', false)
    .eq('email_unsubscribed', false)
    .not('email', 'is', null)

  if (!profiles) return NextResponse.json({ ok: true })

  let sent = 0

  for (const profile of profiles) {
    if (!profile.email) continue

    const { data: recent } = await supabase
      .from('dictation_sessions')
      .select('id')
      .eq('profile_id', profile.id)
      .gte('created_at', weekAgo.toISOString())
      .limit(1)

    if (recent && recent.length > 0) continue

    const name = profile.fox_name || profile.username
    const unsubscribeUrl = `https://u4a.bg/api/unsubscribe?id=${profile.id}`
    const isNew = (profile.total_sessions || 0) === 0

    await resend.emails.send({
      from: 'Pavel от u4a.bg <hello@u4a.bg>',
      replyTo: 'roditelyat@gmail.com',
      to: profile.email,
      subject: isNew ? `🦊 ${name}, лисицата те чака!` : `🦊 ${name}, върни се — лисицата скучае!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #FFFBF5; border-radius: 16px; padding: 32px; border: 2px solid #FED7AA;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 3rem;">🦊</div>
          </div>
          <p style="color: #7C2D12; font-size: 1rem;">Здравей, ${name}!</p>
          ${isNew
            ? `<p style="color: #7C2D12;">Регистрира се в u4a.bg, но още не си пробвал нито една диктовка. Лисицата те чака да започнете заедно!</p>
               <p style="color: #7C2D12;">Отнема само 5 минути — избери диктовка, вземи молив и хартия, и лисицата ще чете на глас. 🎯</p>`
            : `<p style="color: #7C2D12;">Не сте правили диктовка от известно време. Лисицата скучае без теб!</p>
               <p style="color: #7C2D12;">Само 5 минути на ден правят огромна разлика. Върни серията! 🔥</p>`
          }
          <div style="text-align: center; margin-top: 24px;">
            <a href="https://u4a.bg/dictation" style="background: #F97316; color: white; padding: 14px 36px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 1rem;">Започни диктовка →</a>
          </div>
          <p style="color: #92400E; font-size: 0.85rem; text-align: center; margin-top: 20px;">Аз съм Павел — създателят на u4a.bg. Ако имаш въпроси или нещо не работи, отговори директно на този имейл.</p>
          <p style="color: #D97706; font-size: 0.8rem; text-align: center; margin-top: 16px;">u4a.bg — Учи с лисицата 🦊</p>
          <p style="color: #9CA3AF; font-size: 0.75rem; text-align: center; margin-top: 8px;">
            <a href="${unsubscribeUrl}" style="color: #9CA3AF;">Отпиши се от имейлите</a>
          </p>
        </div>
      `
    })
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}