import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { profileId, updates } = await req.json()
  if (!profileId) return NextResponse.json({ error: 'No profileId' }, { status: 400 })
  const { error } = await supabase.from('profiles').update(updates).eq('id', profileId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
