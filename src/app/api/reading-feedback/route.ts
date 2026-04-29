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

Сравни двете. Отговори САМО с JSON обект без никакъв друг текст:
{"correct": true/false, "feedback": "кратка реакция до 2 изречения на детски език"}

Ако е правилно — похвали с едно кратко изречение.
Ако има грешка — кажи коя дума е сгрешена и как се казва правилно.
Никога повече от 2 изречения. Говори директно към детето.`
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