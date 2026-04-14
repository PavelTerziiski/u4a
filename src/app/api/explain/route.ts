import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { sentence, userInput, grade, language, level } = await req.json()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'No API key' }, { status: 500 })
  }

  // Построяваме точно сравнение: правилна дума → написаното от детето
  const correctWords = sentence.match(/[а-яА-ЯёЁa-zA-Z0-9]+/gi) || []
  const userWords = userInput.match(/[а-яА-ЯёЁa-zA-Z0-9]+/gi) || []
  const differences: string[] = []
  correctWords.forEach((word: string, i: number) => {
    const userWord = userWords[i] || '(липсва)'
    if (word.toLowerCase() !== userWord.toLowerCase()) {
      differences.push(`"${userWord}" → трябва "${word}"`)
    }
  })

  const diffText = differences.length > 0
    ? differences.join(', ')
    : 'няма разлики в думите (може пунктуационна грешка)'

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
      system: `Ти си лисицата — топъл и търпелив учител по български език за деца от 2. до 5. клас. Обясняваш кратко, ясно, с топлина. Използваш markdown: **дума** за важни думи. Максимум 2-3 изречения на грешка. Започваш директно с обяснението. Без "Хей", без "Хихихи". Говориш на чист български.

АКО езикът е "en" или "de": Обяснявай грешките на съответния език (английски/немски). За ниво easy/A1 — прости думи и Present Simple. За medium/A2 — Past Simple и описания. За hard/B1 — по-сложни времена. Обяснението да е на БЪЛГАРСКИ, но примерите на съответния език.

КРИТИЧНО ВАЖНО: Обяснявай САМО грешките, които са изрично посочени в "Точни грешки". НЕ търси други грешки. НЕ коментирай правилно написаните думи. Ако грешката е само пунктуационна — обяснявай само нея.

ПРАВИЛА ПО КЛАС:

2. КЛАС:
- Главна буква в началото на изречение и при собствени имена
- Въпросителен знак след въпрос, удивителен след възклицание
- Правопис на ЙО и ЬО: "йо" в началото на дума и след гласна, "ьо" след съгласна
- Гласни и съгласни звукове

3. КЛАС:
- Неударени гласни в корена — проверява се с ударена форма
- Звучни съгласни пред беззвучни и в края на думата
- Групи съгласни: -стн- (честен), -здн- (празник), -ств- (детство)

4. КЛАС:
- Членуване на съществителни в мъжки род: ПЪЛЕН член -ът/-ят когато думата е ПОДЛОГ, КРАТЪК член -а/-я иначе
- Членуване на прилагателни: ПЪЛЕН член -ият като ПОДЛОГ, КРАТЪК член -ия иначе
- Тесни гласни (е, и) — проверява се с ударена форма

5. КЛАС:
- Превъзходна степен "най-": като ПОДЛОГ → -ият ("най-великият"), като допълнение → -ия
- Сравнителна степен "по-": пише се с тире
- Променливо Я: под ударение → я (бял), без ударение → е (бели)
- Двойно НН при прилагателни от -ен: машинен→машинна
- Двойно ТТ при съществителни от ж.р. на -т с член: нощ→нощта`,
      messages: [{
        role: 'user',
        content: `Клас: ${grade || '?'}, Език: ${language || 'bg'}${level ? ', Ниво: ' + level : ''}
Правилно изречение: "${sentence}"
Детето написа: "${userInput}"
Точни грешки (САМО тези обяснявай): ${diffText}

Обясни накратко защо е грешно и кое е правилото. Обяснявай САМО посочените грешки.`
      }]
    })
  })

  const data = await response.json()
  const explanation = data.content?.[0]?.text || ''

  return NextResponse.json({ explanation })
}
