'use client'

import { useEffect, useRef, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { Material } from '@/types/material'

const API = process.env.NEXT_PUBLIC_API_URL

interface MaterialBodyProps {
  material: Material
  accessToken: string
  initialPosition: { scroll_y?: number; page?: number } | null
  /** Ref pointing to the scrollable panel container in the page */
  panelRef: React.RefObject<HTMLDivElement | null>
}

export function MaterialBody({ material: initialMaterial, accessToken, initialPosition, panelRef }: MaterialBodyProps) {
  const [material, setMaterial] = useState<Material>(initialMaterial)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep material in sync when parent passes new one
  useEffect(() => {
    setMaterial(initialMaterial)
  }, [initialMaterial])

  // Poll when pending/processing
  useEffect(() => {
    if (material.processing_status !== 'pending' && material.processing_status !== 'processing') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/v1/materials/${material.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (res.ok) {
          const updated: Material = await res.json()
          setMaterial(updated)
          if (updated.processing_status !== 'pending' && updated.processing_status !== 'processing') {
            clearInterval(interval)
          }
        }
      } catch {
        // ignore
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
      .then(data => { if (data.url) setPdfUrl(data.url) })
      .catch(() => { /* silently fail — iframe won't render */ })
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
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.75rem',
          fontWeight: 400,
          color: 'var(--base-ink)',
          marginBottom: 16,
        }}>
          {material.title}
        </h1>
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            style={{ width: '100%', height: '80vh', border: 'none', borderRadius: 8 }}
            title={material.title}
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
      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: '0.9375rem',
        lineHeight: 1.8,
        color: 'var(--base-ink)',
        whiteSpace: 'pre-wrap',
      }}>
        {material.content}
      </div>
    </div>
  )
}
