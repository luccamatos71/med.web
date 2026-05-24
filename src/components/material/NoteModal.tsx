'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { Material } from '@/types/material'

const API = process.env.NEXT_PUBLIC_API_URL

interface NoteModalProps {
  topicId: string
  accessToken: string
  onClose: () => void
  onSuccess: (material: Material) => void
}

export function NoteModal({ topicId, accessToken, onClose, onSuccess }: NoteModalProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const MAX_CHARS = 5000
  const canSave = content.trim().length > 0 && content.length <= MAX_CHARS

  async function handleSave() {
    if (!canSave) return
    setSubmitError(null)
    setLoading(true)
    try {
      const title = 'Nota — ' + content.slice(0, 30).replace(/\n/g, ' ')
      const res = await fetch(`${API}/api/v1/materials/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ topic_id: topicId, title, content, type: 'note' }),
      })
      if (res.ok) {
        const material: Material = await res.json()
        onSuccess(material)
        onClose()
      } else {
        const data = await res.json().catch(() => null) as { detail?: string } | null
        setSubmitError(data?.detail ?? 'Falha ao salvar nota.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(28,25,23,0.3)',
        zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--base-surface)', borderRadius: 'var(--radius-xl)',
          width: 480, padding: 32, position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '1.375rem',
            fontWeight: 400, color: 'var(--base-ink)',
          }}>
            Nova nota
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--base-whisper)', padding: 4, display: 'flex' }}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[100, 60, 80].map((w, i) => (
              <div key={i} style={{ background: 'var(--base-edge)', borderRadius: 8, height: i === 0 ? 48 : 24, width: `${w}%` }} />
            ))}
          </div>
        ) : (
          <>
            <textarea
              placeholder="Anotação rápida..."
              value={content}
              onChange={e => {
                if (e.target.value.length <= MAX_CHARS) setContent(e.target.value)
              }}
              style={{
                fontFamily: 'var(--font-body)', fontSize: '0.9375rem', lineHeight: 1.75,
                color: 'var(--base-ink)',
                border: `1px solid ${content.length >= MAX_CHARS ? 'var(--amber-main)' : 'var(--base-edge)'}`,
                borderRadius: 'var(--radius-m)', padding: 12, width: '100%',
                minHeight: 200, resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <p style={{
              fontFamily: 'var(--font-ui)', fontSize: '0.6875rem',
              color: 'var(--base-whisper)', marginTop: 4, textAlign: 'right',
            }}>
              {content.length.toLocaleString('pt-BR')} / 5.000
            </p>
            {submitError && (
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--terracotta-strong)', marginTop: 8 }}>
                {submitError}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-ui)', fontSize: '0.8125rem',
                  color: 'var(--base-whisper)', padding: '10px 16px',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                style={{
                  background: canSave ? 'var(--teal-strong)' : 'var(--base-mute)',
                  color: 'white', borderRadius: 'var(--radius-m)', padding: '10px 20px',
                  fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 500,
                  border: 'none', cursor: canSave ? 'pointer' : 'not-allowed',
                }}
              >
                Salvar nota
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
