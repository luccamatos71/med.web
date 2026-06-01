'use client'

import { useCallback, useState } from 'react'

import type { AssistantMessage, AssistantSSEEvent, Conversation } from '@/types/assistant'
import type { CitedChunk } from '@/types/chat'

const API = process.env.NEXT_PUBLIC_API_URL

interface SendInput {
  conversationId: string
  question: string
  activeMaterialId?: string | null
  selectedText?: string | null
}

const UNAVAILABLE = 'O assistente está temporariamente indisponível. Tente em alguns instantes.'

export function useAssistant(accessToken: string) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingSources, setStreamingSources] = useState<CitedChunk[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const authHeader = useCallback(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken]
  )

  const loadConversations = useCallback(async () => {
    if (!accessToken) return []
    const res = await fetch(`${API}/api/v1/assistant/conversations`, {
      headers: authHeader(),
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data: Conversation[] = await res.json()
    setConversations(data)
    return data
  }, [accessToken, authHeader])

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!accessToken || !conversationId) return
      const res = await fetch(
        `${API}/api/v1/assistant/conversations/${conversationId}/messages`,
        { headers: authHeader(), cache: 'no-store' }
      )
      if (!res.ok) {
        setMessages([])
        return
      }
      const data: AssistantMessage[] = await res.json()
      setMessages(data)
    },
    [accessToken, authHeader]
  )

  const createConversation = useCallback(
    async (input?: { topicId?: string; materialId?: string; title?: string }) => {
      if (!accessToken) return null
      const res = await fetch(`${API}/api/v1/assistant/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          title: input?.title ?? null,
          topic_id: input?.topicId ?? null,
          material_id: input?.materialId ?? null,
        }),
      })
      if (!res.ok) return null
      const conversation: Conversation = await res.json()
      setConversations((prev) => [conversation, ...prev])
      return conversation
    },
    [accessToken, authHeader]
  )

  const getOrCreateMaterialConversation = useCallback(
    async (materialId: string) => {
      if (!accessToken) return null
      const res = await fetch(
        `${API}/api/v1/assistant/conversations/for-material/${materialId}`,
        { method: 'POST', headers: authHeader() }
      )
      if (!res.ok) return null
      return (await res.json()) as Conversation
    },
    [accessToken, authHeader]
  )

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (!accessToken) return
      const res = await fetch(
        `${API}/api/v1/assistant/conversations/${conversationId}`,
        { method: 'DELETE', headers: authHeader() }
      )
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId))
      }
    },
    [accessToken, authHeader]
  )

  const sendMessage = useCallback(
    async ({ conversationId, question, activeMaterialId, selectedText }: SendInput) => {
      if (!question.trim() || streaming || !accessToken || !conversationId) return

      setErrorMessage(null)
      setStreaming(true)
      setStreamingContent('')
      setStreamingSources([])

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: question,
          cited_chunks: [],
          created_at: new Date().toISOString(),
        },
      ])

      try {
        const response = await fetch(
          `${API}/api/v1/assistant/conversations/${conversationId}/stream`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify({
              question,
              active_material_id: activeMaterialId ?? null,
              selected_text: selectedText ?? null,
            }),
          }
        )

        if (!response.ok || !response.body) {
          setErrorMessage(UNAVAILABLE)
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let fullText = ''
        let finalSources: CitedChunk[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const blocks = buffer.split('\n\n')
          buffer = blocks.pop() ?? ''

          for (const block of blocks) {
            if (!block.startsWith('data: ')) continue
            try {
              const event = JSON.parse(block.slice(6)) as AssistantSSEEvent
              if (event.type === 'title') {
                setConversations((prev) =>
                  prev.map((c) => (c.id === conversationId ? { ...c, title: event.title } : c))
                )
              }
              if (event.type === 'token') {
                fullText += event.content
                setStreamingContent(fullText)
              }
              if (event.type === 'source') {
                finalSources = event.chunks
                setStreamingSources(event.chunks)
              }
              if (event.type === 'error') {
                setErrorMessage(event.message)
                setStreamingContent('')
              }
              if (event.type === 'done') {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: event.message_id || crypto.randomUUID(),
                    role: 'assistant',
                    content: fullText,
                    cited_chunks: finalSources,
                    created_at: new Date().toISOString(),
                  },
                ])
                setStreamingContent('')
                setStreamingSources([])
              }
            } catch {
              // Ignore malformed events and keep streaming.
            }
          }
        }
      } catch {
        setErrorMessage(UNAVAILABLE)
      } finally {
        setStreaming(false)
      }
    },
    [accessToken, authHeader, streaming]
  )

  return {
    conversations,
    messages,
    streaming,
    streamingContent,
    streamingSources,
    errorMessage,
    setMessages,
    loadConversations,
    loadMessages,
    createConversation,
    getOrCreateMaterialConversation,
    deleteConversation,
    sendMessage,
  }
}
