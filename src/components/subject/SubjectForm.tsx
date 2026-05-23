'use client'

import { useState } from 'react'
import { SUBJECT_COLORS, type SubjectColor } from '@/lib/medCurriculum'

interface SubjectFormProps {
  onSubmit: (name: string, color: string) => Promise<void>
  onCancel: () => void
  initialName?: string
  initialColor?: string
  submitLabel?: string
}

export function SubjectForm({
  onSubmit,
  onCancel,
  initialName = '',
  initialColor = SUBJECT_COLORS[0],
  submitLabel = 'Criar matéria',
}: SubjectFormProps) {
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState<SubjectColor>(initialColor as SubjectColor)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nome é obrigatório'); return }
    setError('')
    setLoading(true)
    try {
      await onSubmit(name.trim(), color)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar matéria')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Nome da matéria</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="ex: Cardiologia"
          autoFocus
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={labelStyle}>Cor</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {SUBJECT_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: c,
                border: color === c ? '3px solid #1C1917' : '2px solid transparent',
                cursor: 'pointer',
                padding: 0,
                outline: color === c ? '2px solid white' : 'none',
                outlineOffset: '-4px',
              }}
              aria-label={`Cor ${c}`}
            />
          ))}
        </div>
      </div>

      {error && <p style={{ color: '#9B2226', fontSize: '0.8125rem', marginBottom: '12px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={cancelButtonStyle}>Cancelar</button>
        <button type="submit" disabled={loading} style={primaryButtonStyle}>
          {loading ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: '#4A3F3A',
  marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #E8DDD4',
  borderRadius: '8px',
  fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
  fontSize: '0.9375rem',
  color: '#1C1917',
  backgroundColor: '#FFFFFF',
  outline: 'none',
  boxSizing: 'border-box',
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: '#0B6E6A',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '8px',
  fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
  fontSize: '0.9375rem',
  fontWeight: 500,
  cursor: 'pointer',
}

const cancelButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: 'transparent',
  color: '#4A3F3A',
  border: '1px solid #E8DDD4',
  borderRadius: '8px',
  fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
  fontSize: '0.9375rem',
  cursor: 'pointer',
}
