'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { Material } from '@/types/material'

const API = process.env.NEXT_PUBLIC_API_URL
const PdfMaterialViewer = dynamic(
  () => import('./PdfMaterialViewer').then(mod => mod.PdfMaterialViewer),
  { ssr: false },
)
const MAX_POLL_FAILURES = 5

interface MaterialBodyProps {
  material: Material
  accessToken: string
  initialPosition: { scroll_y?: number; page?: number } | null
  /** Ref pointing to the scrollable panel container in the page */
  panelRef: React.RefObject<HTMLDivElement | null>
}

export function MaterialBody({ material: initialMaterial, accessToken, initialPosition, panelRef }: MaterialBodyProps) {
  const [polledMaterial, setPolledMaterial] = useState<Material | null>(null)
  const [pdfState, setPdfState] = useState<{ materialId: string; url: string | null; error: string | null }>({
    materialId: '',
    url: null,
    error: null,
  })
  const [pollError, setPollError] = useState<{ materialId: string; message: string } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const material = polledMaterial?.id === initialMaterial.id ? polledMaterial : initialMaterial
  const activePdfUrl = pdfState.materialId === material.id ? pdfState.url : null
  const activePdfUrlError = pdfState.materialId === material.id ? pdfState.error : null
  const activePollError = pollError?.materialId === material.id ? pollError.message : null

  // Poll when pending/processing
  useEffect(() => {
    if (material.processing_status !== 'pending' && material.processing_status !== 'processing') return

    let failures = 0
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/v1/materials/${material.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!res.ok) {
          failures += 1
          if (failures >= MAX_POLL_FAILURES) {
            setPollError({ materialId: material.id, message: 'Não foi possível atualizar o status do material.' })
            clearInterval(interval)
          }
          return
        }
        if (res.ok) {
          failures = 0
          const updated: Material = await res.json()
          setPolledMaterial(updated)
          if (updated.processing_status !== 'pending' && updated.processing_status !== 'processing') {
            clearInterval(interval)
          }
        }
      } catch {
        failures += 1
        if (failures >= MAX_POLL_FAILURES) {
          setPollError({ materialId: material.id, message: 'Não foi possível atualizar o status do material.' })
          clearInterval(interval)
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [material.id, material.processing_status, accessToken])

  // Fetch presigned URL for PDFs when ready
  useEffect(() => {
    if (material.type !== 'pdf' || material.processing_status !== 'ready') return
    fetch(`${API}/api/v1/materials/${material.id}/presigned-url`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => { if (!r.ok) throw new Error('Failed to get URL'); return r.json() })
      .then(data => {
        if (data.url) setPdfState({ materialId: material.id, url: data.url, error: null })
      })
      .catch(() => setPdfState({ materialId: material.id, url: null, error: 'Não foi possível carregar o PDF.' }))
  }, [material.id, material.type, material.processing_status, accessToken])

  // Restore scroll position after mount (only once)
  useEffect(() => {
    if (!initialPosition?.scroll_y) return
    requestAnimationFrame(() => {
      if (panelRef.current) {
        panelRef.current.scrollTop = initialPosition.scroll_y!
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll save: attach scroll listener to panel
  useEffect(() => {
    const panel = panelRef.current
    if (material.type === 'pdf') return
    if (!panel) return

    function handleScroll() {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        if (!panel) return
        fetch(`${API}/api/v1/materials/${material.id}/read-position`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ position_data: { scroll_y: panel.scrollTop } }),
        }).catch(() => {/* ignore */})
      }, 1000)
    }

    panel.addEventListener('scroll', handleScroll)
    return () => {
      panel.removeEventListener('scroll', handleScroll)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // We intentionally use stable references; material.id and accessToken are the only deps needed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelRef, material.id, accessToken])

  // Pending/processing state
  if (material.processing_status === 'pending' || material.processing_status === 'processing') {
    return (
      <div>
        <Skeleton style={{ height: 32, width: '60%', marginBottom: 16 }} />
        <Skeleton style={{ height: 400, borderRadius: 8 }} />
        <p style={{
          fontFamily: 'var(--font-ui)',
          fontSize: '0.8125rem',
          color: 'var(--base-whisper)',
          marginTop: 16,
        }}>
          Processando material...
        </p>
        {activePollError && (
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--terracotta-strong)' }}>
            {activePollError}
          </p>
        )}
      </div>
    )
  }

  // Failed state
  if (material.processing_status === 'failed') {
    return (
      <p style={{ color: 'var(--terracotta-strong)', fontFamily: 'var(--font-ui)' }}>
        Falha ao processar: {material.processing_error}
      </p>
    )
  }

  // PDF viewer
  if (material.type === 'pdf') {
    return (
      <div>
        {material.processing_error && (
          <p style={{
            color: 'var(--amber-strong)',
            backgroundColor: 'var(--amber-wash)',
            border: '1px solid var(--base-edge)',
            borderRadius: 6,
            fontFamily: 'var(--font-ui)',
            fontSize: '0.8125rem',
            padding: '10px 12px',
            margin: '0 0 12px',
          }}>
            {material.processing_error}
          </p>
        )}
        {activePdfUrlError ? (
          <p style={{ color: 'var(--terracotta-strong)', fontFamily: 'var(--font-ui)' }}>
            {activePdfUrlError}
          </p>
        ) : activePdfUrl ? (
          <PdfMaterialViewer
            materialId={material.id}
            title={material.title}
            pdfUrl={activePdfUrl}
            accessToken={accessToken}
            initialPage={initialPosition?.page}
          />
        ) : (
          <Skeleton style={{ height: '80vh' }} />
        )}
      </div>
    )
  }

  // Text / note viewer
  return (
    <div>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.75rem',
        fontWeight: 400,
        color: 'var(--base-ink)',
        marginBottom: 24,
      }}>
        {material.title}
      </h1>
      {renderTextContent(material.content ?? '')}
    </div>
  )
}

function renderTextContent(content: string) {
  return (
    <div style={{
      fontFamily: 'var(--font-body)',
      fontSize: '0.9375rem',
      lineHeight: 1.8,
      color: 'var(--base-ink)',
    }}>
      {content.split('\n').map((line, index) => {
        if (line.startsWith('### ')) {
          return <h3 key={index} style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}>{line.slice(4)}</h3>
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}>{line.slice(3)}</h2>
        }
        if (line.startsWith('# ')) {
          return <h1 key={index} style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}>{line.slice(2)}</h1>
        }
        return <p key={index} style={{ margin: line ? '0 0 12px' : '0 0 18px', whiteSpace: 'pre-wrap' }}>{line}</p>
      })}
    </div>
  )
}
