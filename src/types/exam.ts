export interface ExamQuestionPublic {
  index: number
  stem: string
  options: string[]
}

export interface ExamSessionPublic {
  id: string
  scope_type: string
  scope_id: string
  scope_name: string | null
  num_questions: number
  status: string
  questions: ExamQuestionPublic[]
  created_at: string
}

export interface ExamQuestionResult {
  index: number
  stem: string
  options: string[]
  correct_index: number
  selected_index: number | null
  is_correct: boolean
  explanation: string
  source: { page?: number } | null
}

export interface ExamResult {
  id: string
  status: string
  score: number
  total: number
  correct: number
  duration_seconds: number | null
  questions: ExamQuestionResult[]
}
