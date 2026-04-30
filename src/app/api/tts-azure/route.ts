import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Кеш за accent fixes - зарежда се веднъж на 5 минути
const accentCache: Record<string, Record<string, string>> = {}
const cacheTimes: Record<string, number> = {}
async function getAccentFixes(dictationId: string): Promise<Record<string, string>> {
  const now = Date.now()
  if (accentCache[dictationId] && now - (cacheTimes[dictationId] || 0) < 5 * 60 * 1000) return accentCache[dictationId]
  const { data } = await supabase.from('accent_fixes').select('wrong, correct').eq('dictation_id', dictationId)
  accentCache[dictationId] = data ? Object.fromEntries(data.map((r: {wrong: string, correct: string}) => [r.wrong, r.correct])) : {}
  cacheTimes[dictationId] = now
  return accentCache[dictationId]
}

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'kalina', speed = 0.85, lang: dictLang, nocache, dictation_id } = await req.json()
    if (nocache && dictation_id) delete accentCache[dictation_id]
    const ratePercent = speed <= 0.75 ? '-18%' : '-8%'
    let voiceName: string
    let lang: string
    if (dictLang === 'de') {
      const isFemale = voice === 'koala' || voice === 'kalina'
      voiceName = isFemale ? 'de-DE-KatjaNeural' : 'de-DE-ConradNeural'
      lang = 'de-DE'
    } else if (dictLang === 'en') {
      const isFemale = voice === 'koala' || voice === 'kalina'
      voiceName = isFemale ? 'en-GB-SoniaNeural' : 'en-GB-RyanNeural'
      lang = 'en-GB'
    } else {
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
    let fixedText = text
    if (lang === 'bg-BG') {
      const fixes = dictation_id ? await getAccentFixes(dictation_id) : {}
      Object.entries(fixes).forEach(([wrong, correct]) => {
        fixedText = fixedText.split(' ').map((w: string) => { const clean = w.replace(/[.,!?;:]/g, ''); return clean === wrong ? w.replace(clean, correct) : w }).join(' ')
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
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      }
    })
  } catch (error) {
    console.error('Azure TTS error:', error)
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
  }
}
