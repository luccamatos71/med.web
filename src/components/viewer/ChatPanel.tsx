'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { useTopicChat } from '@/hooks/useTopicChat'
import type { ChatMessage } from '@/types/chat'

interface ChatPanelProps {
  topicId: string
  materialId: string
  accessToken: string
  pendingQuestion?: string
  onPendingConsumed?: () => void
}

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
    sendMessage,
    loadHistory,
    saveDoubt,
  } = useTopicChat(topicId, accessToken)
  const [input, setInput] = useState('')
  const [savedFlag, setSavedFlag] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  useEffect(() => {
    if (!pendingQuestion) return
    inputRef.current?.focus()
  }, [pendingQuestion])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const canSubmit = useMemo(() => input.trim().length > 0 && !streaming, [input, streaming])

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!canSubmit) return
    const question = input.trim()
    setInput('')
    await sendMessage({ question, selectedText: pendingQuestion })
    onPendingConsumed?.()
  }

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
        Tutor
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
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
            Faça uma pergunta sobre os materiais deste tópico.
          </p>
        )}

        {messages.map((message, idx) => (
          <MessageBubble
            key={message.id}
            message={message}
            previousMessage={messages[idx - 1]}
            onSaveDoubt={async () => {
              if (message.role !== 'assistant') return
              const userMessage = messages[idx - 1]
              const ok = await saveDoubt({
                question: userMessage?.role === 'user' ? userMessage.content : message.content,
                aiAnswer: message.content,
                materialId,
              })
              setSavedFlag(ok ? 'Dúvida salva' : 'Falha ao salvar dúvida')
              setTimeout(() => setSavedFlag(null), 2000)
            }}
          />
        ))}

        {streaming && streamingContent && (
          <TutorBlock text={streamingContent} sources={streamingSources} />
        )}

        {errorMessage && (
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.8125rem',
              color: 'var(--base-whisper)',
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
          padding: '12px 16px',
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
            disabled={streaming}
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

function MessageBubble({
  message,
  previousMessage,
  onSaveDoubt,
}: {
  message: ChatMessage
  previousMessage?: ChatMessage
  onSaveDoubt: () => void
}) {
  if (message.role === 'user') {
    return (
      <div style={{ textAlign: 'right' }}>
        <p
          style={{
            display: 'inline-block',
            maxWidth: '85%',
            margin: 0,
            padding: '8px 12px',
            borderRadius: '12px 12px 2px 12px',
            border: '1px solid var(--base-edge)',
            backgroundColor: 'var(--base-canvas)',
            fontFamily: 'var(--font-ui)',
            fontSize: '0.875rem',
            color: 'var(--base-ink)',
            textAlign: 'left',
          }}
        >
          {message.content}
        </p>
      </div>
    )
  }

  if (message.role === 'system') {
    return (
      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-ui)',
            fontSize: '0.6875rem',
            color: 'var(--base-whisper)',
          }}
        >
          conversa anterior resumida
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {previousMessage?.role === 'user' && previousMessage.content.startsWith('"') && (
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
          {previousMessage.content}
        </blockquote>
      )}
      <TutorBlock text={message.content} sources={message.cited_chunks} />
      <div>
        <button
          onClick={onSaveDoubt}
          style={{
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
    </div>
  )
}

function TutorBlock({
  text,
  sources,
}: {
  text: string
  sources: Array<{ material_title: string; page_number: number | null }>
}) {
  return (
    <div
      style={{
        borderLeft: '2.5px solid var(--teal-main)',
        borderRadius: '0 6px 6px 0',
        padding: '10px 14px',
        backgroundColor: '#fff',
      }}
    >
      <p
        style={{
          margin: '0 0 6px',
          fontFamily: 'var(--font-ui)',
          fontSize: '0.6875rem',
          color: 'var(--base-whisper)',
        }}
      >
        Tutor · resposta
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-body)',
          fontSize: '0.8125rem',
          color: 'var(--base-ink)',
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
        }}
      >
        {text}
      </p>
      {sources.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sources.map((source, index) => (
            <span
              key={`${source.material_title}-${index}`}
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '0.6875rem',
                color: 'var(--base-whisper)',
              }}
            >
              Fonte: <span style={{ color: 'var(--teal-strong)' }}>{source.material_title}</span>
              {source.page_number ? ` · p.${source.page_number}` : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
