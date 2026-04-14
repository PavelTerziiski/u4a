import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

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

  // ✅ Нов абонамент (checkout)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId
    if (userId) {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
      const priceId = lineItems.data[0]?.price?.id
      const isMax = MAX_PRICE_IDS.includes(priceId)
      await supabase.from('profiles').update({
        is_premium: true,
        plan_type: isMax ? 'max' : 'premium',
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        premium_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq('id', userId)
    }
  }

  // ✅ Upgrade / Downgrade / Reactivation през Customer Portal
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

    // Cancel at period end — все още активен, но маркираме
    if (subscription.cancel_at_period_end) {
      const periodEnd = new Date((subscription as any).current_period_end * 1000).toISOString()
      await supabase.from('profiles').update({
        premium_expires_at: periodEnd,
      }).eq('stripe_customer_id', customerId)
    }
  }

  // ✅ Абонаментът реално изтече
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const customerId = subscription.customer as string
    await supabase.from('profiles').update({
      is_premium: false,
      plan_type: 'free',
      stripe_subscription_id: null,
    }).eq('stripe_customer_id', customerId)
  }

  return NextResponse.json({ received: true })
}
