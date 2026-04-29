import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as Blob
    const language = formData.get('language') as string || 'bg'

    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 })
    }

    const openaiFormData = new FormData()
    openaiFormData.append('file', file, 'audio.webm')
    openaiFormData.append('model', 'whisper-1')
    openaiFormData.append('language', language)

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: openaiFormData,
    })

    const data = await res.json()
    return NextResponse.json({ text: data.text || '' })
  } catch (error) {
    console.error('Whisper error:', error)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}