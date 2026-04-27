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

export async function POST(req: NextRequest) {
  try {
    const { userId, username, priceId } = await req.json()
    const price = priceId || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID!

    // Проверяваме дали потребителят някога е имал абонамент
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', userId)
      .single()

    const hasBeenCustomer = !!profile?.stripe_customer_id

    // Ако има активен абонамент — upgrade без trial
    if (profile?.stripe_subscription_id) {
      const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        const updatedSubscription = await stripe.subscriptions.update(profile.stripe_subscription_id, {
          items: [{
            id: subscription.items.data[0].id,
            price,
          }],
          proration_behavior: 'create_prorations',
          metadata: { userId, username, site: 'u4a' },
        })
        return NextResponse.json({ upgraded: true, subscriptionId: updatedSubscription.id })
      }
    }

    // Нов checkout — trial само ако никога не е плащал
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      customer: profile?.stripe_customer_id || undefined,
      subscription_data: {
        metadata: { userId, username, site: 'u4a' },
        // trial removed — 6 free dictations in app instead
      },
      metadata: { userId, username, site: 'u4a' },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/plans`,
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    return NextResponse.json({ url: session.url })

  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Грешка при създаване на плащане' }, { status: 500 })
  }
}
