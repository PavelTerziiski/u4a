import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const headers = { 'Access-Control-Allow-Origin': '*' }
  try {
    const body = await req.json()
    const { office_id, office_name, name, email, phone } = body

    await resend.emails.send({
      from: 'u4a.bg <noreply@u4a.bg>',
      to: 'roditelyat@gmail.com',
      subject: '📦 Нова поръчка — Speedy офис',
      html: `
        <h2>Нова поръчка с доставка до офис на Speedy</h2>
        <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px;">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Име</td><td style="padding:8px;border:1px solid #ddd;">${name || '—'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Имейл</td><td style="padding:8px;border:1px solid #ddd;">${email || '—'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Телефон</td><td style="padding:8px;border:1px solid #ddd;">${phone || '—'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Офис Speedy</td><td style="padding:8px;border:1px solid #ddd;">${office_name || '—'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Офис ID</td><td style="padding:8px;border:1px solid #ddd;">${office_id || '—'}</td></tr>
        </table>
        <p style="margin-top:16px;color:#666;font-size:12px;">Провери Convert Builder за пълните данни на поръчката.</p>
      `
    })

    return NextResponse.json({ ok: true }, { headers })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500, headers })
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
  })
}
