import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-orange-500 mb-2">u4a</h1>
        <p className="text-xl text-orange-700 mb-8">
          Диктовки за деца 2–5 клас
        </p>

        <div className="flex justify-center mb-6">
          <img
            src="/images/fox.png"
            alt="Лисицата помощник"
            style={{ width: 220, height: 220, objectFit: 'contain' }}
          />
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-lg mb-8">
          <p className="text-gray-600 text-lg">
            Здравей! Аз съм твоята лисица помощник.
            Заедно ще учим правопис! 🎉
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href="/register"
            className="bg-orange-500 text-white text-xl font-bold py-4 px-8 rounded-2xl hover:bg-orange-600 transition-colors"
          >
            Започни сега! 🚀
          </Link>
          <Link
            href="/login"
            className="bg-white text-orange-500 text-xl font-bold py-4 px-8 rounded-2xl border-2 border-orange-500 hover:bg-orange-50 transition-colors"
          >
            Вече имам профил
          </Link>
        </div>
      </div>
    </main>
  )
}
