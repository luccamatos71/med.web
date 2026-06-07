'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchAnnotation, saveAnnotation, type AnnotationSurface } from '@/lib/annotationsApi'
import type { Stroke } from '@/lib/strokeRenderer'

export type AnnotationSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface UseAnnotationPersistenceOptions {
  materialId: string
  surface: AnnotationSurface
  anchor: string
  accessToken: string
  /** Skips fetch/save while false — lets the composing surface lazy-load only the visible anchor (AC6). */
  enabled?: boolean
}

export interface UseAnnotationPersistenceResult {
  strokes: Stroke[]
  onChange: (strokes: Stroke[]) => void
  loading: boolean
  status: AnnotationSaveStatus
}

const SAVE_DEBOUNCE_MS = 600

/**
 * Fetches the strokes for one surface/anchor and auto-saves changes (debounced),
 * mirroring the read-position pattern in `PdfMaterialViewer` (AC3/AC4). The
 * returned `strokes`/`onChange` plug straight into a controlled `AnnotationCanvas`.
 */
export function useAnnotationPersistence({
  materialId,
  surface,
  anchor,
  accessToken,
  enabled = true,
}: UseAnnotationPersistenceOptions): UseAnnotationPersistenceResult {
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<AnnotationSaveStatus>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Skips the save effect that would otherwise fire right after a fresh fetch
  // populates `strokes` — that's a load, not a user edit, and must not re-PUT.
  const skipNextSaveRef = useRef(true)

  useEffect(() => {
    if (!enabled || !accessToken) return
    let cancelled = false
    skipNextSaveRef.current = true
    setLoading(true)
    setStatus('idle')

    fetchAnnotation({ materialId, surface, anchor, accessToken })
      .then((loaded) => {
        if (!cancelled) setStrokes(loaded)
      })
      .catch(() => {
        if (!cancelled) setStrokes([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, accessToken, materialId, surface, anchor])

  useEffect(() => {
    if (!enabled || !accessToken || loading) return
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    setStatus('saving')
    saveTimerRef.current = setTimeout(() => {
      saveAnnotation({ materialId, surface, anchor, accessToken }, strokes)
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'))
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [strokes, enabled, accessToken, loading, materialId, surface, anchor])

  const onChange = useCallback((next: Stroke[]) => {
    setStrokes(next)
  }, [])

  return { strokes, onChange, loading, status }
}
