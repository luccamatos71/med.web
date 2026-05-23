export type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed'
export type MaterialType = 'pdf' | 'text' | 'note'

export interface Material {
  id: string
  topic_id: string
  user_id: string
  type: MaterialType
  title: string
  content: string | null
  file_key: string | null
  file_size_bytes: number | null
  processing_status: ProcessingStatus
  processing_error: string | null
  processed_at: string | null
  created_at: string
}

export interface ReadPosition {
  position_data: { scroll_y?: number; page?: number }
  updated_at: string
}
