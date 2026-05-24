'use client'

import { useRouter } from 'next/navigation'
import { FileText, AlignLeft, StickyNote } from 'lucide-react'
import type { Material } from '@/types/material'
import { formatBytes, formatDate } from '@/lib/utils'

interface MaterialCardProps {
  material: Material
  topicId: string
  subjectId: string
  accessToken?: string
  onRetry: (materialId: string) => void
}

const iconMap = {
  pdf: FileText,
  text: AlignLeft,
  note: StickyNote,
}

export function MaterialCard({ material, topicId, subjectId, onRetry }: MaterialCardProps) {
  const router = useRouter()
  const isReady = material.processing_status === 'ready'
  const isPending = material.processing_status === 'pending' || material.processing_status === 'processing'
  const isFailed = material.processing_status === 'failed'

  const Icon = iconMap[material.type]

  function handleCardClick() {
    if (!isReady) return
    router.push(`/subjects/${subjectId}/topics/${topicId}/materials/${material.id}`)
  }

  function handleRetry(e: React.MouseEvent) {
    e.stopPropagation()
    onRetry(material.id)
  }

  return (
    <div
      onClick={handleCardClick}
      style={{
        background: 'var(--base-surface)',
        border: '1px solid var(--base-edge)',
        borderRadius: 'var(--radius-xl)',
        padding: 16,
        boxShadow: 'var(--shadow-whisper)',
        cursor: isReady ? 'pointer' : 'default',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => {
        if (!isReady) return
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--teal-main)'
        el.style.boxShadow = 'var(--shadow-lift)'
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        if (!isReady) return
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--base-edge)'
        el.style.boxShadow = 'var(--shadow-whisper)'
        el.style.transform = 'translateY(0)'
      }}
    >
      {/* Top row: icon + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon size={16} strokeWidth={1.25} color="var(--teal-main)" />
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontSize: '0.9375rem',
          fontWeight: 500,
          color: 'var(--base-ink)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {material.title}
        </span>
      </div>

      {/* Status pill (non-ready) */}
      {isPending && (
        <span style={{
          display: 'inline-block',
          background: 'var(--amber-wash)',
          color: 'var(--amber-strong)',
          fontSize: '0.6875rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          padding: '2px 8px',
          borderRadius: 9999,
          letterSpacing: '0.04em',
        }}>
          Processando...
        </span>
      )}

      {isFailed && (
        <>
          <span style={{
            display: 'inline-block',
            background: 'var(--terracotta-soft)',
            color: 'var(--terracotta-strong)',
            fontSize: '0.6875rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: 9999,
            letterSpacing: '0.04em',
          }}>
            Falha
          </span>
          {material.processing_error && (
            <p style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.75rem',
              color: 'var(--base-whisper)',
              margin: '4px 0 0',
            }}>
              {material.processing_error}
            </p>
          )}
          <div style={{ marginTop: 8 }}>
            <button
              onClick={handleRetry}
              style={{
                background: 'none',
                border: '1px solid var(--base-edge)',
                color: 'var(--base-whisper)',
                fontSize: '0.75rem',
                padding: '4px 12px',
                borderRadius: 'var(--radius-m)',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              Tentar novamente
            </button>
          </div>
        </>
      )}

      {/* Bottom metadata (ready) */}
      {isReady && (
        <div style={{
          display: 'flex',
          gap: 8,
          fontFamily: 'var(--font-ui)',
          fontSize: '0.6875rem',
          color: 'var(--base-whisper)',
          marginTop: 4,
        }}>
          {material.type === 'pdf' && material.file_size_bytes != null && (
            <span>{formatBytes(material.file_size_bytes)}</span>
          )}
          <span>{formatDate(material.created_at)}</span>
        </div>
      )}
    </div>
  )
}
