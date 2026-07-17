import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { generateAndSendDocument } from '@/lib/orderDocuments'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_PRICE_IDS = [
  process.env.NEXT_PUBLIC_STRIPE_MAX_MONTHLY,
  process.env.NEXT_PUBLIC_STRIPE_MAX_YEARLY,
]

async function createOrder(session: Stripe.Checkout.Session, priceId: string | undefined, isMax: boolean) {
  const billingPeriod = priceId?.includes('yearly') ? 'yearly' : 'monthly'
  const amount = (session.amount_total ?? 0) / 100

  const { data: order, error } = await supabase.from('orders').insert({
    profile_id: null,
    stripe_payment_intent_id: session.payment_intent as string ?? null,
    stripe_invoice_id: session.invoice as string ?? null,
    stripe_checkout_session_id: session.id,
    amount_eur: amount,
    currency: session.currency?.toUpperCase() ?? 'EUR',
    plan_type: isMax ? 'max' : 'premium',
    billing_period: billingPeriod,
    status: 'paid',
    customer_email: session.customer_details?.email ?? null,
    customer_name: session.customer_details?.name ?? null,
  }).select().single()

  if (error || !order) {
    console.error('Order insert error:', error)
    return
  }

  try {
    await generateAndSendDocument(order)
  } catch (pdfError) {
    console.error('PDF/Email error:', pdfError)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
    const priceId = lineItems.data[0]?.price?.id
    const isMax = MAX_PRICE_IDS.includes(priceId)

    if (userId) {
      await supabase.from('profiles').update({
        is_premium: true,
        plan_type: isMax ? 'max' : 'premium',
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        premium_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq('id', userId)
    }

    await createOrder(session, priceId, isMax)
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription
    const customerId = subscription.customer as string
    const priceId = subscription.items.data[0]?.price?.id
    const isMax = MAX_PRICE_IDS.includes(priceId)
    const status = subscription.status

    if (status === 'active' || status === 'trialing') {
      await supabase.from('profiles').update({
        is_premium: true,
        plan_type: isMax ? 'max' : 'premium',
        stripe_subscription_id: subscription.id,
      }).eq('stripe_customer_id', customerId)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const customerId = subscription.customer as string

    await supabase.from('profiles').update({
      is_premium: false,
      plan_type: 'free',
      stripe_subscription_id: null,
    }).eq('stripe_customer_id', customerId)
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice
    // Пропускаме първото плащане - то се обработва от checkout.session.completed
    if (invoice.billing_reason === 'subscription_create') {
      return NextResponse.json({ received: true })
    }
    const customerId = invoice.customer as string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const priceId = ((invoice.lines.data[0] as any)?.price?.id as string | undefined)
    const isMax = MAX_PRICE_IDS.includes(priceId)
    const billingPeriod = priceId?.includes('yearly') ? 'yearly' : 'monthly'
    const amount = (invoice.amount_paid ?? 0) / 100
    const { data: profile } = await supabase.from('profiles').select('id').eq('stripe_customer_id', customerId).single()
    const { data: order, error } = await supabase.from('orders').insert({
      profile_id: profile?.id ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stripe_payment_intent_id: (invoice as any).payment_intent as string ?? null,
      stripe_invoice_id: invoice.id,
      amount_eur: amount,
      currency: invoice.currency?.toUpperCase() ?? 'EUR',
      plan_type: isMax ? 'max' : 'premium',
      billing_period: billingPeriod,
      status: 'paid',
      customer_email: invoice.customer_email ?? null,
    }).select().single()

    if (error || !order) {
      console.error('Renewal order insert error:', error)
      return NextResponse.json({ received: true })
    }

    try {
      await generateAndSendDocument(order)
    } catch (pdfError) {
      console.error('PDF/Email error:', pdfError)
    }
  }
  return NextResponse.json({ received: true })
}
