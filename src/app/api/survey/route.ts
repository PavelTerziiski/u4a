import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { profileId, useful, dislike, featureRequest, recommend } = await req.json()

    await supabase.from('surveys').insert({
      profile_id: profileId,
      useful,
      dislike,
      feature_request: featureRequest,
      recommend,
    })

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await supabase.from('profiles').update({
      plan_type: 'max',
      is_premium: true,
      premium_expires_at: expiresAt.toISOString(),
    }).eq('id', profileId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Survey error:', error)
    return NextResponse.json({ error: 'Грешка' }, { status: 500 })
  }
}
