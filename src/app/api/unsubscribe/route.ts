import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const profileId = searchParams.get('id')

  if (!profileId) {
    return new NextResponse('Невалиден линк', { status: 400 })
  }

  await supabase
    .from('profiles')
    .update({ email_unsubscribed: true })
    .eq('id', profileId)

  return new NextResponse(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Отписан — u4a.bg</title>
      <style>
        body { font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #FFFBF5; }
        .box { text-align: center; padding: 40px; background: white; border-radius: 16px; border: 2px solid #FED7AA; max-width: 400px; }
        h1 { color: #92400E; }
        p { color: #D97706; }
        a { color: #F97316; }
      </style>
    </head>
    <body>
      <div class="box">
        <div style="font-size: 3rem">🦊</div>
        <h1>Отписан успешно</h1>
        <p>Няма да получаваш повече седмични имейли от u4a.bg</p>
        <p style="margin-top: 16px"><a href="https://u4a.bg">Върни се в приложението</a></p>
      </div>
    </body>
    </html>
  `, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}