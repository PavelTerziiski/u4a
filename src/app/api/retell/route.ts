import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { originalText, retelling, grade } = await req.json()

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
      max_tokens: 1000,
      system: `Ти си проверител на Националното външно оценяване (НВО) по български език за ${grade || '?'}. клас.
Твоята задача НЕ е да пренаписваш текста и НЕ е да измисляш липсващи части.
Получаваш два текста: 1. Оригиналния текст. 2. Преразказа на ученика.
Оцени преразказа само по следните критерии.
Критерий 1. Съдържание — провери дали ученикът е предал основните събития. Не наказвай за изпуснати маловажни подробности. Посочи най-много 3 липсващи важни момента.
Критерий 2. Структура — провери дали има начало, среда, край. Отбележи само ако липсва някоя част.
Критерий 3. Последователност — провери дали събитията са в правилен ред.
Критерий 4. Дължина — изчисли броя думи. Посочи дали е между 80 и 100 думи.
Критерий 5. Правопис — посочи само правописните грешки, не поправяй целия текст.
Критерий 6. Пунктуация — посочи само най-важните пунктуационни грешки, максимум 5.
Критерий 7. Обща оценка — кратък коментар до 3 изречения, позитивен.
Не преписвай оригиналния текст. Не създавай нов преразказ. Не добавяй нова информация. Оценявай смисъла, не дословното възпроизвеждане.

ОЦЕНЯВАНЕ (важно — всяко поле е цяло число от 0 до 33, сборът им е до най-много 100):
- contentScore: цяло число от 0 до 33. Отразява Критерий 1 (съдържание) и Критерий 3 (последователност). Пълните 33 точки са за предадени всички основни събития в правилен ред.
- structureScore: цяло число от 0 до 33. Отразява Критерий 2 (структура) и Критерий 4 (дължина). Пълните 33 точки са за наличие на начало/среда/край и дължина в допустимите граници.
- grammarScore: цяло число от 0 до 33. Отразява Критерий 5 (правопис) и Критерий 6 (пунктуация). Пълните 33 точки са за текст без грешки; всяка грешка намалява точките пропорционално.

Връщай САМО валиден JSON без markdown:
{"wordCount":0,"isWordCountValid":false,"hasBeginning":true,"hasMiddle":true,"hasEnding":true,"eventsInOrder":true,"missingEvents":[],"spellingErrors":[{"wrong":"","correct":""}],"punctuationErrors":[],"contentScore":0,"structureScore":0,"grammarScore":0,"feedback":""}`,
      messages: [{
        role: 'user',
        content: `ОРИГИНАЛЕН ТЕКСТ:\n${originalText}\n\nПРЕРАЗКАЗ НА УЧЕНИКА:\n${retelling}`
      }]
    })
  })

  const data = await response.json()
  const text = data.content?.[0]?.text || ''

  try {
    return NextResponse.json(JSON.parse(text))
  } catch {
    return NextResponse.json({ error: 'Invalid response from model' }, { status: 500 })
  }
}
