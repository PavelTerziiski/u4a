import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateAndSendDocument } from '@/lib/orderDocuments'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// One-off admin endpoint to retroactively generate + email the NAP document
// for renewal orders that predate the invoice.payment_succeeded fix (see
// src/app/api/stripe/webhook/route.ts) — those rows got inserted into
// `orders` but never had a document_url because the renewal branch never
// called generateAndSendDocument. Renewal orders are identified by
// stripe_checkout_session_id IS NULL (only checkout.session.completed sets
// that field), scoped to status = 'paid' with document_url still NULL, so
// this only ever touches rows the original bug actually affected.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  const dryRun = searchParams.get('dryRun') === 'true'

  if (secret !== process.env.ADMIN_CSV_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'paid')
    .is('document_url', null)
    .is('stripe_checkout_session_id', null)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      count: orders?.length ?? 0,
      orders: (orders ?? []).map(o => ({ id: o.id, created_at: o.created_at, customer_email: o.customer_email })),
    })
  }

  const results: { id: string; customer_email: string | null; ok: boolean; error?: string }[] = []

  for (const order of orders ?? []) {
    try {
      await generateAndSendDocument(order)
      results.push({ id: order.id, customer_email: order.customer_email, ok: true })
    } catch (err) {
      console.error('Backfill error for order', order.id, err)
      results.push({ id: order.id, customer_email: order.customer_email, ok: false, error: String(err) })
    }
  }

  return NextResponse.json({
    total: results.length,
    succeeded: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    results,
  })
}
