import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data } = await supabase.from('pronunciation_strings').select('key, text')
  const map: Record<string, string> = {}
  if (data) data.forEach((r: {key: string, text: string}) => { map[r.key] = r.text })
  return NextResponse.json(map)
}
