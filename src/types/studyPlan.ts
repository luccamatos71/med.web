export interface StudyTask {
  type: 'study' | 'review' | 'exam' | string
  label: string
  topic_id?: string | null
  subject_id?: string | null
}

export interface StudyDay {
  date: string
  tasks: StudyTask[]
}

export interface StudyPlanResponse {
  id: string
  exam_date: string
  status: string
  overview: string
  summary: {
    total_days?: number
    topics?: number
    study_sessions?: number
    reviews?: number
    exams?: number
  }
  days: StudyDay[]
  created_at: string
}
