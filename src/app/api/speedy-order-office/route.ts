import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const headers = { 'Access-Control-Allow-Origin': '*' }
  try {
    const body = await req.json()
    const { office_id, office_name, page } = body

    await resend.emails.send({
      from: 'u4a.bg <noreply@u4a.bg>',
      to: 'roditelyat@gmail.com',
      subject: '📦 Нова поръчка — Speedy офис',
      html: `
        <h2>Нова поръчка с доставка до офис на Speedy</h2>
        <p><strong>Офис ID:</strong> ${office_id}</p>
        <p><strong>Офис:</strong> ${office_name}</p>
        <p><strong>Страница:</strong> ${page}</p>
        <p><em>Провери Convert Builder за пълните данни на поръчката.</em></p>
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
