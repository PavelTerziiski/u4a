import { createClient } from '@supabase/supabase-js'
import { generateOrderPDF } from './generateDocument'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

// Shape of a row already inserted into `orders` — used both by the Stripe
// webhook (checkout.session.completed and invoice.payment_succeeded) and by
// the admin backfill route, so the NAP document + receipt email logic lives
// in exactly one place regardless of which event created the order.
export interface OrderRow {
  id: string
  document_number: string
  created_at: string
  customer_email: string | null
  customer_name: string | null
  plan_type: string
  billing_period: string
  amount_eur: number
  stripe_payment_intent_id: string | null
}

function buildEmailHtml(order: Pick<OrderRow, 'customer_name' | 'plan_type' | 'billing_period' | 'amount_eur' | 'document_number'>) {
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

// Generates the NAP-compliant PDF for an already-inserted order, uploads it,
// stamps document_url/document_sent_at, and emails it to the customer.
// Called for every payment that creates an `orders` row — both the initial
// checkout.session.completed and every recurring invoice.payment_succeeded.
export async function generateAndSendDocument(order: OrderRow) {
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
    // Throw (rather than swallow) so callers — the webhook's try/catch and
    // the backfill route's per-order result tracking — both see this as a
    // real failure instead of a silent no-op that leaves document_url NULL
    // while looking like success.
    throw new Error(`PDF upload error: ${uploadError.message}`)
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
}
