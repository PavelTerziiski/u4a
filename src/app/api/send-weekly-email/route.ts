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

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)

  const { data: parents } = await supabase
    .from('parent_children')
    .select('parent_id, child_id')

  if (!parents) return NextResponse.json({ ok: true })

  for (const link of parents) {
    const { data: parent } = await supabase
      .from('profiles')
      .select('email, fox_name, username')
      .eq('id', link.parent_id)
      .single()

    const { data: child } = await supabase
      .from('profiles')
      .select('fox_name, username, streak')
      .eq('id', link.child_id)
      .single()

    if (!parent?.email || !child) continue

    const { data: sessions } = await supabase
      .from('dictation_sessions')
      .select('score, total, created_at')
      .eq('profile_id', link.child_id)
      .gte('created_at', weekStart.toISOString())
      .not('score', 'is', null)

    if (!sessions || sessions.length === 0) continue

    const totalSessions = sessions.length
    const avgScore = Math.round(
      sessions.reduce((acc, s) => acc + (s.score / s.total) * 100, 0) / sessions.length
    )
    const childName = child.fox_name || child.username

    await resend.emails.send({
      from: 'u4a.bg <hello@u4a.bg>',
      to: parent.email,
      subject: `🦊 ${childName} направи ${totalSessions} диктовки тази седмица!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #FFFBF5; border-radius: 16px; padding: 32px; border: 2px solid #FED7AA;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 3rem;">🦊</div>
            <h1 style="color: #92400E; font-size: 1.5rem; margin: 8px 0;">Седмичен отчет</h1>
          </div>
          <p style="color: #7C2D12;">Здравей!</p>
          <p style="color: #7C2D12;"><strong>${childName}</strong> беше активен/а тази седмица:</p>
          <div style="background: white; border-radius: 12px; padding: 20px; margin: 16px 0; border: 2px solid #FED7AA;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #92400E;">📝 Диктовки</span>
              <strong style="color: #F97316;">${totalSessions}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #92400E;">✅ Средна точност</span>
              <strong style="color: #F97316;">${avgScore}%</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #92400E;">🔥 Серия</span>
              <strong style="color: #F97316;">${child.streak || 0} дни</strong>
            </div>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <a href="https://u4a.bg" style="background: #F97316; color: white; padding: 12px 32px; border-radius: 12px; text-decoration: none; font-weight: 800;">Виж детайли →</a>
          </div>
          <p style="color: #D97706; font-size: 0.8rem; text-align: center; margin-top: 24px;">u4a.bg — Учи с лисицата 🦊</p>
        </div>
      `
    })
  }

  return NextResponse.json({ ok: true })
}