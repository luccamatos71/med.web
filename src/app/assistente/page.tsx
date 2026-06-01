'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Trash2, Sparkles } from 'lucide-react'

import { useAssistant } from '@/hooks/useAssistant'
import { AssistantAnswer } from '@/components/assistant/AssistantAnswer'

export default function AssistantePage() {
  const { data: session } = useSession()
  const accessToken = (session?.accessToken as string) ?? ''

  const {
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
    deleteConversation,
    sendMessage,
  } = useAssistant(accessToken)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!accessToken) return
    void loadConversations().then((list) => {
      if (list.length > 0) setActiveId((prev) => prev ?? list[0].id)
    })
  }, [accessToken, loadConversations])

  useEffect(() => {
    if (activeId) void loadMessages(activeId)
    else setMessages([])
  }, [activeId, loadMessages, setMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const canSubmit = useMemo(() => input.trim().length > 0 && !streaming, [input, streaming])

  const handleNew = useCallback(() => {
    setActiveId(null)
    setMessages([])
    inputRef.current?.focus()
  }, [setMessages])

  const handleSubmit = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault()
      if (!canSubmit) return
      const question = input.trim()
      setInput('')

      let conversationId = activeId
      if (!conversationId) {
        const conversation = await createConversation()
        if (!conversation) return
        conversationId = conversation.id
        setActiveId(conversation.id)
      }
      await sendMessage({ conversationId, question })
    },
    [activeId, canSubmit, createConversation, input, sendMessage]
  )

  return (
    <div style={{ display: 'flex', height: 'var(--app-vh)' }}>
      {/* Conversation sidebar */}
      <aside
        style={{
          width: 260,
          flexShrink: 0,
          borderRight: '1px solid var(--base-edge)',
          backgroundColor: 'var(--base-surface)',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 'max(16px, var(--safe-top))',
        }}
      >
        <div style={{ padding: '0 16px 12px' }}>
          <button
            onClick={handleNew}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 12px',
              backgroundColor: 'var(--teal-strong)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-m)',
              fontFamily: 'var(--font-ui)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} strokeWidth={1.5} /> Nova conversa
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
          {conversations.map((conversation) => {
            const active = conversation.id === activeId
            return (
              <div
                key={conversation.id}
                onClick={() => setActiveId(conversation.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                  padding: '9px 10px',
                  marginBottom: 2,
                  borderRadius: 'var(--radius-m)',
                  cursor: 'pointer',
                  backgroundColor: active ? 'var(--teal-wash)' : 'transparent',
                  color: active ? 'var(--teal-strong)' : 'var(--base-ink-soft)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: '0.8125rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {conversation.title || 'Nova conversa'}
                </span>
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    void deleteConversation(conversation.id)
                    if (conversation.id === activeId) handleNew()
                  }}
                  aria-label="Apagar conversa"
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'var(--base-whisper)',
                    display: 'flex',
                    padding: 2,
                  }}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            )
          })}
        </div>
      </aside>

      {/* Thread */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '32px 0',
          }}
        >
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
            {messages.length === 0 && !streaming && (
              <div style={{ textAlign: 'center', marginTop: '18vh', color: 'var(--base-whisper)' }}>
                <Sparkles
                  size={32}
                  strokeWidth={1.25}
                  style={{ color: 'var(--teal-main)', marginBottom: 12 }}
                />
                <h1
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-display-m)',
                    fontWeight: 300,
                    color: 'var(--base-ink)',
                    margin: '0 0 6px',
                  }}
                >
                  Como posso ajudar nos estudos?
                </h1>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.875rem', margin: 0 }}>
                  Pergunte qualquer coisa — eu uso seus materiais quando forem relevantes.
                </p>
              </div>
            )}

            {messages.map((message) =>
              message.role === 'user' ? (
                <div key={message.id} style={{ textAlign: 'right', margin: '0 0 18px' }}>
                  <p
                    style={{
                      display: 'inline-block',
                      maxWidth: '80%',
                      margin: 0,
                      padding: '10px 14px',
                      borderRadius: '14px 14px 2px 14px',
                      backgroundColor: 'var(--teal-wash)',
                      border: '1px solid var(--teal-soft)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.9375rem',
                      color: 'var(--base-ink)',
                      textAlign: 'left',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {message.content}
                  </p>
                </div>
              ) : (
                <div key={message.id} style={{ margin: '0 0 24px' }}>
                  <AssistantAnswer text={message.content} sources={message.cited_chunks} />
                </div>
              )
            )}

            {streaming && streamingContent && (
              <div style={{ margin: '0 0 24px' }}>
                <AssistantAnswer text={streamingContent} sources={streamingSources} />
              </div>
            )}

            {streaming && !streamingContent && (
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--base-whisper)' }}>
                Pensando…
              </p>
            )}

            {errorMessage && (
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--terracotta-strong)' }}>
                {errorMessage}
              </p>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Composer */}
        <form
          onSubmit={handleSubmit}
          style={{
            borderTop: '1px solid var(--base-edge)',
            padding: '16px 0 calc(16px + var(--safe-bottom))',
          }}
        >
          <div
            style={{
              maxWidth: 760,
              margin: '0 auto',
              padding: '0 24px',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={streaming}
              placeholder="Pergunte qualquer coisa…"
              rows={1}
              style={{
                flex: 1,
                fontFamily: 'var(--font-ui)',
                fontSize: '0.9375rem',
                lineHeight: 1.5,
                color: 'var(--base-ink)',
                backgroundColor: 'var(--base-surface)',
                border: '1px solid var(--base-edge)',
                borderRadius: 'var(--radius-l)',
                padding: '12px 14px',
                resize: 'none',
                maxHeight: 160,
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
                padding: '12px 18px',
                backgroundColor: canSubmit ? 'var(--teal-strong)' : 'var(--base-edge)',
                color: canSubmit ? '#fff' : 'var(--base-whisper)',
                border: 'none',
                borderRadius: 'var(--radius-l)',
                fontFamily: 'var(--font-ui)',
                fontSize: '0.875rem',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
            >
              Enviar
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
