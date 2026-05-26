'use client'

import { useState, useRef, DragEvent } from 'react'
import { X, FileText } from 'lucide-react'
import type { Material } from '@/types/material'
import { formatBytes } from '@/lib/utils'

const API = process.env.NEXT_PUBLIC_API_URL

interface UploadModalProps {
  topicId: string
  accessToken: string
  onClose: () => void
  onSuccess: (material: Material) => void
}

export function UploadModal({ topicId, accessToken, onClose, onSuccess }: UploadModalProps) {
  const [tab, setTab] = useState<'pdf' | 'text'>('pdf')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [textTitle, setTextTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
  const MAX_TEXT_CHARS = 100000

  function handleFileSelect(selected: File | null) {
    setFileError(null)
    if (!selected) return
    if (selected.size > MAX_FILE_SIZE) {
      setFileError('Arquivo muito grande (máximo 50 MB)')
      setFile(null)
      return
    }
    setFile(selected)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }

  async function handleSubmit() {
    setSubmitError(null)
    setLoading(true)
    try {
      let res: Response
      if (tab === 'pdf') {
        if (!file) return
        const form = new FormData()
        form.append('file', file)
        form.append('topic_id', topicId)
        res = await fetch(`${API}/api/v1/materials/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form,
        })
      } else {
        res = await fetch(`${API}/api/v1/materials/text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ topic_id: topicId, title: textTitle, content: textContent, type: 'text' }),
        })
      }
      if (res.ok) {
        const material: Material = await res.json()
        onSuccess(material)
        onClose()
      } else {
        const data = await res.json().catch(() => null) as { detail?: string } | null
        setSubmitError(data?.detail ?? 'Falha ao enviar material.')
      }
    } finally {
      setLoading(false)
    }
  }

  const canSubmitPdf = !!file && !fileError
  const canSubmitText = textTitle.trim().length > 0 && textContent.length > 0 && textContent.length <= MAX_TEXT_CHARS

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
          width: 520, maxHeight: 'calc(var(--app-vh) - max(32px, var(--safe-top)) - max(32px, var(--safe-bottom)))', padding: 32, overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '1.0625rem', fontWeight: 500, color: 'var(--base-ink)' }}>
            Adicionar material
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--base-whisper)', padding: 4, display: 'flex' }}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--base-edge)', marginBottom: 24 }}>
          {(['pdf', 'text'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 500,
                color: tab === t ? 'var(--teal-main)' : 'var(--base-whisper)',
                padding: '8px 16px',
                borderBottom: tab === t ? '2px solid var(--teal-main)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t === 'pdf' ? 'PDF' : 'Texto'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[100, 60, 80].map((w, i) => (
              <div key={i} style={{ background: 'var(--base-edge)', borderRadius: 8, height: i === 0 ? 48 : 24, width: `${w}%` }} />
            ))}
          </div>
        ) : tab === 'pdf' ? (
          <>
            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `1.5px dashed ${dragOver ? 'var(--teal-main)' : 'var(--base-edge)'}`,
                borderRadius: 'var(--radius-m)', background: 'var(--base-canvas)',
                padding: 32, textAlign: 'center', cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              {file ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <FileText size={32} strokeWidth={1.25} color="var(--teal-main)" />
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', color: 'var(--base-ink)', fontWeight: 500 }}>
                    {file.name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--base-whisper)' }}>
                    {formatBytes(file.size)}
                  </span>
                </div>
              ) : (
                <>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', color: 'var(--base-ink-soft)', margin: '0 0 4px' }}>
                    Arraste um PDF ou clique para selecionar
                  </p>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--base-whisper)', margin: 0 }}>
                    Máximo 50 MB
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={e => handleFileSelect(e.target.files?.[0] ?? null)}
            />
            {fileError && (
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--terracotta-strong)', marginTop: 8 }}>
                {fileError}
              </p>
            )}
            {submitError && (
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--terracotta-strong)', marginTop: 8 }}>
                {submitError}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={handleSubmit}
                disabled={!canSubmitPdf}
                style={{
                  background: canSubmitPdf ? 'var(--teal-strong)' : 'var(--base-mute)',
                  color: 'white', borderRadius: 'var(--radius-m)', padding: '10px 20px',
                  fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 500,
                  border: 'none', cursor: canSubmitPdf ? 'pointer' : 'not-allowed',
                }}
              >
                Enviar
              </button>
            </div>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Título do material"
              value={textTitle}
              onChange={e => setTextTitle(e.target.value)}
              style={{
                fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', color: 'var(--base-ink)',
                border: '1px solid var(--base-edge)', borderRadius: 'var(--radius-m)',
                padding: '10px 12px', width: '100%', marginBottom: 12,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <textarea
              placeholder="Cole o texto aqui..."
              value={textContent}
              onChange={e => {
                if (e.target.value.length <= MAX_TEXT_CHARS) setTextContent(e.target.value)
              }}
              style={{
                fontFamily: 'var(--font-body)', fontSize: '0.9375rem', lineHeight: 1.75,
                color: 'var(--base-ink)', border: `1px solid ${textContent.length >= MAX_TEXT_CHARS ? 'var(--amber-main)' : 'var(--base-edge)'}`,
                borderRadius: 'var(--radius-m)', padding: 12, width: '100%',
                minHeight: 180, resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.6875rem', color: 'var(--base-whisper)', marginTop: 4, textAlign: 'right' }}>
              {textContent.length.toLocaleString('pt-BR')} / 100.000
            </p>
            {submitError && (
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--terracotta-strong)', marginTop: 8 }}>
                {submitError}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                onClick={handleSubmit}
                disabled={!canSubmitText}
                style={{
                  background: canSubmitText ? 'var(--teal-strong)' : 'var(--base-mute)',
                  color: 'white', borderRadius: 'var(--radius-m)', padding: '10px 20px',
                  fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 500,
                  border: 'none', cursor: canSubmitText ? 'pointer' : 'not-allowed',
                }}
              >
                Enviar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
