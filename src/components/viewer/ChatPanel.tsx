'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAssistant } from '@/hooks/useAssistant'
import { AssistantAnswer } from '@/components/assistant/AssistantAnswer'

const API = process.env.NEXT_PUBLIC_API_URL

interface ChatPanelProps {
  subjectId: string
  topicId: string
  materialId: string
  accessToken: string
  pendingQuestion?: string
  onPendingConsumed?: () => void
}

/**
 * In-material chat panel. Same assistant brain as the /assistente tab — it just
 * opens (or continues) the conversation bound to this material, passing the
 * material as active context so retrieval prioritises it.
 */
export function ChatPanel({
  topicId,
  materialId,
  accessToken,
  pendingQuestion,
  onPendingConsumed,
}: ChatPanelProps) {
  const {
    messages,
    streaming,
    streamingContent,
    streamingSources,
    errorMessage,
    loadMessages,
    getOrCreateMaterialConversation,
    sendMessage,
  } = useAssistant(accessToken)

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [savedFlag, setSavedFlag] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!accessToken || !materialId) return
    let cancelled = false
    void getOrCreateMaterialConversation(materialId).then((conversation) => {
      if (cancelled || !conversation) return
      setConversationId(conversation.id)
      void loadMessages(conversation.id)
    })
    return () => {
      cancelled = true
    }
  }, [accessToken, materialId, getOrCreateMaterialConversation, loadMessages])

  useEffect(() => {
    if (pendingQuestion) inputRef.current?.focus()
  }, [pendingQuestion])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const canSubmit = useMemo(
    () => input.trim().length > 0 && !streaming && !!conversationId,
    [input, streaming, conversationId]
  )

  const handleSubmit = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault()
      if (!canSubmit || !conversationId) return
      const question = input.trim()
      setInput('')
      await sendMessage({
        conversationId,
        question,
        activeMaterialId: materialId,
        selectedText: pendingQuestion ?? null,
      })
      onPendingConsumed?.()
    },
    [canSubmit, conversationId, input, materialId, pendingQuestion, sendMessage, onPendingConsumed]
  )

  const saveDoubt = useCallback(
    async (question: string, aiAnswer: string) => {
      if (!accessToken) return
      const res = await fetch(`${API}/api/v1/doubts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          topic_id: topicId,
          question,
          ai_answer: aiAnswer,
          material_id: materialId,
        }),
      })
      setSavedFlag(res.ok ? 'Dúvida salva' : 'Falha ao salvar dúvida')
      setTimeout(() => setSavedFlag(null), 2000)
    },
    [accessToken, topicId, materialId]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--base-edge)',
          fontFamily: 'var(--font-ui)',
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: 'var(--base-ink)',
        }}
      >
        Assistente
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {messages.length === 0 && !streaming && (
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.8125rem',
              color: 'var(--base-whisper)',
              textAlign: 'center',
              marginTop: 24,
            }}
          >
            Pergunte sobre este material ou qualquer outra coisa.
          </p>
        )}

        {messages.map((message, idx) =>
          message.role === 'user' ? (
            <div key={message.id} style={{ textAlign: 'right' }}>
              <p
                style={{
                  display: 'inline-block',
                  maxWidth: '85%',
                  margin: 0,
                  padding: '8px 12px',
                  borderRadius: '12px 12px 2px 12px',
                  border: '1px solid var(--teal-soft)',
                  backgroundColor: 'var(--teal-wash)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  color: 'var(--base-ink)',
                  textAlign: 'left',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {message.content}
              </p>
            </div>
          ) : (
            <div key={message.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  borderLeft: '2.5px solid var(--teal-main)',
                  borderRadius: '0 6px 6px 0',
                  padding: '10px 14px',
                  backgroundColor: '#fff',
                }}
              >
                <AssistantAnswer text={message.content} sources={message.cited_chunks} />
              </div>
              <button
                onClick={() => {
                  const previous = messages[idx - 1]
                  const question = previous?.role === 'user' ? previous.content : message.content
                  void saveDoubt(question, message.content)
                }}
                style={{
                  alignSelf: 'flex-start',
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  color: 'var(--teal-strong)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Salvar como dúvida
              </button>
            </div>
          )
        )}

        {streaming && streamingContent && (
          <div
            style={{
              borderLeft: '2.5px solid var(--teal-main)',
              borderRadius: '0 6px 6px 0',
              padding: '10px 14px',
              backgroundColor: '#fff',
            }}
          >
            <AssistantAnswer text={streamingContent} sources={streamingSources} />
          </div>
        )}

        {errorMessage && (
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.8125rem',
              color: 'var(--terracotta-strong)',
              margin: 0,
            }}
          >
            {errorMessage}
          </p>
        )}

        {savedFlag && (
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.75rem',
              color: 'var(--teal-strong)',
              margin: 0,
            }}
          >
            {savedFlag}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          padding: '12px 16px calc(12px + var(--safe-bottom))',
          borderTop: '1px solid var(--base-edge)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {pendingQuestion && (
          <blockquote
            style={{
              margin: 0,
              padding: '8px 10px',
              backgroundColor: 'var(--teal-wash)',
              borderLeft: '2px solid var(--teal-main)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.8125rem',
              fontStyle: 'italic',
              color: 'var(--base-ink-soft)',
              whiteSpace: 'pre-wrap',
            }}
          >
            &quot;{pendingQuestion}&quot;
          </blockquote>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={streaming || !conversationId}
            placeholder="Pergunte sobre os materiais..."
            rows={2}
            style={{
              flex: 1,
              fontFamily: 'var(--font-ui)',
              fontSize: '0.8125rem',
              lineHeight: 1.5,
              color: 'var(--base-ink)',
              backgroundColor: 'var(--base-canvas)',
              border: '1px solid var(--base-edge)',
              borderRadius: 'var(--radius-m)',
              padding: 12,
              resize: 'none',
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void handleSubmit()
              }
            }}
          />
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: '10px 14px',
              backgroundColor: canSubmit ? 'var(--teal-strong)' : 'var(--base-edge)',
              color: canSubmit ? '#fff' : 'var(--base-whisper)',
              border: 'none',
              borderRadius: 'var(--radius-m)',
              fontFamily: 'var(--font-ui)',
              fontSize: '0.8125rem',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {streaming ? 'Aguardando...' : 'Perguntar'}
          </button>
        </div>
      </form>
    </div>
  )
}
