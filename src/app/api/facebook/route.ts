import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, eventName = 'Lead' } = await req.json()
  
  const pixelId = '1122224713405510'
  const accessToken = process.env.FACEBOOK_CAPI_TOKEN

  const hashedEmail = await hashEmail(email)
  
  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      user_data: {
        em: [hashedEmail],
      },
    }],
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
    const data = await res.json()
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

async function hashEmail(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim()
  const encoder = new TextEncoder()
  const data = encoder.encode(normalized)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
