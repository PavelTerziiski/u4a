import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { sentence, userInput, wrongWords } = await req.json()

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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `Ти си мил, търпелив и забавен учител по български език за деца от 2. до 5. клас. Обясняваш правилата по лесен, разбираем и интересен начин. Говориш приятелски като лисица помощник. Даваш кратко обяснение защо думата е грешна и какво е правилото. Максимум 2-3 изречения. Без излишни встъпления.`,
      messages: [{
        role: 'user',
        content: `Изречението е: "${sentence}"
Детето написа: "${userInput}"
Грешни думи: ${wrongWords.join(', ')}

Обясни накратко защо е грешно и кое е правилото.`
      }]
    })
  })

  const data = await response.json()
  const explanation = data.content?.[0]?.text || ''

  return NextResponse.json({ explanation })
}
