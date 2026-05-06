import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { table, id, updates } = await req.json()
  const allowed = ['pronunciation_words', 'pronunciation_strings']
  if (!allowed.includes(table)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const { error } = await supabase.from(table).update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
