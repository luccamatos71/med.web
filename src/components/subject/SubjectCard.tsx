'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Subject {
  id: string
  name: string
  color: string
  archived: boolean
  topic_count: number
}

interface SubjectCardProps {
  subject: Subject
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}

export function SubjectCard({ subject, onArchive, onDelete }: SubjectCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: '#FFFFFF',
        border: `1px solid ${hovered ? '#2EA39E' : '#E8DDD4'}`,
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 4px 12px rgba(28,25,23,0.10), 0 2px 4px rgba(28,25,23,0.06)'
          : '0 1px 3px rgba(28,25,23,0.06)',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Accent bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: subject.color }} />

      <Link
        href={`/subjects/${subject.id}`}
        style={{ textDecoration: 'none', display: 'block', padding: '20px 20px 20px 24px' }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '1.375rem',
            fontWeight: 400,
            color: '#1C1917',
            margin: '0 0 6px 0',
          }}
        >
          {subject.name}
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
            fontSize: '0.8125rem',
            color: '#9B8E84',
            margin: 0,
          }}
        >
          {subject.topic_count} {subject.topic_count === 1 ? 'tópico' : 'tópicos'}
        </p>
      </Link>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '0 20px 16px 24px',
        }}
      >
        <button
          onClick={e => { e.preventDefault(); onArchive(subject.id) }}
          style={ghostButtonStyle}
        >
          {subject.archived ? 'Desarquivar' : 'Arquivar'}
        </button>
        <button
          onClick={e => { e.preventDefault(); onDelete(subject.id) }}
          style={{ ...ghostButtonStyle, color: '#9B2226' }}
        >
          Excluir
        </button>
      </div>
    </div>
  )
}

export function AddSubjectCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? '#F9F5F0' : '#FFFFFF',
        border: `1.5px dashed ${hovered ? '#2EA39E' : '#D4C8BC'}`,
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        color: hovered ? '#2EA39E' : '#9B8E84',
        fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
        fontSize: '0.9375rem',
        transition: 'all 0.2s',
        width: '100%',
        minHeight: '100px',
      }}
    >
      + adicionar matéria
    </button>
  )
}

const ghostButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '4px 8px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
  fontSize: '0.8125rem',
  color: '#9B8E84',
}
