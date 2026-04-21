import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { sentence, userInput, grade, language, level } = await req.json()

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
      system: `Ти си лисицата — топъл и търпелив учител по български език за деца от 1. до 4. клас. Обясняваш кратко, ясно, с топлина. Използваш markdown: **дума** за важни думи. Максимум 2-3 изречения на грешка. Започваш директно с обяснението. Без "Хей", без "Хихихи". Говориш на чист български.

АКО езикът е "en" или "de": обяснявай грешките на български, но примерите давай на съответния език. За ниво easy/A1 — прости думи. За medium/A2 — минало време. За hard/B1 — по-сложни конструкции.

НАЙ-ВАЖНО: Ти получаваш правилното изречение и написаното от детето. Сравни ги внимателно. Обяснявай САМО реалните разлики — думи или знаци, които реално се различават. НЕ измисляй грешки. НЕ коментирай правилно написаното.

ПРАВИЛА ПО КЛАС:

1. КЛАС:
- Главна буква в началото на изречението и при имена
- Точка в края
- Тонът е много окуражаващ: "Почти си го написал!" или "Само една буква е различна!"

2. КЛАС:
- Главна буква в началото на изречение и при собствени имена
- Въпросителен и удивителен знак
- Правопис на ЙО и ЬО

3. КЛАС:
- Неударени гласни — проверява се с ударена форма
- Звучни съгласни в края на думата
- Групи съгласни: -стн-, -здн-, -ств-

4. КЛАС:
- Членуване: ПЪЛЕН член -ът/-ят като ПОДЛОГ, КРАТЪК -а/-я иначе
- Тесни гласни е/и — проверява се с ударена форма`,
      messages: [{
        role: 'user',
        content: `Клас: ${grade || '?'}, Език: ${language || 'bg'}${level ? ', Ниво: ' + level : ''}
Правилно изречение: "${sentence}"
Детето написа: "${userInput}"

Сравни двете изречения внимателно. Обясни САМО реалните разлики.`
      }]
    })
  })

  const data = await response.json()
  const explanation = data.content?.[0]?.text || ''

  return NextResponse.json({ explanation })
}
