'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { TopicList } from '@/components/topic/TopicList'
import { Skeleton } from '@/components/ui/skeleton'
import type { TopicData } from '@/components/topic/TopicItem'

const API = process.env.NEXT_PUBLIC_API_URL

interface Subject {
  id: string
  name: string
  color: string
  archived: boolean
  topic_count: number
}

export default function SubjectDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const subjectId = params.id as string

  const [subject, setSubject] = useState<Subject | null>(null)
  const [topics, setTopics] = useState<TopicData[]>([])
  const [loading, setLoading] = useState(true)

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.accessToken}`,
  }), [session])

  useEffect(() => {
    if (!session?.accessToken) return
    Promise.all([
      fetch(`${API}/api/v1/subjects/${subjectId}`, { headers: headers() }).then(r => r.json()),
      fetch(`${API}/api/v1/topics?subject_id=${subjectId}`, { headers: headers() }).then(r => r.json()),
    ]).then(([s, t]) => {
      setSubject(s)
      setTopics(Array.isArray(t) ? t : [])
      setLoading(false)
    })
  }, [session, subjectId, headers])

  async function handleAddTopic(name: string, parentId?: string) {
    const res = await fetch(`${API}/api/v1/topics`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ subject_id: subjectId, name, parent_topic_id: parentId ?? null }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail ?? 'Erro ao criar tópico')
    }
    const newTopic = await res.json()
    if (parentId) {
      setTopics(prev => prev.map(t =>
        t.id === parentId
          ? { ...t, subtopics: [...t.subtopics, { ...newTopic, subtopics: [] }] }
          : t
      ))
    } else {
      setTopics(prev => [...prev, { ...newTopic, subtopics: [] }])
    }
  }

  async function handleReorder(items: { id: string; position: number }[]) {
    await fetch(`${API}/api/v1/topics/reorder`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ items }),
    })
  }

  async function handleDelete(id: string) {
    await fetch(`${API}/api/v1/topics/${id}`, { method: 'DELETE', headers: headers() })
    setTopics(prev => prev
      .filter(t => t.id !== id)
      .map(t => ({ ...t, subtopics: t.subtopics.filter(s => s.id !== id) }))
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '32px 48px' }}>
        <Skeleton style={{ height: '42px', width: '300px', marginBottom: '24px' }} />
        {[1, 2, 3].map(i => <Skeleton key={i} style={{ height: '48px', marginBottom: '8px', borderRadius: '8px' }} />)}
      </div>
    )
  }

  if (!subject) return null

  return (
    <div style={{ padding: '32px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: subject.color, flexShrink: 0 }} />
        <h1 style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '2.25rem', fontWeight: 400, color: '#1C1917', margin: 0 }}>
          {subject.name}
        </h1>
      </div>

      <h2 style={{ fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.9375rem', fontWeight: 500, color: '#4A3F3A', margin: '0 0 16px' }}>
        Tópicos
      </h2>

      <TopicList
        topics={topics}
        subjectId={subjectId}
        onAddTopic={handleAddTopic}
        onReorder={handleReorder}
        onDelete={handleDelete}
      />
    </div>
  )
}
