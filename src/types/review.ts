export type RatingType = 'again' | 'hard' | 'good' | 'easy'
export type ReviewState = 'new' | 'learning' | 'review' | 'relearning'

export interface ReviewInterval {
  rating: RatingType
  label: string
  interval: string
}

export interface ReviewCard {
  flashcard_id: string
  topic_id: string
  subject_id: string | null
  front: string
  back: string
  source_snippet: string | null
  page_number: number | null
  source: string
  due_date: string
  state: ReviewState
  reps: number
  lapses: number
  intervals: ReviewInterval[]
}

export interface ReviewSession {
  cards: ReviewCard[]
  new_count: number
  review_count: number
  total: number
}
