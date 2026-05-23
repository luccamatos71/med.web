'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { TopicItem, type TopicData } from './TopicItem'
import { Plus } from 'lucide-react'

interface TopicListProps {
  topics: TopicData[]
  subjectId: string
  onReorder: (items: { id: string; position: number }[]) => Promise<void>
  onAddTopic: (name: string, parentId?: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function TopicList({ topics, subjectId, onReorder, onAddTopic, onDelete }: TopicListProps) {
  const [items, setItems] = useState(topics)
  const [newName, setNewName] = useState('')
  const [addingSubtopic, setAddingSubtopic] = useState<string | null>(null)
  const [subtopicName, setSubtopicName] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex(t => t.id === active.id)
    const newIndex = items.findIndex(t => t.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)
    onReorder(reordered.map((t, i) => ({ id: t.id, position: i })))
  }

  async function handleAddRoot() {
    if (!newName.trim()) return
    await onAddTopic(newName.trim())
    setNewName('')
  }

  async function handleAddSubtopic(parentId: string) {
    if (!subtopicName.trim()) return
    await onAddTopic(subtopicName.trim(), parentId)
    setSubtopicName('')
    setAddingSubtopic(null)
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {items.map(topic => (
            <div key={topic.id}>
              <TopicItem
                topic={topic}
                subjectId={subjectId}
                onAddSubtopic={id => setAddingSubtopic(id)}
                onDelete={async (id) => {
                  await onDelete(id)
                  setItems(prev => prev.filter(t => t.id !== id))
                }}
              />
              {addingSubtopic === topic.id && (
                <div style={{ marginLeft: '24px', marginBottom: '8px', display: 'flex', gap: '8px' }}>
                  <input
                    value={subtopicName}
                    onChange={e => setSubtopicName(e.target.value)}
                    placeholder="Nome do subtópico"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleAddSubtopic(topic.id)}
                    style={inputStyle}
                  />
                  <button onClick={() => handleAddSubtopic(topic.id)} style={addButtonStyle}>Adicionar</button>
                  <button onClick={() => setAddingSubtopic(null)} style={cancelButtonStyle}>✕</button>
                </div>
              )}
            </div>
          ))}
        </SortableContext>
      </DndContext>

      {items.length === 0 && (
        <p style={{ fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.9375rem', color: '#9B8E84', marginBottom: '16px' }}>
          Nenhum tópico ainda. Adicione o primeiro abaixo.
        </p>
      )}

      {/* Add root topic */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Novo tópico..."
          onKeyDown={e => e.key === 'Enter' && handleAddRoot()}
          style={inputStyle}
        />
        <button onClick={handleAddRoot} style={addButtonStyle}>
          <Plus size={16} strokeWidth={1.5} style={{ display: 'inline', verticalAlign: 'middle' }} /> Adicionar
        </button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  flex: 1, padding: '8px 12px', border: '1px solid #E8DDD4', borderRadius: '8px',
  fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.9375rem', color: '#1C1917',
  backgroundColor: '#FFFFFF', outline: 'none',
}
const addButtonStyle: React.CSSProperties = {
  padding: '8px 14px', backgroundColor: '#0B6E6A', color: '#FFFFFF', border: 'none',
  borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.875rem',
}
const cancelButtonStyle: React.CSSProperties = {
  padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#9B8E84', fontSize: '1rem',
}
