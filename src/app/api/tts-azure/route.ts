import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'kalina', speed = 0.85, lang: dictLang } = await req.json()
    const ratePercent = speed <= 0.75 ? '-18%' : '-8%'

    let voiceName: string
    let lang: string

    if (dictLang === 'de') {
      // Немски диктовки
      const isFemale = voice === 'koala' || voice === 'kalina'
      voiceName = isFemale ? 'de-DE-KatjaNeural' : 'de-DE-ConradNeural'
      lang = 'de-DE'
    } else if (dictLang === 'en') {
      // Английски диктовки
      const isFemale = voice === 'koala' || voice === 'kalina'
      voiceName = isFemale ? 'en-GB-SoniaNeural' : 'en-GB-RyanNeural'
      lang = 'en-GB'
    } else {
      // Български диктовки
      switch (voice) {
        case 'borisslav':
          voiceName = 'bg-BG-BorislavNeural'
          lang = 'bg-BG'
          break
        case 'kalina':
        default:
          voiceName = 'bg-BG-KalinaNeural'
          lang = 'bg-BG'
          break
      }
    }

    const accentFixes: Record<string, string> = {
      'ранен': 'ранéн', 'Ранен': 'Ранéн',
      'ранена': 'ранéна', 'Ранена': 'Ранéна',
      'ранени': 'ранéни', 'паднали': 'паднáли',
      'загинали': 'загинáли', 'живели': 'живéли',
      'работели': 'работéли', 'говорели': 'говорéли',
      'вървели': 'ървéли', 'носели': 'носéли',
      'пишели': 'пишéли',
    }

    let fixedText = text
    if (lang === 'bg-BG') {
      Object.entries(accentFixes).forEach(([wrong, correct]) => {
        fixedText = fixedText.replaceAll(wrong, correct)
      })
    }

    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">
        <voice name="${voiceName}">
          <prosody rate="${ratePercent}">
            ${fixedText}
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
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      }
    })
  } catch (error) {
    console.error('Azure TTS error:', error)
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
  }
}
