'use client'

import { useEffect, useState, useCallback, type ElementType } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { BookOpen, HelpCircle, Brain } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { UploadModal } from '@/components/material/UploadModal'
import { NoteModal } from '@/components/material/NoteModal'
import { MaterialCard } from '@/components/material/MaterialCard'
import { SummaryView } from '@/components/summary/SummaryView'
import { useUpload } from '@/hooks/useUpload'
import type { Material } from '@/types/material'
import type { Doubt } from '@/types/doubt'

const API = process.env.NEXT_PUBLIC_API_URL

interface Topic {
  id: string
  name: string
  parent_topic_id: string | null
  subtopics: Topic[]
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ElementType
  title: string
  description: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: 32,
        border: '1.5px dashed #D4C8BC',
        borderRadius: 12,
        textAlign: 'center',
      }}
    >
      <Icon size={24} strokeWidth={1.25} color="#D4C8BC" />
      <p
        style={{
          fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
          fontSize: '0.9375rem',
          fontWeight: 500,
          color: '#4A3F3A',
          margin: 0,
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
          fontSize: '0.8125rem',
          color: '#9B8E84',
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  )
}

export default function TopicDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const subjectId = params.id as string
  const topicId = params.tid as string

  const [topic, setTopic] = useState<Topic | null>(null)
  const [loading, setLoading] = useState(true)
  const [materials, setMaterials] = useState<Material[]>([])
  const [doubts, setDoubts] = useState<Doubt[]>([])
  const [newDoubt, setNewDoubt] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [flashcardMessage, setFlashcardMessage] = useState('')
  const [doubtMessage, setDoubtMessage] = useState('')
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false)
  const [view, setView] = useState<'content' | 'summary'>('content')

  const accessToken = (session?.accessToken as string) ?? ''

  const handleMaterialUpdate = useCallback((updated: Material) => {
    setMaterials((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
  }, [])

  const { startPolling } = useUpload({
    accessToken,
    onUpdate: handleMaterialUpdate,
  })

  const headers = useCallback(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    }),
    [session]
  )

  const loadDoubts = useCallback(() => {
    if (!session?.accessToken) return
    void fetch(`${API}/api/v1/topics/${topicId}/doubts`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Doubt[]) => setDoubts(Array.isArray(data) ? data : []))
  }, [headers, session, topicId])

  useEffect(() => {
    if (!session?.accessToken) return
    void fetch(`${API}/api/v1/topics/${topicId}`, { headers: headers() })
      .then((r) => r.json())
      .then((data) => {
        setTopic(data)
        setLoading(false)
      })
      .catch(() => {
        setTopic(null)
        setLoading(false)
      })
  }, [headers, session, topicId])

  useEffect(() => {
    if (!session?.accessToken) return
    void fetch(`${API}/api/v1/materials?topic_id=${topicId}`, { headers: headers() })
      .then((r) => r.json())
      .then((data: Material[]) => {
        setMaterials(data)
        data.forEach((material) => {
          if (material.processing_status === 'pending' || material.processing_status === 'processing') {
            startPolling(material.id)
          }
        })
      })
      .catch(() => setMaterials([]))
  }, [headers, session, startPolling, topicId])

  useEffect(() => {
    loadDoubts()
  }, [loadDoubts])

  function handleMaterialSuccess(material: Material) {
    setMaterials((prev) => [material, ...prev])
    if (material.processing_status === 'pending' || material.processing_status === 'processing') {
      startPolling(material.id)
    }
  }

  async function handleRetry(materialId: string) {
    try {
      const res = await fetch(`${API}/api/v1/materials/${materialId}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) return
      const updated: Material = await res.json()
      setMaterials((prev) => prev.map((m) => (m.id === materialId ? updated : m)))
      startPolling(materialId)
    } catch {
      // noop
    }
  }

  async function createManualDoubt() {
    const question = newDoubt.trim()
    if (!question || !accessToken) return
    const response = await fetch(`${API}/api/v1/doubts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        topic_id: topicId,
        question,
      }),
    })
    if (response.ok) {
      setNewDoubt('')
      loadDoubts()
    }
  }

  async function resolveDoubt(doubtId: string, createFlashcard: boolean) {
    if (!accessToken) return
    setDoubtMessage('')
    try {
      const response = await fetch(`${API}/api/v1/doubts/${doubtId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ create_flashcard: createFlashcard }),
      })
      if (!response.ok) {
        setDoubtMessage('Nao foi possivel concluir a acao. Tente novamente.')
        return
      }
      loadDoubts()
    } catch {
      setDoubtMessage('Nao foi possivel concluir a acao. Tente novamente.')
    }
  }

  async function generateFlashcardsFromReadyMaterials() {
    if (!accessToken || generatingFlashcards) return
    const readyMaterials = materials.filter((material) => material.processing_status === 'ready')
    if (readyMaterials.length === 0) {
      setFlashcardMessage('Nenhum material pronto para gerar flashcards.')
      return
    }
    setGeneratingFlashcards(true)
    setFlashcardMessage('Gerando...')
    try {
      let queued = 0
      let failed = 0
      for (const material of readyMaterials) {
        try {
          const response = await fetch(`${API}/api/v1/materials/${material.id}/flashcards/generate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          if (response.ok) queued += 1
          else failed += 1
        } catch {
          failed += 1
        }
      }
      setFlashcardMessage(
        failed > 0
          ? `${queued} material(is) enfileirado(s); ${failed} falharam.`
          : `${queued} material(is) enfileirado(s) para gerar flashcards.`
      )
    } finally {
      setGeneratingFlashcards(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '32px 48px' }}>
        <Skeleton style={{ height: '48px', width: '400px', marginBottom: '32px' }} />
        <Skeleton style={{ height: '120px', borderRadius: '12px' }} />
      </div>
    )
  }

  if (!topic) return null

  return (
    <div style={{ padding: '32px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
        <Link
          href={`/subjects/${subjectId}`}
          style={{
            fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
            fontSize: '0.8125rem',
            color: '#9B8E84',
            textDecoration: 'none',
          }}
        >
          ← Matéria
        </Link>
        {topic.parent_topic_id && (
          <>
            <span style={{ color: '#D4C8BC' }}>›</span>
            <Link
              href={`/subjects/${subjectId}/topics/${topic.parent_topic_id}`}
              style={{
                fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
                fontSize: '0.8125rem',
                color: '#9B8E84',
                textDecoration: 'none',
              }}
            >
              Tópico pai
            </Link>
          </>
        )}
      </div>

      <h1
        style={{
          fontFamily: 'var(--font-cormorant, Georgia, serif)',
          fontSize: '2.375rem',
          fontWeight: 400,
          color: '#1C1917',
          margin: '0 0 32px',
        }}
      >
        {topic.name}
      </h1>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, backgroundColor: 'var(--base-surface)', border: '1px solid var(--base-edge)', borderRadius: 'var(--radius-round)', padding: 3, width: 'fit-content' }}>
        {(['content', 'summary'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setView(t)}
            style={{
              padding: '6px 16px', borderRadius: 'var(--radius-round)', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: '0.8125rem',
              backgroundColor: view === t ? 'var(--teal-strong)' : 'transparent',
              color: view === t ? '#fff' : 'var(--base-ink-soft)',
            }}
          >
            {t === 'content' ? 'Conteúdo' : 'Resumo do tópico'}
          </button>
        ))}
      </div>

      {view === 'summary' ? (
        <SummaryView topicId={topicId} title={topic.name} accessToken={accessToken} />
      ) : (
      <>
      {topic.subtopics.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2
            style={{
              fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
              fontSize: '0.9375rem',
              fontWeight: 500,
              color: '#4A3F3A',
              margin: '0 0 12px',
            }}
          >
            Subtópicos
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {topic.subtopics.map((sub) => (
              <Link
                key={sub.id}
                href={`/subjects/${subjectId}/topics/${sub.id}`}
                style={{
                  display: 'block',
                  padding: '10px 16px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E8DDD4',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
                  fontSize: '0.9375rem',
                  color: '#1C1917',
                  textDecoration: 'none',
                }}
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '0.9375rem',
                fontWeight: 500,
                color: 'var(--base-ink-soft)',
                flex: 1,
              }}
            >
              Materiais
            </span>
            <button
              onClick={() => setShowUploadModal(true)}
              style={{
                background: 'var(--teal-strong)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-m)',
                padding: '6px 14px',
                fontFamily: 'var(--font-ui)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              + Adicionar material
            </button>
            <button
              onClick={() => void generateFlashcardsFromReadyMaterials()}
              style={{
                background: 'none',
                color: 'var(--amber-strong)',
                border: '1px solid var(--amber-soft)',
                borderRadius: 'var(--radius-m)',
                padding: '6px 14px',
                fontFamily: 'var(--font-ui)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {generatingFlashcards ? 'Gerando...' : 'Gerar flashcards'}
            </button>
            <button
              onClick={() => setShowNoteModal(true)}
              style={{
                background: 'none',
                color: 'var(--teal-strong)',
                border: '1px solid var(--teal-strong)',
                borderRadius: 'var(--radius-m)',
                padding: '6px 14px',
                fontFamily: 'var(--font-ui)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              + Nova nota
            </button>
          </div>
          {flashcardMessage && (
            <p
              style={{
                margin: '0 0 10px',
                fontFamily: 'var(--font-ui)',
                fontSize: '0.75rem',
                color: 'var(--base-whisper)',
              }}
            >
              {flashcardMessage}
            </p>
          )}

          {materials.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Sem materiais"
              description="Adicione PDFs ou textos para estudar neste tópico"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {materials.map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  topicId={topicId}
                  subjectId={subjectId}
                  accessToken={accessToken}
                  onRetry={handleRetry}
                />
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              backgroundColor: 'var(--base-surface)',
              border: '1px solid var(--base-edge)',
              borderRadius: 12,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-ui)',
                fontSize: '0.75rem',
                color: 'var(--base-whisper)',
              }}
            >
              Nova dúvida
            </p>
            <textarea
              value={newDoubt}
              onChange={(event) => setNewDoubt(event.target.value)}
              placeholder="Escreva sua dúvida..."
              rows={3}
              style={{
                width: '100%',
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                border: '1px solid var(--base-edge)',
                borderRadius: 8,
                padding: 10,
                resize: 'vertical',
              }}
            />
            <button
              onClick={() => void createManualDoubt()}
              style={{
                alignSelf: 'flex-end',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                fontFamily: 'var(--font-ui)',
                fontSize: '0.8125rem',
                color: '#fff',
                backgroundColor: 'var(--teal-strong)',
                cursor: 'pointer',
              }}
            >
              Salvar dúvida
            </button>
          </div>

          {doubtMessage && (
            <p
              role="alert"
              style={{
                margin: '0 0 10px',
                fontFamily: 'var(--font-ui)',
                fontSize: '0.75rem',
                color: 'var(--terracotta-strong)',
              }}
            >
              {doubtMessage}
            </p>
          )}

          {doubts.length === 0 ? (
            <>
              <EmptyState
                icon={HelpCircle}
                title="Sem dúvidas"
                description="Suas dúvidas sobre este tópico aparecerão aqui"
              />
              <EmptyState
                icon={Brain}
                title="Sem flashcards"
                description="Flashcards gerados a partir dos seus materiais"
              />
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {doubts.map((doubt) => (
                <article
                  key={doubt.id}
                  style={{
                    border: '1px solid var(--base-edge)',
                    borderLeft: `3px solid ${
                      doubt.status === 'pending' ? 'var(--amber-main)' : 'var(--teal-main)'
                    }`,
                    borderRadius: '0 12px 12px 0',
                    backgroundColor: 'var(--base-surface)',
                    padding: '10px 12px',
                  }}
                >
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
                    {doubt.question}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-ui)',
                        fontSize: '0.625rem',
                        color: 'var(--base-whisper)',
                      }}
                    >
                      {doubt.status}
                    </span>
                    {doubt.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => void resolveDoubt(doubt.id, false)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: 'var(--teal-strong)',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-ui)',
                            fontSize: '0.6875rem',
                          }}
                        >
                          Resolver
                        </button>
                        <button
                          onClick={() => void resolveDoubt(doubt.id, true)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: 'var(--teal-strong)',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-ui)',
                            fontSize: '0.6875rem',
                          }}
                        >
                          Resolver + flashcard
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {showUploadModal && (
        <UploadModal
          topicId={topicId}
          accessToken={accessToken}
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleMaterialSuccess}
        />
      )}
      {showNoteModal && (
        <NoteModal
          topicId={topicId}
          accessToken={accessToken}
          onClose={() => setShowNoteModal(false)}
          onSuccess={handleMaterialSuccess}
        />
      )}
    </div>
  )
}
