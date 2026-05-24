export type DoubtStatus = 'pending' | 'resolved' | 'converted_to_flashcard'

export interface Doubt {
  id: string
  user_id: string
  topic_id: string
  material_id: string | null
  question: string
  ai_answer: string | null
  status: DoubtStatus
  resolved_at: string | null
  flashcard_id: string | null
  created_at: string
  subject_name: string | null
  topic_name: string | null
}

export interface DoubtSummaryBySubject {
  subject_id: string
  subject_name: string
  pending_count: number
}

export interface DoubtSummary {
  pending_total: number
  pending_by_subject: DoubtSummaryBySubject[]
}
