import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { image } = await req.json()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'No API key' }, { status: 500 })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: image
            }
          },
          {
            type: 'text',
            text: `Това е снимка на ръкописен текст на дете. Задачата ти е да транскрибираш БУКВАЛНО всяка написана дума — точно така, както е изписана, включително всички правописни грешки, пропуснати букви и неправилно написани думи. НЕ коригирай нищо. НЕ се опитвай да познаеш какво е искал да напише детето. Пиши точно това, което виждаш.
Върни само текста, всяко изречение на нов ред, без обяснения, без номерация.`
          }
        ]
      }]
    })
  })

  const data = await response.json()
  const raw = data.content?.[0]?.text || ''
  
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ text: parsed.text, words: parsed.words })
  } catch {
    return NextResponse.json({ text: raw, words: [] })
  }
}