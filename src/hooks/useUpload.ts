import { useRef, useCallback } from 'react'
import type { Material } from '@/types/material'

const API = process.env.NEXT_PUBLIC_API_URL

interface UseUploadOptions {
  accessToken: string
  onUpdate: (material: Material) => void
}

export function useUpload({ accessToken, onUpdate }: UseUploadOptions) {
  // Map from materialId -> intervalId
  const intervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  const stopPolling = useCallback((materialId: string) => {
    const id = intervals.current.get(materialId)
    if (id !== undefined) {
      clearInterval(id)
      intervals.current.delete(materialId)
    }
  }, [])

  const startPolling = useCallback((materialId: string) => {
    // Avoid duplicate intervals
    if (intervals.current.has(materialId)) return

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/v1/materials/${materialId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!res.ok) return
        const material: Material = await res.json()
        onUpdate(material)
        if (material.processing_status === 'ready' || material.processing_status === 'failed') {
          stopPolling(materialId)
        }
      } catch {
        // Network error: keep polling
      }
    }, 3000)

    intervals.current.set(materialId, intervalId)
  }, [accessToken, onUpdate, stopPolling])

  return { startPolling, stopPolling }
}
