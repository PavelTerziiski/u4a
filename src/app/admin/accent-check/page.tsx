'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Sentence = { text: string }
type Dictation = { id: string; title: string; grade: number; sentences: Sentence[] }

export default function AccentCheck() {
  const [dictations, setDictations] = useState<Dictation[]>([])
  const [selected, setSelected] = useState<Dictation | null>(null)
  const [wrong, setWrong] = useState('')
  const [correct, setCorrect] = useState('')
  const [saved, setSaved] = useState<string[]>([])
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    supabase.from('dictations').select('*').eq('language', 'bg').order('grade').then(({ data }) => {
      if (data) setDictations(data)
    })
  }, [])

  const playText = async (text: string) => {
    setPlaying(true)
    const res = await fetch('/api/tts-azure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: 'kalina', speed: 0.85 })
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => setPlaying(false)
    audio.play()
  }

  const saveFix = async () => {
    if (!wrong || !correct) return
    await supabase.from('accent_fixes').upsert({ wrong, correct })
    setSaved(prev => [...prev, wrong])
    setWrong('')
    setCorrect('')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-6">🎙️ Проверка на ударения</h1>

      <div className="flex gap-6">
        {/* Списък диктовки */}
        <div className="w-64 bg-white rounded-xl shadow p-4 h-fit">
          <h2 className="font-bold mb-3 text-gray-600">Диктовки</h2>
          {dictations.map(d => (
            <button key={d.id}
              onClick={() => setSelected(d)}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm ${selected?.id === d.id ? 'bg-orange-100 text-orange-700 font-bold' : 'hover:bg-gray-100'}`}>
              {d.grade}кл. {d.title}
            </button>
          ))}
        </div>

        {/* Изречения */}
        <div className="flex-1">
          {selected ? (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-bold text-lg mb-4">{selected.title}</h2>
              {(selected.sentences as Sentence[]).map((s, i) => (
                <div key={i} className="flex items-center gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-400 text-sm w-5">{i+1}.</span>
                  <span className="flex-1 text-gray-800">{s.text}</span>
                  <button
                    onClick={() => playText(s.text)}
                    disabled={playing}
                    className="bg-orange-500 text-white px-4 py-1 rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">
                    {playing ? '⏳' : '▶️ Чуй'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow p-6 text-gray-400 text-center">
              ← Избери диктовка
            </div>
          )}

          {/* Добави корекция */}
          <div className="bg-white rounded-xl shadow p-6 mt-4">
            <h2 className="font-bold mb-4">➕ Добави корекция</h2>
            <div className="flex gap-3 items-end">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Грешна дума</label>
                <input value={wrong} onChange={e => setWrong(e.target.value)}
                  placeholder="паднали"
                  className="border rounded-lg px-3 py-2 w-40" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Правилно (с ударение)</label>
                <input value={correct} onChange={e => setCorrect(e.target.value)}
                  placeholder="паднáли"
                  className="border rounded-lg px-3 py-2 w-40" />
              </div>
              <button onClick={saveFix}
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600">
                Запази
              </button>
            </div>
            {saved.length > 0 && (
              <div className="mt-3 text-sm text-green-600">
                ✅ Запазени: {saved.join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
