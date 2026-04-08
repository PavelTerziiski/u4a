import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { text, speed = 1.0 } = await req.json()

  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'No API key' }, { status: 500 })
  }

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: 'bg-BG',
          name: 'bg-BG-Wavenet-B',
          ssmlGender: 'MALE'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: speed
        }
      })
    }
  )

  const data = await response.json()
  if (!data.audioContent) {
    return NextResponse.json({ error: 'No audio' }, { status: 500 })
  }

  return NextResponse.json({ audio: data.audioContent })
}
