import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  const { sessionId, parentId, correctedResults, newScore } = await req.json()
  
  const { data: link } = await supabaseAdmin
    .from('parent_children')
    .select('child_id')
    .eq('parent_id', parentId)
    .single()
  
  if (!link) return NextResponse.json({ error: 'Не сте родител на това дете' }, { status: 403 })

  const update: Record<string, unknown> = { parent_confirmed: true }
  if (correctedResults) { update.parent_corrected_results = correctedResults; update.score = newScore }

  const { error } = await supabaseAdmin
    .from('dictation_sessions')
    .update(update)
    .eq('id', sessionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
