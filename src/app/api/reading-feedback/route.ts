import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { original, transcript, grade } = await req.json()

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Ти си Г-жа Лисица — приятелски асистент който помага на деца ${grade} клас да четат на български.
Оригиналното изречение е: "${original}"
Детето прочете: "${transcript}"

Сравни двете по СМИСЪЛ — игнорирай запетаи, точки и пунктуация. Детето чете на глас, не пише. Отговори САМО с JSON обект:
{"correct": true/false, "feedback": "кратка реакция до 2 изречения на детски език"}

Ако детето е прочело думите правилно (дори без запетаи) — похвали. Бъди щедър — 80% от думите правилно е достатъчно за похвала.
Ако има грешка — кажи само коя дума е сгрешена. НЕ показвай оригиналното изречение в отговора!
Отговори САМО с JSON. feedback трябва да е МАКСИМУМ 2-3 думи: ако правилно — "Браво!", "Перфектно!", "Супер!". Ако грешно — "Опитай пак!" или "Почти!" БЕЗ обяснения, БЕЗ емоджи.`
      }]
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Reading feedback error:', error)
    return NextResponse.json({ correct: false, feedback: 'Опитай пак!' })
  }
}