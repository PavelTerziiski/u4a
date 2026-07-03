import { supabase } from './supabase'
import type { Profile } from './types'

/**
 * Award acorns to a user. Adds to current balance, returns new total.
 * Safe to call from any game's done screen.
 *
 * @param profile - The user's profile (must have username)
 * @param amount - How many acorns to add (must be > 0)
 * @returns new total acorns, or null on error
 */
export async function awardAcorns(
  profile: Profile | null | undefined,
  amount: number
): Promise<number | null> {
  if (!profile?.username || amount <= 0) return null

  // Fetch current balance to compute new total
  const { data: current, error: fetchErr } = await supabase
    .from('profiles')
    .select('acorns_total')
    .eq('username', profile.username)
    .single()

  if (fetchErr || !current) {
    console.error('[acorns] fetch failed:', fetchErr?.message)
    return null
  }

  const newTotal = (current.acorns_total || 0) + amount

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ acorns_total: newTotal })
    .eq('username', profile.username)

  if (updateErr) {
    console.error('[acorns] update failed:', updateErr.message)
    return null
  }

  return newTotal
}

/**
 * Multiplier from in-game score to acorns. Centralized so all games
 * share the same exchange rate.
 */
export const SCORE_TO_ACORNS_MULTIPLIER = 10
