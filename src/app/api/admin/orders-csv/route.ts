import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const secret = searchParams.get('secret')

  if (secret !== process.env.ADMIN_CSV_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let query = supabase
    .from('orders')
    .select('*')
    .eq('status', 'paid')
    .order('created_at', { ascending: true })

  if (month) {
    const start = `${month}-01`
    const end = `${month}-31`
    query = query.gte('created_at', start).lte('created_at', end)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data || []
  const headers = [
    'document_number',
    'created_at',
    'customer_email',
    'customer_name',
    'plan_type',
    'billing_period',
    'amount_eur',
    'currency',
    'stripe_payment_intent_id',
    'stripe_invoice_id',
    'id',
  ]

  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      const val = r[h] ?? ''
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(','))
  ].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="u4a-orders-${month || 'all'}.csv"`,
    }
  })
}
