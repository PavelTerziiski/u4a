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
            text: `Извади текста от тази снимка. Правила:
1. Транскрибирай точно това което виждаш.
2. Запази пунктуацията — точки, запетаи, въпросителни, удивителни.
3. Всяко изречение на нов ред.
4. Само текстът — без обяснения, без коментари, без номерация.`
          }
        ]
      }]
    })
  })

  const data = await response.json()
  const text = data.content?.[0]?.text || ''
  return NextResponse.json({ text })
}
