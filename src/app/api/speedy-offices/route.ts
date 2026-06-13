import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || 'София'

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }

  try {
    const body = {
      userName: process.env.SPEEDY_USERNAME,
      password: process.env.SPEEDY_PASSWORD,
      language: 'BG',
      countryId: 100,
      name: q,
      resultLimit: 20,
    }

    const speedyRes = await fetch('https://api.speedy.bg/v1/location/office/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await speedyRes.json()
    return NextResponse.json(data?.offices || [], { headers })
  } catch (err) {
    return NextResponse.json({ error: 'Speedy API error' }, { status: 500, headers })
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    }
  })
}
