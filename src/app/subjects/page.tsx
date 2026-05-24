'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SubjectCard, AddSubjectCard } from '@/components/subject/SubjectCard'
import { SubjectForm } from '@/components/subject/SubjectForm'
import { Skeleton } from '@/components/ui/skeleton'

const API = process.env.NEXT_PUBLIC_API_URL

interface Subject {
  id: string
  name: string
  color: string
  archived: boolean
  topic_count: number
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(28,25,23,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '32px',
          width: '100%', maxWidth: '480px', boxShadow: '0 4px 12px rgba(28,25,23,0.10)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '1.75rem', fontWeight: 400, margin: '0 0 24px' }}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}

export default function SubjectsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null)
  const [deleteCount, setDeleteCount] = useState({ topics: 0 })

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.accessToken}`,
  }), [session])

  const fetchSubjects = useCallback(async () => {
    if (!session?.accessToken) return
    const res = await fetch(`${API}/api/v1/subjects`, { headers: headers(), cache: 'no-store' })
    if (res.ok) setSubjects(await res.json())
    setLoading(false)
  }, [session, headers])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchSubjects()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchSubjects])

  // Redirect to setup if no subjects
  useEffect(() => {
    if (!loading && subjects.length === 0) router.push('/subjects/new')
  }, [loading, subjects, router])

  async function handleCreate(name: string, color: string) {
    const res = await fetch(`${API}/api/v1/subjects`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name, color }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Erro ao criar matéria')
    }
    const created = await res.json()
    setSubjects(prev => [...prev, created])
    setShowCreate(false)
  }

  async function handleArchive(id: string) {
    const res = await fetch(`${API}/api/v1/subjects/${id}/archive`, { method: 'PATCH', headers: headers() })
    if (res.ok) {
      const updated = await res.json()
      setSubjects(prev => prev.map(s => s.id === id ? updated : s).filter(s => !s.archived))
    }
  }

  async function initiateDelete(id: string) {
    const subject = subjects.find(s => s.id === id)!
    setDeleteTarget(subject)
    const res = await fetch(`${API}/api/v1/subjects/${id}/children-count`, { headers: headers() })
    if (res.ok) setDeleteCount(await res.json())
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await fetch(`${API}/api/v1/subjects/${deleteTarget.id}`, { method: 'DELETE', headers: headers() })
    setSubjects(prev => prev.filter(s => s.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  if (loading) {
    return (
      <div style={{ padding: '32px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} style={{ height: '120px', borderRadius: '12px' }} />)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 48px' }}>
      <h1 style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '2.25rem', fontWeight: 400, color: '#1C1917', margin: '0 0 32px' }}>
        Matérias
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        {subjects.map(subject => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            onArchive={handleArchive}
            onDelete={initiateDelete}
          />
        ))}
        <AddSubjectCard onClick={() => setShowCreate(true)} />
      </div>

      {showCreate && (
        <Modal title="Nova matéria" onClose={() => setShowCreate(false)}>
          <SubjectForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Excluir matéria" onClose={() => setDeleteTarget(null)}>
          <p style={{ fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', color: '#4A3F3A', marginBottom: '16px' }}>
            Tem certeza? Isso vai apagar permanentemente:
          </p>
          <ul style={{ fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', color: '#4A3F3A', marginBottom: '24px' }}>
            <li><strong>{deleteCount.topics}</strong> {deleteCount.topics === 1 ? 'tópico' : 'tópicos'}</li>
          </ul>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setDeleteTarget(null)} style={{ padding: '10px 20px', border: '1px solid #E8DDD4', borderRadius: '8px', background: 'none', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={confirmDelete} style={{ padding: '10px 20px', backgroundColor: '#9B2226', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Excluir</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
