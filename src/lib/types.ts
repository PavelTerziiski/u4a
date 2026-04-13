export type Profile = {
  id: string
  username: string
  display_name: string | null
  grade: 2 | 3 | 4 | 5 | 0
  avatar_id: number
  fox_name: string
  password_hash: string
  streak: number
  plan_type: string
  total_sessions: number
  is_premium: boolean
  is_parent: boolean
  last_session_date: string | null
  created_at: string
  preferred_voice?: string
  parent_plan?: string
  email?: string
}
export type Dictation = {
  id: string
  title: string
  grade: 2 | 3 | 4 | 5
  words: string[]
  sentences: { id: number; text: string }[]
  is_premium: boolean
  created_at: string
  category?: string
  author?: string
  language?: string
  difficulty?: string
}
export type DictationSession = {
  id: string
  profile_id: string
  dictation_id: string | null
  dictation_title: string
  score: number
  total: number
  time_seconds: number
  results: { word: string; correct: boolean; input: string; explanation?: string | null }[]
  created_at: string
  is_scan?: boolean
  ocr_raw?: string | null
  child_correction?: string | null
}
