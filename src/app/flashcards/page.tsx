'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

import type { Flashcard } from '@/types/flashcard'

const API = process.env.NEXT_PUBLIC_API_URL

export default function FlashcardsPage() {
  const { data: session } = useSession()
  const accessToken = (session?.accessToken as string) ?? ''

  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<Flashcard[]>([])
  const [cards, setCards] = useState<Flashcard[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const [pendingRes, cardsRes] = await Promise.all([
        fetch(`${API}/api/v1/flashcards/pending`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        }),
        fetch(`${API}/api/v1/flashcards`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        }),
      ])
      const pendingJson: Flashcard[] = pendingRes.ok ? await pendingRes.json() : []
      const cardsJson: Flashcard[] = cardsRes.ok ? await cardsRes.json() : []
      setPending(Array.isArray(pendingJson) ? pendingJson : [])
      setCards(Array.isArray(cardsJson) ? cardsJson : [])
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  async function approveCard(cardId: string) {
    if (!accessToken) return
    setBusyId(cardId)
    try {
      await fetch(`${API}/api/v1/flashcards/${cardId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function discardCard(cardId: string) {
    if (!accessToken) return
    setBusyId(cardId)
    try {
      await fetch(`${API}/api/v1/flashcards/${cardId}/discard`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      await load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div style={{ padding: '32px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: '2.375rem',
              fontWeight: 400,
              color: 'var(--base-ink)',
            }}
          >
            Flashcards
          </h1>
          <p
            style={{
              margin: '8px 0 0',
              fontFamily: 'var(--font-ui)',
              fontSize: '0.8125rem',
              color: 'var(--base-whisper)',
            }}
          >
            Fila pendente: {pending.length}
          </p>
        </div>
        <Link
          href="/flashcards/new"
          style={{
            border: 'none',
            borderRadius: 'var(--radius-m)',
            backgroundColor: 'var(--teal-strong)',
            color: '#fff',
            padding: '10px 14px',
            fontFamily: 'var(--font-ui)',
            fontSize: '0.8125rem',
            textDecoration: 'none',
          }}
        >
          Novo flashcard
        </Link>
      </div>

      <section
        style={{
          border: '1px solid var(--base-edge)',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--base-surface)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-ui)',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--base-ink-soft)',
          }}
        >
          Aprovacao em lote
        </h2>
        {loading ? (
          <p style={{ margin: 0, fontFamily: 'var(--font-ui)', color: 'var(--base-whisper)' }}>
            Carregando...
          </p>
        ) : pending.length === 0 ? (
          <p style={{ margin: 0, fontFamily: 'var(--font-ui)', color: 'var(--base-whisper)' }}>
            Sem cards pendentes.
          </p>
        ) : (
          pending.map((card) => (
            <article
              key={card.id}
              style={{
                border: '1px solid var(--base-edge)',
                borderRadius: 'var(--radius-l)',
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                  color: 'var(--base-ink)',
                  lineHeight: 1.45,
                }}
              >
                {card.front}
              </p>
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  color: 'var(--base-ink-soft)',
                  lineHeight: 1.55,
                }}
              >
                {card.back}
              </p>
              {card.source_snippet && (
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-ui)',
                    fontSize: '0.6875rem',
                    color: 'var(--base-whisper)',
                  }}
                >
                  Fonte: {card.source_snippet}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => void approveCard(card.id)}
                  disabled={busyId === card.id}
                  style={{
                    border: 'none',
                    borderRadius: 'var(--radius-m)',
                    backgroundColor: 'var(--teal-strong)',
                    color: '#fff',
                    padding: '8px 12px',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Aprovar
                </button>
                <Link
                  href={`/flashcards/${card.id}/edit`}
                  style={{
                    border: '1px solid var(--base-edge)',
                    borderRadius: 'var(--radius-m)',
                    color: 'var(--base-ink-soft)',
                    padding: '8px 12px',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '0.75rem',
                    textDecoration: 'none',
                  }}
                >
                  Editar
                </Link>
                <button
                  onClick={() => void discardCard(card.id)}
                  disabled={busyId === card.id}
                  style={{
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
                  Descartar
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <section
        style={{
          border: '1px solid var(--base-edge)',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--base-surface)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-ui)',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--base-ink-soft)',
          }}
        >
          Biblioteca
        </h2>
        {cards.length === 0 ? (
          <p style={{ margin: 0, fontFamily: 'var(--font-ui)', color: 'var(--base-whisper)' }}>
            Nenhum flashcard encontrado.
          </p>
        ) : (
          cards.map((card) => (
            <div
              key={card.id}
              style={{
                borderBottom: '1px solid var(--base-edge)',
                paddingBottom: 10,
                marginBottom: 10,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9375rem',
                    color: 'var(--base-ink)',
                  }}
                >
                  {card.front}
                </p>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '0.6875rem',
                    color: 'var(--base-whisper)',
                  }}
                >
                  {card.subject_name ?? 'Materia'} · {card.topic_name ?? 'Topico'} · {card.source}
                </p>
              </div>
              <Link
                href={`/flashcards/${card.id}/edit`}
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.75rem',
                  color: 'var(--teal-strong)',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Editar
              </Link>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
