import fs from 'fs'
import path from 'path'

const AZURE_KEY = process.env.AZURE_SPEECH_KEY
const AZURE_REGION = process.env.AZURE_SPEECH_REGION || 'eastus'

const SOUNDS = [
  { name: 'bravo', text: 'Браво! Отлично се справи!' },
  { name: 'super', text: 'Супер! Продължаваме напред!' },
  { name: 'great_week', text: 'Тази седмица се справяш страхотно!' },
  { name: 'keep_going', text: 'Продължаваме с тренировките!' },
  { name: 'perfect', text: 'Перфектно! Нито една грешка!' },
  { name: 'good_job', text: 'Добра работа! Виждам напредък!' },
  { name: 'try_again', text: 'Не се отказвай! Следващия път ще е по-добре!' },
  { name: 'almost', text: 'Почти! Само още малко усилие!' },
  { name: 'well_done', text: 'Много добре! Продължавай така!' },
  { name: 'champion', text: 'Ти си истински шампион!' },
]

async function generateSound(name, text, voice, voiceLabel) {
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="bg-BG">
    <voice name="${voice}"><prosody rate="0.9">${text}</prosody></voice>
  </speak>`

  const res = await fetch(
    `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      },
      body: ssml,
    }
  )

  if (!res.ok) {
    console.error(`Failed: ${name} - ${await res.text()}`)
    return
  }

  const buffer = await res.arrayBuffer()
  fs.writeFileSync(
    path.join('public/sounds', `${name}-${voiceLabel}.mp3`),
    Buffer.from(buffer)
  )
  console.log(`✓ ${name}-${voiceLabel}.mp3`)
}

for (const sound of SOUNDS) {
  await generateSound(sound.name, sound.text, 'bg-BG-KalinaNeural', 'kalina')
  await new Promise(r => setTimeout(r, 300))
}

for (const sound of SOUNDS) {
  await generateSound(sound.name, sound.text, 'bg-BG-BorislavNeural', 'borisslav')
  await new Promise(r => setTimeout(r, 300))
}

console.log('✅ Всички звуци генерирани!')