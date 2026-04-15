import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { generateOrderPDF } from '@/lib/generateDocument'

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

  // 1. Запис в orders
  const { data: order, error } = await supabase.from('orders').insert({
    profile_id: session.metadata?.userId ?? null,
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

  // 2. Генерирай PDF
  try {
    const pdfBuffer = await generateOrderPDF({
      documentNumber: order.document_number,
      date: new Date(order.created_at).toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      sellerName: process.env.SELLER_NAME!,
      sellerEik: process.env.SELLER_EIK!,
      sellerAddress: process.env.SELLER_ADDRESS!,
      customerEmail: order.customer_email ?? '',
      customerName: order.customer_name ?? undefined,
      planType: order.plan_type,
      billingPeriod: order.billing_period,
      amountEur: order.amount_eur,
      paymentIntentId: order.stripe_payment_intent_id ?? '',
      orderId: order.id,
    })

    // 3. Качи в Supabase Storage
    const filePath = `${order.id}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, pdfBuffer, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      console.error('PDF upload error:', uploadError)
      return
    }

    // 4. Запази URL в orders
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    await supabase.from('orders').update({
      document_url: urlData.publicUrl,
    }).eq('id', order.id)

    console.log('✅ Document generated:', order.document_number)
  } catch (pdfError) {
    console.error('PDF generation error:', pdfError)
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

  // ✅ Нов абонамент (checkout)
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

    // 📝 Запис в orders + генерирай документ
    await createOrder(session, priceId, isMax)
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
