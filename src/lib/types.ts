export type Profile = {
  id: string
  username: string
  display_name: string | null
  grade: 2 | 3 | 4 | 5
  avatar_id: number
  fox_name: string
  password_hash: string
  streak: number
  total_sessions: number
  is_premium: boolean
  last_session_date: string | null
  created_at: string
}

export type Dictation = {
  id: string
  title: string
  grade: 2 | 3 | 4 | 5
  words: string[]
  sentences: { id: number; text: string }[]
  is_premium: boolean
  created_at: string
}

export type DictationSession = {
  id: string
  profile_id: string
  dictation_id: string | null
  dictation_title: string
  score: number
  total: number
  time_seconds: number
  results: { word: string; correct: boolean; input: string }[]
  created_at: string
}