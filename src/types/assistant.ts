import type { CitedChunk } from '@/types/chat'

export interface Conversation {
  id: string
  title: string | null
  topic_id?: string | null
  material_id?: string | null
  created_at: string
  updated_at: string
}

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  cited_chunks: CitedChunk[]
  created_at: string
}

export type AssistantSSEEvent =
  | { type: 'title'; title: string }
  | { type: 'token'; content: string }
  | { type: 'source'; chunks: CitedChunk[] }
  | { type: 'done'; message_id: string }
  | { type: 'error'; message: string }
