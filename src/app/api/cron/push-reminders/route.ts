import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const BATCH_SIZE = 100 // Expo's per-request limit

type BucketKey = 'day1' | 'day3' | 'day7'

const BUCKET_RANK: Record<BucketKey, number> = { day1: 1, day3: 2, day7: 3 }

// Checked highest-first so a user the cron hasn't seen in a while (e.g. it
// missed a day) gets the most relevant message instead of a stale "day 1" one.
const BUCKETS: { key: BucketKey; hours: number }[] = [
  { key: 'day7', hours: 168 },
  { key: 'day3', hours: 72 },
  { key: 'day1', hours: 24 },
]

const MESSAGES: Record<BucketKey, { title: string; body: string }[]> = {
  day1: [
    { title: 'Госпожа Лисица те чака 🦊', body: 'Днес не се видяхме в гората! Ела да довършим приключението заедно.' },
    { title: 'Чака те ново приключение', body: 'В гората има ново упражнение, което чака точно теб.' },
    { title: 'Лисицата пита за теб', body: 'Тя мисли за теб. Ела да продължим откъдето спряхме.' },
  ],
  day3: [
    { title: 'Лисицата намери нещо интересно 🍂', body: 'Ела да видиш какво ново има в гората днес!' },
    { title: 'Гората пак е красива днес', body: 'Госпожа Лисица подготви ново упражнение специално за теб.' },
    { title: '3 дни без приключения...', body: 'Госпожа Лисица пази мястото ти в гората — ела да го заемеш отново.' },
  ],
  day7: [
    { title: 'Липсваш ни в гората 🌲', body: 'Госпожа Лисица все още те чака с ново приключение.' },
    { title: 'Готов ли си?', body: 'Малко работа днес — огромна усмивка утре. Ела да пробваме!' },
    { title: 'Приключението продължава, когато си готов', body: 'Просто знай, че гората те чака.' },
  ],
}

// Picks the highest bucket whose threshold is crossed AND that ranks above
// whatever was already sent — so a user never gets the same bucket twice,
// and a user who jumped straight past day 1/3 gets day 7 instead of nothing.
function pickBucket(hoursInactive: number, alreadySent: BucketKey | null): BucketKey | null {
  const sentRank = alreadySent ? BUCKET_RANK[alreadySent] : 0
  for (const b of BUCKETS) {
    if (hoursInactive >= b.hours && BUCKET_RANK[b.key] > sentRank) {
      return b.key
    }
  }
  return null
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return sendReminders()
}

export async function POST(req: NextRequest) {
  const { secret } = await req.json()
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return sendReminders()
}

async function sendReminders() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, push_token, last_active_at, last_reminder_bucket')
    .not('push_token', 'is', null)
    .lt('last_active_at', dayAgo)

  if (error) {
    console.error('[push-reminders] profiles query failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, candidates: 0 })
  }

  const now = Date.now()
  const targets: { id: string; pushToken: string; bucket: BucketKey; message: { title: string; body: string } }[] = []

  for (const profile of profiles) {
    if (!profile.push_token || !profile.last_active_at) continue
    const hoursInactive = (now - new Date(profile.last_active_at).getTime()) / (60 * 60 * 1000)
    const bucket = pickBucket(hoursInactive, (profile.last_reminder_bucket as BucketKey | null) ?? null)
    if (!bucket) continue

    const variants = MESSAGES[bucket]
    const message = variants[Math.floor(Math.random() * variants.length)]
    targets.push({ id: profile.id, pushToken: profile.push_token, bucket, message })
  }

  let sent = 0
  // TEMP debug — remove once a manual test run confirms the flow end to end.
  const debug: Record<string, unknown>[] = []

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE)

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch.map((t) => ({ to: t.pushToken, title: t.message.title, body: t.message.body }))),
    })
    const json = await res.json().catch(() => null)
    const tickets: { status?: string; message?: string; details?: unknown }[] = json?.data ?? []

    for (let j = 0; j < batch.length; j++) {
      const target = batch[j]
      const ticket = tickets[j]
      if (ticket?.status !== 'ok') {
        console.warn('[push-reminders] send failed for', target.id, ticket)
        // TEMP debug — remove once a manual test run confirms the flow end to end.
        debug.push({ id: target.id, bucket: target.bucket, httpStatus: res.status, expoResponseOk: res.ok, ticket: ticket ?? null, rawExpoBody: !ticket ? json : undefined })
        continue
      }
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ last_reminder_bucket: target.bucket })
        .eq('id', target.id)
      if (updateErr) {
        console.warn('[push-reminders] bucket update failed for', target.id, updateErr.message)
        debug.push({ id: target.id, bucket: target.bucket, ticket, dbUpdateError: updateErr.message })
      } else {
        sent++
        debug.push({ id: target.id, bucket: target.bucket, ticket, saved: true })
      }
    }
  }

  return NextResponse.json({ ok: true, sent, candidates: targets.length, debug })
}
