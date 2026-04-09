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
            text: `Това е снимка на ръкописен текст на дете. Правила:
1. Транскрибирай БУКВАЛНО — точно така, както е написано, включително всички грешки.
2. НЕ коригирай нищо. НЕ гадай. НЕ "помагай".
3. Ако не можеш да прочетеш дума — напиши [?].
4. Запази всички препинателни знаци точно където са — точки, запетаи, въпросителни.
5. Всяко изречение на нов ред.
6. Без обяснения, без номерация, само текстът.`
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