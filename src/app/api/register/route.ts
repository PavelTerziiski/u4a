import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { id, username, email, fox_name, grade, avatar_id, display_name, is_parent, parent_plan } = await req.json()
  
  const { error } = await supabaseAdmin.from('profiles').insert({
    id,
    username,
    email,
    fox_name,
    grade,
    avatar_id,
    display_name,
    ...(is_parent ? { is_parent: true, parent_plan: parent_plan || 'premium' } : {}),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
