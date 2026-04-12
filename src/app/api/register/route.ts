import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { id, username, email, fox_name, grade, avatar_id, display_name, is_parent, parent_plan, password } = await req.json()

  // Родителите се регистрират с service role — без email confirmation
  if (is_parent && password) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })
    
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: authData.user.id,
      username,
      email,
      fox_name: 'Бухал',
      grade: 0,
      avatar_id: 3,
      display_name: username,
      is_parent: true,
      parent_plan: parent_plan || 'premium',
    })
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })
    return NextResponse.json({ success: true, userId: authData.user.id })
  }

  // Деца — само профил (Auth вече е създаден с signUp + confirmation)
  const { error } = await supabaseAdmin.from('profiles').insert({
    id,
    username,
    email,
    fox_name,
    grade,
    avatar_id,
    display_name,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
