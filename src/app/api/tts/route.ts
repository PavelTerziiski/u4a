import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { text, speed = 1.0, voice = 'female' } = await req.json()

  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'No API key' }, { status: 500 })
  }

  const voiceConfig = voice === 'male'
    ? { languageCode: 'bg-BG', name: 'bg-BG-Standard-B', ssmlGender: 'MALE' }
    : { languageCode: 'bg-BG', name: 'bg-BG-Standard-A', ssmlGender: 'FEMALE' }

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: voiceConfig,
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