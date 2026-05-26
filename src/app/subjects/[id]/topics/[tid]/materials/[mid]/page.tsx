'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

import { Skeleton } from '@/components/ui/skeleton'
import { ChatPanel } from '@/components/viewer/ChatPanel'
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
  const searchParams = useSearchParams()
  const subjectId = params.id as string
  const topicId = params.tid as string
  const materialId = params.mid as string

  const [material, setMaterial] = useState<Material | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [materialError, setMaterialError] = useState(false)
  const [readPosition, setReadPosition] = useState<{ scroll_y?: number; page?: number } | null>(null)
  const [pendingQuestion, setPendingQuestion] = useState<string | undefined>(undefined)
  const [selectionSavedFlag, setSelectionSavedFlag] = useState<string | null>(null)

  const bodyPanelRef = useRef<HTMLDivElement>(null)
  const accessToken = (session?.accessToken as string) ?? ''

  useEffect(() => {
    if (!session?.accessToken) return
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    }
    void Promise.all([
      fetch(`${API}/api/v1/materials/${materialId}`, { headers }).then((r) => {
        if (!r.ok) throw new Error('failed')
        return r.json()
      }),
      fetch(`${API}/api/v1/topics?subject_id=${subjectId}`, { headers }).then((r) => r.json()),
      fetch(`${API}/api/v1/materials/${materialId}/read-position`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([mat, tops, pos]) => {
        setMaterial(mat)
        setTopics(Array.isArray(tops) ? tops : [])
        if (pos?.position_data) setReadPosition(pos.position_data)
        setLoading(false)
      })
      .catch(() => {
        setMaterialError(true)
        setLoading(false)
      })
  }, [materialId, session, subjectId])

  function flattenTopics(topicList: Topic[]): Topic[] {
    const result: Topic[] = []
    for (const topic of topicList) {
      result.push(topic)
      if (topic.subtopics?.length) result.push(...flattenTopics(topic.subtopics))
    }
    return result
  }

  async function saveSelectionAsDoubt(selectedText: string) {
    if (!selectedText || !accessToken) return
    const response = await fetch(`${API}/api/v1/doubts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        topic_id: topicId,
        material_id: materialId,
        question: selectedText,
      }),
    })
    setSelectionSavedFlag(response.ok ? 'Dúvida salva' : 'Falha ao salvar dúvida')
    setTimeout(() => setSelectionSavedFlag(null), 2000)
  }

  const flatTopics = flattenTopics(topics)
  const citedPage = Number(searchParams.get('page'))
  const initialPosition = Number.isInteger(citedPage) && citedPage > 0
    ? { ...(readPosition ?? {}), page: citedPage }
    : readPosition

  return (
    <div
      style={{
        display: 'flex',
        height: 'var(--app-vh)',
        overflow: 'hidden',
        backgroundColor: 'var(--base-canvas)',
      }}
    >
      <div
        style={{
          width: 220,
          flexShrink: 0,
          backgroundColor: 'var(--base-surface)',
          borderRight: '1px solid var(--base-edge)',
          padding: 'max(24px, var(--safe-top)) 16px max(24px, var(--safe-bottom))',
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
            {flatTopics.map((topic) => {
              const isActive = topic.id === topicId
              return (
                <Link
                  key={topic.id}
                  href={`/subjects/${subjectId}/topics/${topic.id}`}
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
                  {topic.name}
                </Link>
              )
            })}
          </nav>
        )}
      </div>

      <div
        ref={bodyPanelRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'max(32px, var(--safe-top)) 48px max(32px, var(--safe-bottom))',
          backgroundColor: 'var(--base-canvas)',
          position: 'relative',
        }}
      >
        {materialError ? (
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.9375rem',
              color: 'var(--terracotta-strong)',
            }}
          >
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
              initialPosition={initialPosition}
              panelRef={bodyPanelRef}
            />
            <SelectionFloater
              containerRef={bodyPanelRef}
              onAskAbout={(text) => setPendingQuestion(text)}
              onSaveDoubt={(text) => void saveSelectionAsDoubt(text)}
            />
            {selectionSavedFlag && (
              <p
                style={{
                  position: 'fixed',
                  right: 'calc(408px + var(--safe-right))',
                  bottom: 'max(18px, var(--safe-bottom))',
                  margin: 0,
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.75rem',
                  color: 'var(--teal-strong)',
                  backgroundColor: 'var(--base-surface)',
                  border: '1px solid var(--base-edge)',
                  borderRadius: 8,
                  padding: '6px 10px',
                }}
              >
                {selectionSavedFlag}
              </p>
            )}
          </>
        )}
      </div>

      <div
        style={{
          width: 380,
          flexShrink: 0,
          backgroundColor: 'var(--base-surface)',
          borderLeft: '1px solid var(--base-edge)',
        }}
      >
        <ChatPanel
          subjectId={subjectId}
          topicId={topicId}
          materialId={materialId}
          accessToken={accessToken}
          pendingQuestion={pendingQuestion}
          onPendingConsumed={() => setPendingQuestion(undefined)}
        />
      </div>
    </div>
  )
}
