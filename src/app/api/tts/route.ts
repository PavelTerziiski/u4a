import { NextRequest, NextResponse } from 'next/server'
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { text, speed = 1.0, voice = 'female' } = body
  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'No API key' }, { status: 500 })
  }
  const isMale = voice === 'male' || voice === 'borisslav' || voice === 'straus'
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: 'bg-BG',
          ssmlGender: isMale ? 'MALE' : 'FEMALE'
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
    return NextResponse.json({ error: 'No audio', details: data }, { status: 500 })
  }
  const audioBuffer = Buffer.from(data.audioContent, 'base64')
  return new NextResponse(audioBuffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length.toString(),
      'Cache-Control': 'no-cache',
    }
  })
}
