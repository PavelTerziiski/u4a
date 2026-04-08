'use client'
import { useEffect, useState } from 'react'

export default function TestVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices()
      if (v.length > 0) setVoices(v)
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    setTimeout(load, 1000)
  }, [])

  const test = (voice: SpeechSynthesisVoice) => {
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance('приятелство, семейство, доброта')
    utt.voice = voice
    utt.rate = 0.85
    window.speechSynthesis.speak(utt)
  }

  return (
    <main className="min-h-screen bg-orange-50 p-6">
      <h1 className="text-2xl font-bold mb-2">Тест на гласове</h1>
      <p className="text-gray-500 mb-6">Намерени: {voices.length} гласа</p>
      <div className="flex flex-col gap-3">
        {voices.map((v, i) => (
          <button key={i} onClick={() => test(v)}
            className="bg-white p-4 rounded-2xl shadow text-left hover:bg-orange-50">
            <span className="font-bold">{v.name}</span>
            <span className="text-gray-400 ml-2 text-sm">{v.lang}</span>
            {v.localService && <span className="text-green-500 ml-2 text-sm">● локален</span>}
          </button>
        ))}
        {voices.length === 0 && <p className="text-gray-400">Зареждам гласове...</p>}
      </div>
    </main>
  )
}
