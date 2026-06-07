'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { usePointerCapture, type NormalizedPoint } from '@/hooks/usePointerCapture'
import { strokeOpacity, strokeToPath, type AnnotationTool, type Stroke, type StrokePoint } from '@/lib/strokeRenderer'

export interface AnnotationCanvasProps {
  /** Committed strokes — owned by the parent component (controlled, AC7). This component never persists data itself. */
  value: Stroke[]
  onChange: (strokes: Stroke[]) => void
  tool: AnnotationTool
  color: string
  width: number
  /** When true, all pointer input is ignored (e.g. annotation mode is off). */
  disabled?: boolean
  className?: string
}

function toStrokePoint(point: NormalizedPoint): StrokePoint {
  return { x: point.x, y: point.y, pressure: point.pressure }
}

/** Object-eraser hit test: a stroke is erased when the eraser passes within `radiusPx` of any of its points. */
function strokeIntersects(stroke: Stroke, point: StrokePoint, containerWidth: number, containerHeight: number, radiusPx: number): boolean {
  return stroke.points.some((p) => {
    const dx = (p.x - point.x) * containerWidth
    const dy = (p.y - point.y) * containerHeight
    return Math.hypot(dx, dy) <= radiusPx
  })
}

/**
 * Isolated, controlled drawing surface (AC7): captures Apple Pencil / pointer input,
 * renders pressure-sensitive strokes with `perfect-freehand`, and applies "pen always
 * wins" palm rejection — all in normalized (0–1) coordinates so it can be dropped onto
 * any surface (PDF page, summary) regardless of zoom level. Persistence and HTTP calls
 * are the composing parent's responsibility (story 3.3).
 */
export function AnnotationCanvas({ value, onChange, tool, color, width, disabled = false, className }: AnnotationCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [draft, setDraft] = useState<StrokePoint[] | null>(null)

  // Mirrors `value` so pointer handlers always read the latest committed strokes,
  // even across rapid pointermove events fired between React re-renders.
  const valueRef = useRef(value)
  valueRef.current = value

  // Snapshot tool/color/width at stroke start so changing tools mid-stroke can't
  // retroactively alter an in-progress stroke.
  const strokeStyleRef = useRef({ tool, color, width })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect
      setSize({ width: w, height: h })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const eraseAt = useCallback(
    (point: NormalizedPoint) => {
      const { width: containerWidth, height: containerHeight } = size
      if (containerWidth === 0 || containerHeight === 0) return
      const current = valueRef.current
      const remaining = current.filter((stroke) => !strokeIntersects(stroke, toStrokePoint(point), containerWidth, containerHeight, width))
      if (remaining.length !== current.length) {
        onChange(remaining)
      }
    },
    [size, width, onChange]
  )

  const handleStrokeStart = useCallback(
    (point: NormalizedPoint) => {
      if (tool === 'eraser') {
        eraseAt(point)
        return
      }
      strokeStyleRef.current = { tool, color, width }
      setDraft([toStrokePoint(point)])
    },
    [tool, color, width, eraseAt]
  )

  const handleStrokePoint = useCallback(
    (point: NormalizedPoint) => {
      if (tool === 'eraser') {
        eraseAt(point)
        return
      }
      setDraft((current) => (current ? [...current, toStrokePoint(point)] : current))
    },
    [tool, eraseAt]
  )

  const handleStrokeEnd = useCallback(() => {
    if (tool === 'eraser') return
    setDraft((current) => {
      if (current && current.length > 0) {
        const stroke: Stroke = { ...strokeStyleRef.current, points: current }
        onChange([...valueRef.current, stroke])
      }
      return null
    })
  }, [tool, onChange])

  usePointerCapture({
    containerRef,
    onStrokeStart: handleStrokeStart,
    onStrokePoint: handleStrokePoint,
    onStrokeEnd: handleStrokeEnd,
    disabled,
  })

  const draftStroke: Stroke | null = draft ? { ...strokeStyleRef.current, points: draft } : null
  const canRender = size.width > 0 && size.height > 0

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', touchAction: 'none' }}
    >
      {canRender && (
        <svg
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          aria-hidden="true"
        >
          {value.map((stroke, index) => (
            <path key={index} d={strokeToPath(stroke, size.width, size.height)} fill={stroke.color} opacity={strokeOpacity(stroke.tool)} />
          ))}
          {draftStroke && (
            <path d={strokeToPath(draftStroke, size.width, size.height)} fill={draftStroke.color} opacity={strokeOpacity(draftStroke.tool)} />
          )}
        </svg>
      )}
    </div>
  )
}
