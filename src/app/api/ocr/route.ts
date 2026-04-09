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
            text: `Това е снимка на ръкописен текст на дете. 
Върни JSON в следния формат — само JSON, без обяснения:
{
  "text": "пълният разпознат текст, всяко изречение на нов ред",
  "words": [
    {"word": "думата", "x": 0.1, "y": 0.05, "w": 0.08, "h": 0.03, "line": 0}
  ]
}
Координатите x, y, w, h са относителни (0-1) спрямо размера на снимката.
x, y е горният ляв ъгъл на думата. w е ширината, h е височината.
line е номерът на реда (0, 1, 2...).`
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