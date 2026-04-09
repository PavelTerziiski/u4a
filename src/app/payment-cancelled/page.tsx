'use client'

import { useRouter } from 'next/navigation'
import Fox from '@/components/fox/Fox'

export default function PaymentCancelledPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <Fox mood="sad" size={160} />
        <h2 className="text-2xl font-bold text-gray-700 mt-6 mb-2">Плащането е отказано</h2>
        <p className="text-gray-500 mb-8">Не се притеснявай — можеш да опиташ отново по всяко време.</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl hover:bg-orange-600 transition-colors"
        >
          Към началото 🏠
        </button>
      </div>
    </main>
  )
}