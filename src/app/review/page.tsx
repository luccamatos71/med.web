'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

import type { RatingType, ReviewCard, ReviewSession } from '@/types/review'

const API = process.env.NEXT_PUBLIC_API_URL

interface SubjectOption {
  id: string
  name: string
}

const ratingStyles: Record<RatingType, { border: string; color: string; label: string }> = {
  again: { border: 'var(--terracotta-soft)', color: 'var(--terracotta-strong)', label: 'Novamente' },
  hard: { border: 'var(--amber-soft)', color: 'var(--amber-strong)', label: 'Dificil' },
  good: { border: 'var(--teal-soft)', color: 'var(--teal-strong)', label: 'Bom' },
  easy: { border: 'var(--teal-soft)', color: 'var(--teal-main)', label: 'Facil' },
}

export default function ReviewPage() {
  const { data: session } = useSession()
  const accessToken = (session?.accessToken as string) ?? ''

  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [subjectId, setSubjectId] = useState('')
  const [loading, setLoading] = useState(true)
  const [queue, setQueue] = useState<ReviewCard[]>([])
  const [initialTotal, setInitialTotal] = useState(0)
  const [newCount, setNewCount] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [ratingsCount, setRatingsCount] = useState<Record<RatingType, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  })
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())

  const current = queue[0] ?? null

  const loadSession = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setErrorMessage('')
    try {
      const [subjectsRes, sessionRes] = await Promise.all([
        fetch(`${API}/api/v1/subjects`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        }),
        fetch(
          `${API}/api/v1/review/session?filter=due${subjectId ? `&subject_id=${subjectId}` : ''}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: 'no-store',
          }
        ),
      ])
      if (!subjectsRes.ok || !sessionRes.ok) throw new Error('Review request failed')
      const subjectPayload: SubjectOption[] = await subjectsRes.json()
      const sessionPayload: ReviewSession = await sessionRes.json()
      setSubjects(Array.isArray(subjectPayload) ? subjectPayload : [])
      setQueue(sessionPayload.cards ?? [])
      setInitialTotal(sessionPayload.total ?? 0)
      setNewCount(sessionPayload.new_count ?? 0)
      setReviewCount(sessionPayload.review_count ?? 0)
      setRatingsCount({ again: 0, hard: 0, good: 0, easy: 0 })
      setResolvedIds(new Set())
      setRevealed(false)
    } catch {
      setQueue([])
      setInitialTotal(0)
      setNewCount(0)
      setReviewCount(0)
      setErrorMessage('Nao foi possivel carregar a sessao de revisao. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, subjectId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSession()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadSession])

  async function rateCurrent(rating: RatingType) {
    if (!current || !accessToken) return
    setBusy(true)
    setErrorMessage('')
    try {
      const response = await fetch(`${API}/api/v1/review/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ flashcard_id: current.flashcard_id, rating }),
      })
      if (!response.ok) throw new Error('Rate request failed')
      const payload = await response.json()
      setRatingsCount((prev) => ({ ...prev, [rating]: prev[rating] + 1 }))
      setRevealed(false)

      if (rating === 'again') {
        const recycledCard: ReviewCard = {
          ...current,
          due_date: payload.due_date,
          state: payload.state,
          reps: payload.reps,
          lapses: payload.lapses,
          intervals: payload.intervals,
        }
        setQueue((prev) => [...prev.slice(1), recycledCard])
      } else {
        setResolvedIds((prev) => new Set(prev).add(current.flashcard_id))
        setQueue((prev) => prev.slice(1))
      }
    } catch {
      setErrorMessage('Nao foi possivel registrar a revisao. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  const resolvedCount = resolvedIds.size
  const progress = initialTotal > 0 ? Math.round((resolvedCount / initialTotal) * 100) : 0

  const completion = useMemo(() => {
    return queue.length === 0 && !loading && !errorMessage
  }, [errorMessage, loading, queue.length])

  return (
    <div style={{ padding: '32px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '2.375rem',
            fontWeight: 400,
            color: 'var(--base-ink)',
          }}
        >
          Revisao FSRS
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--base-whisper)' }}>
            Materia
          </label>
          <select
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            style={{
              border: '1px solid var(--base-edge)',
              borderRadius: 'var(--radius-m)',
              padding: '8px 10px',
              fontFamily: 'var(--font-ui)',
            }}
          >
            <option value="">Vencidos</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => void loadSession()}
            style={{
              border: '1px solid var(--base-edge)',
              borderRadius: 'var(--radius-m)',
              background: 'var(--base-surface)',
              color: 'var(--base-ink-soft)',
              padding: '8px 12px',
              fontFamily: 'var(--font-ui)',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            Atualizar
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <StatCard label="Novos" value={newCount} />
        <StatCard label="A revisar" value={reviewCount} />
        <StatCard label="Concluidos" value={resolvedCount} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            flex: 1,
            height: 3,
            backgroundColor: 'var(--base-edge)',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: 'var(--teal-strong)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.6875rem', color: 'var(--base-whisper)' }}>
          {resolvedCount} de {initialTotal}
        </span>
      </div>

      {errorMessage ? (
        <p role="alert" style={{ margin: 0, fontFamily: 'var(--font-ui)', color: 'var(--terracotta-strong)' }}>
          {errorMessage}
        </p>
      ) : loading ? (
        <p style={{ margin: 0, fontFamily: 'var(--font-ui)', color: 'var(--base-whisper)' }}>Carregando sessao...</p>
      ) : completion ? (
        <section
          style={{
            border: '1px solid var(--base-edge)',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--base-surface)',
            padding: 32,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400 }}>
            Revisao concluida
          </h2>
          <p style={{ margin: 0, fontFamily: 'var(--font-ui)', color: 'var(--base-whisper)' }}>
            Again {ratingsCount.again} · Hard {ratingsCount.hard} · Good {ratingsCount.good} · Easy {ratingsCount.easy}
          </p>
          <Link
            href="/"
            style={{
              marginTop: 6,
              textDecoration: 'none',
              borderRadius: 'var(--radius-m)',
              backgroundColor: 'var(--teal-strong)',
              color: '#fff',
              padding: '10px 16px',
              fontFamily: 'var(--font-ui)',
              fontSize: '0.8125rem',
            }}
          >
            Voltar ao Dashboard
          </Link>
        </section>
      ) : (
        <section
          style={{
            border: '1px solid var(--base-edge)',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--base-surface)',
            minHeight: 460,
            padding: '48px 56px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '0.6875rem',
                color: 'var(--base-whisper)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {revealed ? 'Resposta' : 'Pergunta'}
            </span>
            {current?.source_snippet && (
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.6875rem', color: 'var(--base-whisper)' }}>
                Fonte: {current.source_snippet}
              </span>
            )}
          </div>

          <p
            style={{
              margin: 0,
              textAlign: 'center',
              fontFamily: 'var(--font-body)',
              fontSize: revealed ? '1.0625rem' : '1.375rem',
              lineHeight: revealed ? 1.55 : 1.3,
              color: 'var(--base-ink)',
              transition: 'opacity 0.3s ease',
              whiteSpace: 'pre-wrap',
            }}
          >
            {revealed ? current?.back : current?.front}
          </p>

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              style={{
                border: '1px solid var(--base-edge)',
                borderRadius: 'var(--radius-m)',
                backgroundColor: 'var(--base-surface)',
                color: 'var(--base-ink-soft)',
                padding: '10px 16px',
                fontFamily: 'var(--font-ui)',
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              Revelar resposta
            </button>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {(current?.intervals ?? []).map((interval) => {
                const styleDef = ratingStyles[interval.rating]
                return (
                  <button
                    key={interval.rating}
                    onClick={() => void rateCurrent(interval.rating)}
                    disabled={busy}
                    style={{
                      border: `1px solid ${styleDef.border}`,
                      borderRadius: 'var(--radius-m)',
                      backgroundColor: 'transparent',
                      color: styleDef.color,
                      padding: '10px 12px',
                      fontFamily: 'var(--font-ui)',
                      fontSize: '0.8125rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{styleDef.label}</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--base-whisper)' }}>{interval.interval}</span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: '1px solid var(--base-edge)',
        borderRadius: 'var(--radius-l)',
        backgroundColor: 'var(--base-surface)',
        padding: '10px 14px',
      }}
    >
      <p style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: '0.6875rem', color: 'var(--base-whisper)' }}>
        {label}
      </p>
      <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--base-ink)' }}>
        {value}
      </p>
    </div>
  )
}
