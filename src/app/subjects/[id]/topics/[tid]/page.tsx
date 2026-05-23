'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, HelpCircle, Brain } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { UploadModal } from '@/components/material/UploadModal'
import { NoteModal } from '@/components/material/NoteModal'
import { MaterialCard } from '@/components/material/MaterialCard'
import { useUpload } from '@/hooks/useUpload'
import type { Material } from '@/types/material'

const API = process.env.NEXT_PUBLIC_API_URL

interface Topic {
  id: string
  name: string
  parent_topic_id: string | null
  subtopics: Topic[]
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
      padding: '32px', border: '1.5px dashed #D4C8BC', borderRadius: '12px',
      textAlign: 'center',
    }}>
      <Icon size={24} strokeWidth={1.25} color="#D4C8BC" />
      <p style={{ fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.9375rem', fontWeight: 500, color: '#4A3F3A', margin: 0 }}>{title}</p>
      <p style={{ fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.8125rem', color: '#9B8E84', margin: 0 }}>{description}</p>
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
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)

  const accessToken = (session?.accessToken as string) ?? ''

  const handleMaterialUpdate = useCallback((updated: Material) => {
    setMaterials(prev => prev.map(m => m.id === updated.id ? updated : m))
  }, [])

  const { startPolling, stopPolling } = useUpload({
    accessToken,
    onUpdate: handleMaterialUpdate,
  })

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.accessToken}`,
  }), [session])

  useEffect(() => {
    if (!session?.accessToken) return
    fetch(`${API}/api/v1/topics/${topicId}`, { headers: headers() })
      .then(r => r.json())
      .then(data => { setTopic(data); setLoading(false) })
  }, [session, topicId, headers])

  useEffect(() => {
    if (!session?.accessToken) return
    fetch(`${API}/api/v1/materials?topic_id=${topicId}`, { headers: headers() })
      .then(r => r.json())
      .then((data: Material[]) => {
        setMaterials(data)
        // Start polling for any pending/processing materials
        data.forEach(m => {
          if (m.processing_status === 'pending' || m.processing_status === 'processing') {
            startPolling(m.id)
          }
        })
      })
      .catch(() => setMaterials([]))
  }, [session, topicId, headers, startPolling])

  function handleMaterialSuccess(material: Material) {
    setMaterials(prev => [material, ...prev])
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
      if (res.ok) {
        const updated: Material = await res.json()
        setMaterials(prev => prev.map(m => m.id === materialId ? updated : m))
        startPolling(materialId)
      }
    } catch {
      // ignore
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
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
        <Link href={`/subjects/${subjectId}`} style={{ fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.8125rem', color: '#9B8E84', textDecoration: 'none' }}>
          ← Matéria
        </Link>
        {topic.parent_topic_id && (
          <>
            <span style={{ color: '#D4C8BC' }}>›</span>
            <Link href={`/subjects/${subjectId}/topics/${topic.parent_topic_id}`} style={{ fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.8125rem', color: '#9B8E84', textDecoration: 'none' }}>
              Tópico pai
            </Link>
          </>
        )}
      </div>

      <h1 style={{
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        fontSize: '2.375rem',
        fontWeight: 400,
        color: '#1C1917',
        margin: '0 0 32px',
      }}>
        {topic.name}
      </h1>

      {/* Subtopics (if root topic) */}
      {topic.subtopics.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.9375rem', fontWeight: 500, color: '#4A3F3A', margin: '0 0 12px' }}>
            Subtópicos
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {topic.subtopics.map(sub => (
              <Link
                key={sub.id}
                href={`/subjects/${subjectId}/topics/${sub.id}`}
                style={{
                  display: 'block', padding: '10px 16px', backgroundColor: '#FFFFFF',
                  border: '1px solid #E8DDD4', borderRadius: '8px',
                  fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.9375rem', color: '#1C1917', textDecoration: 'none',
                }}
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Content grid: materials (left) + dúvidas/flashcards (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left column: Materials */}
        <div>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.9375rem',
              fontWeight: 500,
              color: 'var(--base-ink-soft)',
              flex: 1,
            }}>
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

          {/* Materials list */}
          {materials.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Sem materiais"
              description="Adicione PDFs ou textos para estudar neste tópico"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {materials.map(m => (
                <MaterialCard
                  key={m.id}
                  material={m}
                  topicId={topicId}
                  subjectId={subjectId}
                  accessToken={accessToken}
                  onRetry={handleRetry}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right column: Dúvidas + Flashcards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
        </div>
      </div>

      {/* Modals */}
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
