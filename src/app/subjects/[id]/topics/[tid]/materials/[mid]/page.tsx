'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { MaterialBody } from '@/components/viewer/MaterialBody'
import { SelectionFloater } from '@/components/viewer/SelectionFloater'
import type { Material } from '@/types/material'

const API = process.env.NEXT_PUBLIC_API_URL

interface Topic {
  id: string
  name: string
  parent_topic_id: string | null
  subtopics: Topic[]
}

export default function MaterialViewerPage() {
  const { data: session } = useSession()
  const params = useParams()
  const subjectId = params.id as string
  const topicId = params.tid as string
  const materialId = params.mid as string

  const [material, setMaterial] = useState<Material | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [materialError, setMaterialError] = useState(false)
  const [readPosition, setReadPosition] = useState<{ scroll_y?: number; page?: number } | null>(null)

  // Ref attached to the scrollable Panel 2 div
  const bodyPanelRef = useRef<HTMLDivElement>(null)

  const accessToken = (session?.accessToken as string) ?? ''

  useEffect(() => {
    if (!session?.accessToken) return

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    }

    Promise.all([
      fetch(`${API}/api/v1/materials/${materialId}`, { headers }).then(r => {
        if (!r.ok) throw new Error('Failed to fetch material')
        return r.json()
      }),
      fetch(`${API}/api/v1/topics?subject_id=${subjectId}`, { headers }).then(r => r.json()),
      fetch(`${API}/api/v1/materials/${materialId}/read-position`, { headers })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),
    ]).then(([mat, tops, pos]) => {
      setMaterial(mat)
      setTopics(Array.isArray(tops) ? tops : [])
      if (pos?.position_data) setReadPosition(pos.position_data)
      setLoading(false)
    }).catch(() => {
      setMaterialError(true)
      setLoading(false)
    })
  }, [session, materialId, subjectId])

  // Flatten topics (including subtopics) for sidebar display
  function flattenTopics(topicList: Topic[]): Topic[] {
    const result: Topic[] = []
    for (const t of topicList) {
      result.push(t)
      if (t.subtopics?.length) {
        result.push(...flattenTopics(t.subtopics))
      }
    }
    return result
  }

  const flatTopics = flattenTopics(topics)

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--base-canvas)',
      }}
    >
      {/* Panel 1: Topic sidebar */}
      <div
        style={{
          width: 220,
          flexShrink: 0,
          backgroundColor: 'var(--base-surface)',
          borderRight: '1px solid var(--base-edge)',
          padding: '24px 16px',
          overflowY: 'auto',
        }}
      >
        <Link
          href={`/subjects/${subjectId}`}
          style={{
            display: 'block',
            fontFamily: 'var(--font-ui)',
            fontSize: '0.8125rem',
            color: 'var(--base-whisper)',
            textDecoration: 'none',
            marginBottom: 20,
          }}
        >
          ← Matéria
        </Link>

        {loading ? (
          <>
            <Skeleton style={{ height: 20, width: '80%', marginBottom: 8 }} />
            <Skeleton style={{ height: 20, width: '70%', marginBottom: 8 }} />
            <Skeleton style={{ height: 20, width: '60%', marginBottom: 8 }} />
          </>
        ) : (
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {flatTopics.map(t => {
              const isActive = t.id === topicId
              return (
                <Link
                  key={t.id}
                  href={`/subjects/${subjectId}/topics/${t.id}`}
                  style={{
                    display: 'block',
                    padding: '6px 8px',
                    borderRadius: 6,
                    fontFamily: 'var(--font-ui)',
                    fontSize: '0.8125rem',
                    textDecoration: 'none',
                    color: isActive ? 'var(--teal-strong)' : 'var(--base-ink)',
                    fontWeight: isActive ? 500 : 400,
                    backgroundColor: isActive ? 'var(--teal-wash)' : 'transparent',
                  }}
                >
                  {t.name}
                </Link>
              )
            })}
          </nav>
        )}
      </div>

      {/* Panel 2: Material body — this div is the scroll container */}
      <div
        ref={bodyPanelRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 48px',
          backgroundColor: 'var(--base-canvas)',
          position: 'relative',
        }}
      >
        {materialError ? (
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', color: 'var(--terracotta-strong)', padding: '32px 48px' }}>
            Não foi possível carregar o material.
          </p>
        ) : loading || !material ? (
          <div>
            <Skeleton style={{ height: 32, width: '60%', marginBottom: 16 }} />
            <Skeleton style={{ height: 400, borderRadius: 8 }} />
          </div>
        ) : (
          <>
            <MaterialBody
              material={material}
              accessToken={accessToken}
              initialPosition={readPosition}
              panelRef={bodyPanelRef}
            />
            <SelectionFloater containerRef={bodyPanelRef} />
          </>
        )}
      </div>

      {/* Panel 3: Chat stub */}
      <div
        style={{
          width: 380,
          flexShrink: 0,
          backgroundColor: 'var(--base-surface)',
          borderLeft: '1px solid var(--base-edge)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.8125rem',
            color: 'var(--base-whisper)',
            textAlign: 'center',
            padding: 16,
          }}
        >
          Chat disponível em breve
        </p>
      </div>
    </div>
  )
}
