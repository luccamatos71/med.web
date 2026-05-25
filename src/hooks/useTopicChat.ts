'use client'

import { useCallback, useState } from 'react'

import type { ChatMessage, CitedChunk, SSEEvent } from '@/types/chat'

const API = process.env.NEXT_PUBLIC_API_URL

interface SendMessageInput {
  question: string
  selectedText?: string
  activeMaterialId?: string
}

export function useTopicChat(topicId: string, accessToken: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingSources, setStreamingSources] = useState<CitedChunk[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    if (!accessToken || !topicId) return
    const res = await fetch(`${API}/api/v1/topics/${topicId}/chat/messages`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
    if (!res.ok) return
    const data: ChatMessage[] = await res.json()
    setMessages(data)
  }, [topicId, accessToken])

  const sendMessage = useCallback(
    async ({ question, selectedText, activeMaterialId }: SendMessageInput) => {
      if (!question.trim() || streaming || !accessToken) return

      setErrorMessage(null)
      setStreaming(true)
      setStreamingContent('')
      setStreamingSources([])

      const optimisticUserMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: question,
        cited_chunks: [],
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimisticUserMessage])

      try {
        const response = await fetch(`${API}/api/v1/topics/${topicId}/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            question,
            selected_text: selectedText ?? null,
            active_material_id: activeMaterialId ?? null,
          }),
        })

        if (!response.ok || !response.body) {
          setErrorMessage('O Tutor está temporariamente indisponível. Tente em alguns instantes.')
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
            const payload = block.slice(6)
            try {
              const event = JSON.parse(payload) as SSEEvent
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
                const assistantMessage: ChatMessage = {
                  id: event.message_id || crypto.randomUUID(),
                  role: 'assistant',
                  content: fullText,
                  cited_chunks: finalSources,
                  created_at: new Date().toISOString(),
                }
                setMessages((prev) => [...prev, assistantMessage])
                setStreamingContent('')
                setStreamingSources([])
              }
            } catch {
              // Ignore malformed events and continue streaming.
            }
          }
        }
      } catch {
        setErrorMessage('O Tutor está temporariamente indisponível. Tente em alguns instantes.')
      } finally {
        setStreaming(false)
      }
    },
    [accessToken, topicId, streaming]
  )

  const saveDoubt = useCallback(
    async (input: { question: string; aiAnswer?: string | null; materialId?: string | null }) => {
      if (!accessToken || !topicId) return false
      const res = await fetch(`${API}/api/v1/doubts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          topic_id: topicId,
          question: input.question,
          ai_answer: input.aiAnswer ?? null,
          material_id: input.materialId ?? null,
        }),
      })
      return res.ok
    },
    [accessToken, topicId]
  )

  return {
    messages,
    streaming,
    streamingContent,
    streamingSources,
    errorMessage,
    sendMessage,
    loadHistory,
    saveDoubt,
  }
}
