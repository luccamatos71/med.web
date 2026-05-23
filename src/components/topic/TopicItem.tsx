'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ChevronRight, Plus, Trash2 } from 'lucide-react'

export interface TopicData {
  id: string
  name: string
  position: number
  parent_topic_id: string | null
  subtopics: TopicData[]
}

interface TopicItemProps {
  topic: TopicData
  subjectId: string
  onAddSubtopic: (parentId: string) => void
  onDelete: (id: string) => void
}

export function TopicItem({ topic, subjectId, onAddSubtopic, onDelete }: TopicItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: topic.id })
  const [expanded, setExpanded] = useState(true)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 12px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E8DDD4',
          borderRadius: '8px',
          marginBottom: '4px',
        }}
      >
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: '#D4C8BC', flexShrink: 0, touchAction: 'none' }}
        >
          <GripVertical size={16} strokeWidth={1.25} />
        </span>

        {/* Expand subtopics */}
        {topic.subtopics.length > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B8E84', padding: 0 }}
          >
            <ChevronRight
              size={14}
              strokeWidth={1.5}
              style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: '0.15s' }}
            />
          </button>
        )}

        <Link
          href={`/subjects/${subjectId}/topics/${topic.id}`}
          style={{
            flex: 1,
            fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
            fontSize: '0.9375rem',
            color: '#1C1917',
            textDecoration: 'none',
          }}
        >
          {topic.name}
        </Link>

        {/* Add subtopic (only for root topics) */}
        {topic.parent_topic_id === null && (
          <button
            onClick={() => onAddSubtopic(topic.id)}
            title="Adicionar subtópico"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B8E84', padding: '2px' }}
          >
            <Plus size={14} strokeWidth={1.5} />
          </button>
        )}

        <button
          onClick={() => onDelete(topic.id)}
          title="Excluir"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D4C8BC', padding: '2px' }}
        >
          <Trash2 size={14} strokeWidth={1.25} />
        </button>
      </div>

      {/* Subtopics */}
      {expanded && topic.subtopics.length > 0 && (
        <div style={{ marginLeft: '24px' }}>
          {topic.subtopics.map(sub => (
            <div
              key={sub.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#F9F5F0',
                border: '1px solid #E8DDD4',
                borderRadius: '8px',
                marginBottom: '4px',
              }}
            >
              <Link
                href={`/subjects/${subjectId}/topics/${sub.id}`}
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
                  fontSize: '0.875rem',
                  color: '#4A3F3A',
                  textDecoration: 'none',
                }}
              >
                {sub.name}
              </Link>
              <button
                onClick={() => onDelete(sub.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D4C8BC', padding: '2px' }}
              >
                <Trash2 size={12} strokeWidth={1.25} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
