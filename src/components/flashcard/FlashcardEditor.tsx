'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'

import type { Flashcard } from '@/types/flashcard'

const API = process.env.NEXT_PUBLIC_API_URL

interface SubjectOption {
  id: string
  name: string
}

interface TopicOption {
  id: string
  name: string
}

interface TopicTreeNode extends TopicOption {
  subtopics?: TopicTreeNode[]
}

interface FlashcardEditorProps {
  flashcardId?: string
}

export function FlashcardEditor({ flashcardId }: FlashcardEditorProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const accessToken = (session?.accessToken as string) ?? ''

  const isEdit = Boolean(flashcardId)
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [topics, setTopics] = useState<TopicOption[]>([])
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [sourceLabel, setSourceLabel] = useState('manual')
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusIsError, setStatusIsError] = useState(false)

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    }),
    [accessToken]
  )

  const loadTopics = useCallback(
    async (nextSubjectId: string) => {
      if (!nextSubjectId || !accessToken) return
      try {
        const response = await fetch(`${API}/api/v1/topics?subject_id=${nextSubjectId}`, {
          headers,
          cache: 'no-store',
        })
        if (!response.ok) throw new Error('Topics request failed')
        const payload: TopicTreeNode[] = await response.json()
        const flattened: TopicOption[] = []
        const walk = (items: TopicTreeNode[], prefix = '') => {
          for (const item of items) {
            const label = prefix ? `${prefix} > ${item.name}` : item.name
            flattened.push({ id: item.id, name: label })
            if (Array.isArray(item.subtopics) && item.subtopics.length > 0) {
              walk(item.subtopics, label)
            }
          }
        }
        walk(payload)
        setTopics(flattened)
      } catch {
        setTopics([])
        setStatusIsError(true)
        setStatusMessage('Nao foi possivel carregar os topicos.')
      }
    },
    [accessToken, headers]
  )

  useEffect(() => {
    if (!accessToken) return
    async function boot() {
      setLoading(true)
      try {
        const subjectsRes = await fetch(`${API}/api/v1/subjects`, { headers, cache: 'no-store' })
        if (!subjectsRes.ok) throw new Error('Subjects request failed')
        const subjectData: SubjectOption[] = await subjectsRes.json()
        setSubjects(subjectData)

        if (isEdit && flashcardId) {
          const cardRes = await fetch(`${API}/api/v1/flashcards/${flashcardId}`, { headers, cache: 'no-store' })
          if (!cardRes.ok) throw new Error('Flashcard request failed')
          const card: Flashcard = await cardRes.json()
          setFront(card.front)
          setBack(card.back)
          setSourceLabel(card.source)
          const initialSubjectId = card.subject_id ?? ''
          setSubjectId(initialSubjectId)
          setTopicId(card.topic_id)
          if (initialSubjectId) {
            await loadTopics(initialSubjectId)
          }
        } else if (subjectData.length > 0) {
          setSubjectId(subjectData[0].id)
          await loadTopics(subjectData[0].id)
        }
      } catch {
        setStatusIsError(true)
        setStatusMessage('Nao foi possivel carregar os dados do flashcard.')
      } finally {
        setLoading(false)
      }
    }

    void boot()
  }, [accessToken, flashcardId, headers, isEdit, loadTopics])

  async function handleSave() {
    if (!front.trim() || !back.trim() || !topicId || !accessToken) return
    setSaving(true)
    setStatusMessage('')
    setStatusIsError(false)
    try {
      const endpoint = isEdit ? `${API}/api/v1/flashcards/${flashcardId}` : `${API}/api/v1/flashcards`
      const method = isEdit ? 'PATCH' : 'POST'
      const payload = isEdit
        ? { front, back, topic_id: topicId, approve_now: true }
        : { front, back, topic_id: topicId }

      const response = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        setStatusIsError(true)
        setStatusMessage('Nao foi possivel salvar o flashcard.')
        return
      }
      setStatusIsError(false)
      setStatusMessage(isEdit ? 'Flashcard atualizado' : 'Flashcard criado')
      setTimeout(() => router.push('/flashcards'), 350)
    } catch {
      setStatusIsError(true)
      setStatusMessage('Nao foi possivel salvar o flashcard.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!flashcardId || !accessToken) return
    const confirmed = window.confirm('Excluir este flashcard? O historico de revisao sera perdido.')
    if (!confirmed) return
    setSaving(true)
    setStatusMessage('')
    setStatusIsError(false)
    try {
      const response = await fetch(`${API}/api/v1/flashcards/${flashcardId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (response.ok) {
        router.push('/flashcards')
      } else {
        setStatusIsError(true)
        setStatusMessage('Nao foi possivel excluir o flashcard.')
      }
    } catch {
      setStatusIsError(true)
      setStatusMessage('Nao foi possivel excluir o flashcard.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '32px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link
            href="/flashcards"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.75rem',
              color: 'var(--base-whisper)',
              textDecoration: 'none',
            }}
          >
            Flashcards
          </Link>
          <span style={{ color: 'var(--base-mute)' }}>›</span>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.75rem',
              color: 'var(--base-whisper)',
            }}
          >
            {isEdit ? 'Editar' : 'Novo'}
          </span>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving || loading}
          style={{
            border: 'none',
            borderRadius: 'var(--radius-m)',
            backgroundColor: 'var(--teal-strong)',
            color: '#fff',
            padding: '10px 16px',
            fontFamily: 'var(--font-ui)',
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(620px, 760px) 260px',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <section
          style={{
            backgroundColor: 'var(--base-surface)',
            border: '1px solid var(--base-edge)',
            borderRadius: 'var(--radius-xl)',
            padding: '40px 42px',
            minHeight: 560,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <textarea
            value={front}
            onChange={(event) => setFront(event.target.value)}
            placeholder="Pergunta..."
            rows={5}
            style={{
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'var(--font-body)',
              fontSize: '1.75rem',
              lineHeight: 1.35,
              color: 'var(--base-ink)',
              backgroundColor: 'transparent',
            }}
          />
          <div style={{ height: 64, borderBottom: '1px solid var(--base-edge)', margin: '6px 0 18px' }} />
          <textarea
            value={back}
            onChange={(event) => setBack(event.target.value)}
            placeholder="Resposta..."
            rows={10}
            style={{
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'var(--font-body)',
              fontSize: '1.125rem',
              lineHeight: 1.55,
              color: 'var(--base-ink)',
              backgroundColor: 'transparent',
            }}
          />
        </section>

        <aside
          style={{
            backgroundColor: 'var(--base-surface)',
            border: '1px solid var(--base-edge)',
            borderRadius: 'var(--radius-xl)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--base-whisper)' }}>
              Materia
            </span>
            <select
              value={subjectId}
              onChange={(event) => {
                const next = event.target.value
                setSubjectId(next)
                setTopicId('')
                void loadTopics(next)
              }}
              style={{
                border: '1px solid var(--base-edge)',
                borderRadius: 'var(--radius-m)',
                padding: '8px 10px',
                fontFamily: 'var(--font-ui)',
              }}
            >
              <option value="">Selecione</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--base-whisper)' }}>
              Topico
            </span>
            <select
              value={topicId}
              onChange={(event) => setTopicId(event.target.value)}
              style={{
                border: '1px solid var(--base-edge)',
                borderRadius: 'var(--radius-m)',
                padding: '8px 10px',
                fontFamily: 'var(--font-ui)',
              }}
            >
              <option value="">Selecione</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--base-whisper)' }}>
              Origem
            </span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--base-ink-soft)' }}>
              {sourceLabel}
            </span>
          </div>

          {statusMessage && (
            <p
              style={{
                margin: '4px 0 0',
                fontFamily: 'var(--font-ui)',
                fontSize: '0.6875rem',
                color: statusIsError ? 'var(--terracotta-strong)' : 'var(--teal-strong)',
              }}
            >
              {statusMessage}
            </p>
          )}

          {isEdit && (
            <button
              onClick={() => void handleDelete()}
              disabled={saving}
              style={{
                marginTop: 8,
                border: '1px solid var(--terracotta-soft)',
                borderRadius: 'var(--radius-m)',
                backgroundColor: 'transparent',
                color: 'var(--terracotta-strong)',
                padding: '8px 12px',
                fontFamily: 'var(--font-ui)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Excluir
            </button>
          )}
        </aside>
      </div>
    </div>
  )
}
