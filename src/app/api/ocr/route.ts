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
            text: `Действай като експерт по графология и начален учител. Твоята задача е да направиш фотографски точен препис на този детски ръкописен текст на български език.

АБСОЛЮТНО ЗАБРАНЕНО е да поправяш правописни, граматически или пунктуационни грешки. Ако видиш дума която изглежда грешно изписана — препиши я точно със символите които виждаш, дори да няма смисъл.

ВАЖНО за български ръкопис:
- Малките букви д, у, р, з, ф имат части които слизат НАДОЛУ под реда — не ги бъркай с буквите от следващия ред
- Изреченията могат да продължават на следващия ред без празен ред — следи за точките
- Буква "ъ" прилича на "а" с чертица отгоре — внимавай да не я пропуснеш
- Буква "й" има чертица отгоре — различава се от "и"
- Ако буква е неясна — опиши я според визуалната форма и избери най-близкото

ФОРМАТ — задължително:
- Всяко изречение на ОТДЕЛЕН РЕД
- Изречението завършва с точка — след точката = нов ред
- Без номерация, без обяснения — само текстът
- Ако не можеш да прочетеш дума — напиши [?]`
          }
        ]
      }]
    })
  })
  const data = await response.json()
  const raw = data.content?.[0]?.text || ''
  return NextResponse.json({ text: raw.trim(), words: [] })
}
