'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'

import type { Doubt, DoubtSummary } from '@/types/doubt'

const API = process.env.NEXT_PUBLIC_API_URL

export default function DuvidasPage() {
  const { data: session } = useSession()
  const accessToken = (session?.accessToken as string) ?? ''
  const [doubts, setDoubts] = useState<Doubt[]>([])
  const [summary, setSummary] = useState<DoubtSummary | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all')
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null)
  const [olderOnly, setOlderOnly] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    void fetch(`${API}/api/v1/doubts/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DoubtSummary | null) => setSummary(data))
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (subjectFilter) params.set('subject_id', subjectFilter)
    if (olderOnly) params.set('older_than_days', '7')
    void fetch(`${API}/api/v1/doubts?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Doubt[]) => setDoubts(Array.isArray(data) ? data : []))
  }, [accessToken, olderOnly, statusFilter, subjectFilter])

  const pills = useMemo(() => summary?.pending_by_subject ?? [], [summary])

  return (
    <div style={{ padding: '32px 48px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '2.375rem',
            fontWeight: 400,
            color: 'var(--base-ink)',
          }}
        >
          Dúvidas
        </h1>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-ui)',
            fontSize: '0.875rem',
            color: 'var(--amber-strong)',
          }}
        >
          {summary?.pending_total ?? 0} pendentes
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
        <Pill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
          Todas
        </Pill>
        <Pill active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')}>
          Abertas
        </Pill>
        <Pill active={statusFilter === 'resolved'} onClick={() => setStatusFilter('resolved')}>
          Resolvidas
        </Pill>
        {pills.map((item) => (
          <Pill
            key={item.subject_id}
            active={subjectFilter === item.subject_id}
            onClick={() => setSubjectFilter(subjectFilter === item.subject_id ? null : item.subject_id)}
          >
            {item.subject_name} ({item.pending_count})
          </Pill>
        ))}
        <Pill active={olderOnly} onClick={() => setOlderOnly(!olderOnly)}>
          Abertas há 7 dias
        </Pill>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 18 }}>
        {doubts.map((doubt) => (
          <article
            key={doubt.id}
            style={{
              backgroundColor: 'var(--base-surface)',
              border: '1px solid var(--base-edge)',
              borderLeft: `3px solid ${
                doubt.status === 'pending' ? 'var(--amber-main)' : 'var(--teal-main)'
              }`,
              borderRadius: '0 12px 12px 0',
              padding: '12px 14px',
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                color: 'var(--base-ink)',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
              }}
            >
              {doubt.question}
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 10,
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.625rem',
                  textTransform: 'uppercase',
                  backgroundColor:
                    doubt.status === 'pending' ? 'var(--amber-wash)' : 'rgba(93,184,178,0.15)',
                  color: doubt.status === 'pending' ? 'var(--amber-strong)' : 'var(--teal-strong)',
                }}
              >
                {doubt.status === 'pending' ? 'Aberta' : 'Resolvida'}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.6875rem',
                  color: 'var(--base-whisper)',
                }}
              >
                {doubt.subject_name ?? 'Matéria'} · {doubt.topic_name ?? 'Tópico'}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 20,
        border: '1px solid var(--base-edge)',
        backgroundColor: active ? 'var(--teal-strong)' : 'var(--base-surface)',
        color: active ? '#fff' : 'var(--base-ink-soft)',
        fontFamily: 'var(--font-ui)',
        fontSize: '0.75rem',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
