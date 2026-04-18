import { Document, Page, Text, View, StyleSheet, pdf, Font, Image } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import React from 'react'
import path from 'path'

Font.register({
  family: 'Roboto',
  fonts: [
    { src: path.join(process.cwd(), 'public/fonts/Roboto-Regular.ttf'), fontWeight: 'normal' },
    { src: path.join(process.cwd(), 'public/fonts/Roboto-Bold.ttf'), fontWeight: 'bold' },
  ]
})

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Roboto', color: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, borderBottom: '2px solid #4ECDC4', paddingBottom: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#2D8B84' },
  subtitle: { fontSize: 10, color: '#7B9E9C', marginTop: 4 },
  docNumber: { fontSize: 11, fontWeight: 'bold', textAlign: 'right' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 9, fontWeight: 'bold', color: '#7B9E9C', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottom: '1px solid #F0F0F0' },
  label: { color: '#7B9E9C', flex: 1 },
  value: { fontWeight: 'bold', flex: 2, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, marginTop: 8, borderTop: '2px solid #4ECDC4' },
  totalLabel: { fontSize: 12, fontWeight: 'bold' },
  totalValue: { fontSize: 14, fontWeight: 'bold', color: '#2D8B84' },
  footer: { marginTop: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  footerText: { fontSize: 9, color: '#AAAAAA' },
  qrImage: { width: 80, height: 80 },
  badge: { backgroundColor: '#F0FAFA', padding: '6 10', borderRadius: 4, marginBottom: 8 },
  badgeText: { color: '#2D8B84', fontSize: 9, fontWeight: 'bold' },
})

interface OrderData {
  documentNumber: string
  date: string
  sellerName: string
  sellerEik: string
  sellerAddress: string
  customerEmail: string
  customerName?: string
  planType: string
  billingPeriod: string
  amountEur: number
  paymentIntentId: string
  orderId: string
}

function formatPlanName(planType: string, billingPeriod: string): string {
  const plan = planType === 'max' ? 'Max' : 'Premium'
  const period = billingPeriod === 'yearly' ? '12 месеца' : '1 месец'
  return `${plan} абонамент — ${period}`
}

export async function generateOrderPDF(order: OrderData): Promise<Buffer> {
  const napShopNumber = process.env.NAP_SHOP_NUMBER || 'RF0006354'
  const qrContent = [
    napShopNumber,
    order.documentNumber,
    order.date,
    order.sellerEik,
    order.amountEur.toFixed(2),
    'EUR',
    order.paymentIntentId,
    order.orderId,
  ].join('|')

  const qrDataUrl = await QRCode.toDataURL(qrContent, { width: 200, margin: 1 })

  const DocComponent = () =>
    React.createElement(Document, null,
      React.createElement(Page, { size: 'A4', style: styles.page },
        React.createElement(View, { style: styles.header },
          React.createElement(View, null,
            React.createElement(Text, { style: styles.title }, 'u4a.bg'),
            React.createElement(Text, { style: styles.subtitle }, 'Диктовки за деца — онлайн платформа'),
          ),
          React.createElement(View, null,
            React.createElement(Text, { style: styles.docNumber }, 'ДОКУМЕНТ ЗА ПРОДАЖБА'),
            React.createElement(Text, { style: { ...styles.docNumber, color: '#4ECDC4', fontSize: 13, marginTop: 4 } }, order.documentNumber),
            React.createElement(Text, { style: { ...styles.docNumber, fontSize: 9, marginTop: 2, color: '#999' } }, order.date),
          ),
        ),

        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, 'Продавач'),
          React.createElement(View, { style: styles.badge },
            React.createElement(Text, { style: styles.badgeText }, order.sellerName),
            React.createElement(Text, { style: { fontSize: 9, color: '#5A7A79', marginTop: 2 } }, `ЕИК: ${order.sellerEik}`),
            React.createElement(Text, { style: { fontSize: 9, color: '#5A7A79', marginTop: 2 } }, order.sellerAddress),
          ),
        ),

        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, 'Купувач'),
          React.createElement(View, { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Имейл'),
            React.createElement(Text, { style: styles.value }, order.customerEmail),
          ),
          order.customerName ? React.createElement(View, { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Име'),
            React.createElement(Text, { style: styles.value }, order.customerName),
          ) : null,
        ),

        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, 'Услуга'),
          React.createElement(View, { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Наименование'),
            React.createElement(Text, { style: styles.value }, formatPlanName(order.planType, order.billingPeriod)),
          ),
          React.createElement(View, { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Данъчна група'),
            React.createElement(Text, { style: styles.value }, 'Б — услуги без ДДС'),
          ),
          React.createElement(View, { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Количество'),
            React.createElement(Text, { style: styles.value }, '1 бр.'),
          ),
          React.createElement(View, { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Начин на плащане'),
            React.createElement(Text, { style: styles.value }, 'Банкова карта (онлайн)'),
          ),
        ),

        React.createElement(View, { style: styles.totalRow },
          React.createElement(Text, { style: styles.totalLabel }, 'Обща сума'),
          React.createElement(Text, { style: styles.totalValue }, `${order.amountEur.toFixed(2)} EUR`),
        ),

        React.createElement(View, { style: { ...styles.section, marginTop: 20 } },
          React.createElement(Text, { style: styles.sectionTitle }, 'Референции'),
          React.createElement(View, { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Номер на поръчка'),
            React.createElement(Text, { style: styles.value }, order.orderId),
          ),
          React.createElement(View, { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Референтен номер на транзакция'),
            React.createElement(Text, { style: styles.value }, order.paymentIntentId || '—'),
          ),
        ),

        React.createElement(View, { style: styles.footer },
          React.createElement(View, null,
            React.createElement(Text, { style: styles.footerText }, 'Документът е издаден по чл. 52о от Наредба Н-18'),
            React.createElement(Text, { style: { ...styles.footerText, marginTop: 2 } }, 'и е валиден без подпис и печат.'),
            React.createElement(Text, { style: { ...styles.footerText, marginTop: 8, color: '#4ECDC4' } }, 'u4a.bg — Диктовки за деца'),
          ),
          React.createElement(Image, { style: styles.qrImage, src: qrDataUrl }),
        ),
      )
    )

  const blob = await pdf(DocComponent()).toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
