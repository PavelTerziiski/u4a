import type { Profile } from './types'

/**
 * Изчислява новия streak и update-ва profile-а в DB + локално.
 * Извиква се след успешно завършена диктовка/упражнение.
 * Връща новата стойност на streak за immediate UI display.
 */
export async function updateStreak(
  profile: Profile,
  setProfile: (updater: (p: Profile | null) => Profile | null) => void
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const lastDate = profile.last_session_date
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const newStreak =
    lastDate === today
      ? (profile.streak || 0)
      : lastDate === yesterday
      ? (profile.streak || 0) + 1
      : 1

  try {
    await fetch('/api/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: profile.id,
        updates: {
          total_sessions: (profile.total_sessions || 0) + 1,
          streak: newStreak,
          last_session_date: today,
        },
      }),
    })
  } catch {
    // тихо игнорираме мрежови грешки
  }

  setProfile(p =>
    p
      ? {
          ...p,
          streak: newStreak,
          last_session_date: today,
          total_sessions: (p.total_sessions || 0) + 1,
        }
      : p
  )

  return newStreak
}
