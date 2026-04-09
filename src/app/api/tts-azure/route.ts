import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'kalina', speed = 0.85 } = await req.json()
  const ratePercent = Math.round(speed * 100) + '%'

    const voiceName = voice === 'borisslav' 
      ? 'bg-BG-BorislavNeural' 
      : 'bg-BG-KalinaNeural'

    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="bg-BG">
        <voice name="${voiceName}">
          <prosody rate="${ratePercent}">
            ${text}
          </prosody>
        </voice>
      </speak>
    `

    const response = await fetch(
      `https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY!,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        },
        body: ssml,
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Azure TTS error:', error)
      return NextResponse.json({ error: 'Azure TTS failed' }, { status: 500 })
    }

    const audioBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(audioBuffer).toString('base64')

    return NextResponse.json({ audio: base64 })
  } catch (error) {
    console.error('Azure TTS error:', error)
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
  }
}