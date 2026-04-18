import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { generateOrderPDF } from '@/lib/generateDocument'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

const MAX_PRICE_IDS = [
  process.env.NEXT_PUBLIC_STRIPE_MAX_MONTHLY,
  process.env.NEXT_PUBLIC_STRIPE_MAX_YEARLY,
]

function buildEmailHtml(order: {
  customer_name: string | null,
  plan_type: string,
  billing_period: string,
  amount_eur: number,
  document_number: string,
}) {
  const planName = order.plan_type === 'max' ? 'Max' : 'Premium'
  const period = order.billing_period === 'yearly' ? '12 месеца' : '1 месец'
  const greeting = order.customer_name ? order.customer_name : 'приятелю'
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#FFF7ED;border-radius:16px;padding:32px;text-align:center;">
      <div style="font-size:64px;margin-bottom:16px;">&#129418;</div>
      <h1 style="color:#EA580C;font-size:24px;margin-bottom:8px;">Благодаря за абонамента!</h1>
      <p style="color:#78350F;font-size:16px;margin-bottom:24px;">
        Здравей, ${greeting}!<br/>
        Прикачен е твоят документ за продажба.<br/>
        Горската школа те чака! &#127794;
      </p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;text-align:left;">
        <tr style="background:#FEF3C7;">
          <td style="padding:10px 14px;color:#92400E;">Услуга</td>
          <td style="padding:10px 14px;font-weight:bold;color:#78350F;">${planName} абонамент &mdash; ${period}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#92400E;">Сума</td>
          <td style="padding:10px 14px;font-weight:bold;color:#78350F;">${order.amount_eur} EUR</td>
        </tr>
        <tr style="background:#FEF3C7;">
          <td style="padding:10px 14px;color:#92400E;">Документ №</td>
          <td style="padding:10px 14px;font-weight:bold;color:#78350F;">${order.document_number}</td>
        </tr>
      </table>
      <p style="color:#92400E;font-size:12px;margin-top:24px;">
        Документът е издаден по чл. 52о от Наредба Н-18 и е валиден без подпис и печат.
      </p>
      <p style="color:#aaa;font-size:11px;margin-top:16px;">u4a.bg &mdash; Диктовки за деца &#127794;</p>
    </div>
  `
}

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
    const pdfBuffer = await generateOrderPDF({
      documentNumber: order.document_number,
      date: new Date(order.created_at).toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Sofia' }),
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

    const filePath = `${order.id}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, pdfBuffer, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      console.error('PDF upload error:', uploadError)
      return
    }

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    await supabase.from('orders').update({
      document_url: urlData.publicUrl,
      document_sent_at: new Date().toISOString(),
    }).eq('id', order.id)

    if (order.customer_email) {
      await resend.emails.send({
        from: 'u4a.bg <noreply@u4a.bg>',
        to: order.customer_email,
        subject: '🦊 Твоят документ за продажба — u4a.bg',
        html: buildEmailHtml(order),
        attachments: [
          {
            filename: order.document_number + '.pdf',
            content: pdfBuffer,
          }
        ]
      })
      console.log('✅ Email sent to:', order.customer_email)
    }

    console.log('✅ Document generated:', order.document_number)
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
    await supabase.from('orders').insert({
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
    })
  }
  return NextResponse.json({ received: true })
}
