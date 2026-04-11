import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      return NextResponse.json({ error: 'Грешен имейл или парола: ' + (error?.message || 'no user') }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Профил не намерен: ' + (profileError?.message || 'null') }, { status: 404 })
    }

    if (profile.is_parent) {
      return NextResponse.json({ error: 'Това е родителски акаунт' }, { status: 400 })
    }

    return NextResponse.json({ profile })
  } catch (e) {
    return NextResponse.json({ error: 'Catch: ' + String(e) }, { status: 500 })
  }
}
