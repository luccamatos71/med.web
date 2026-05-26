export type FlashcardSource = 'ai_generated' | 'manual' | 'from_doubt'

export interface Flashcard {
  id: string
  user_id: string
  topic_id: string
  material_id: string | null
  doubt_id: string | null
  source: FlashcardSource
  front: string
  back: string
  source_snippet: string | null
  page_number: number | null
  ai_approved_at: string | null
  archived_at: string | null
  created_at: string
  subject_id: string | null
  topic_name: string | null
  subject_name: string | null
  material_title: string | null
}
