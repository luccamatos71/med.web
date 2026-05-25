export interface CitedChunk {
  chunk_id: string
  material_title: string
  material_id?: string | null
  topic_id?: string | null
  page_number: number | null
  snippet: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  cited_chunks: CitedChunk[]
  tokens_used?: number | null
  created_at: string
}

export type SSEEvent =
  | { type: 'token'; content: string }
  | { type: 'source'; chunks: CitedChunk[] }
  | { type: 'done'; message_id: string }
  | { type: 'error'; message: string }
