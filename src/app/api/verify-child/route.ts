import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password })
    if (error || !data.user) return NextResponse.json({ error: 'Грешен имейл или парола' }, { status: 401 })
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()
    if (!profile) return NextResponse.json({ error: 'Профилът не е намерен' }, { status: 404 })
    if (profile.is_parent) return NextResponse.json({ error: 'Това е родителски акаунт' }, { status: 400 })
    return NextResponse.json({ profile })
  } catch {
    return NextResponse.json({ error: 'Грешка' }, { status: 500 })
  }
}
