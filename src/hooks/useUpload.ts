import { useRef, useCallback, useEffect } from 'react'
import type { Material } from '@/types/material'

const API = process.env.NEXT_PUBLIC_API_URL
const MAX_FAILURES = 5

interface UseUploadOptions {
  accessToken: string
  onUpdate: (material: Material) => void
}

export function useUpload({ accessToken, onUpdate }: UseUploadOptions) {
  // Map from materialId -> intervalId
  const intervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())
  const failures = useRef<Map<string, number>>(new Map())

  const stopPolling = useCallback((materialId: string) => {
    const id = intervals.current.get(materialId)
    if (id !== undefined) {
      clearInterval(id)
      intervals.current.delete(materialId)
      failures.current.delete(materialId)
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
        if (!res.ok) {
          const count = (failures.current.get(materialId) ?? 0) + 1
          failures.current.set(materialId, count)
          if (count >= MAX_FAILURES) stopPolling(materialId)
          return
        }
        failures.current.delete(materialId)
        const material: Material = await res.json()
        onUpdate(material)
        if (material.processing_status === 'ready' || material.processing_status === 'failed') {
          stopPolling(materialId)
        }
      } catch {
        const count = (failures.current.get(materialId) ?? 0) + 1
        failures.current.set(materialId, count)
        if (count >= MAX_FAILURES) stopPolling(materialId)
      }
    }, 3000)

    intervals.current.set(materialId, intervalId)
  }, [accessToken, onUpdate, stopPolling])

  useEffect(() => {
    const activeIntervals = intervals.current
    const activeFailures = failures.current

    return () => {
      activeIntervals.forEach((intervalId) => clearInterval(intervalId))
      activeIntervals.clear()
      activeFailures.clear()
    }
  }, [])

  return { startPolling, stopPolling }
}
