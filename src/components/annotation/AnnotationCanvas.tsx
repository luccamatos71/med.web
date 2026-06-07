'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

import { usePointerCapture, type NormalizedPoint } from '@/hooks/usePointerCapture'
import { recognizeShape } from '@/lib/shapeRecognition'
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
  /** 'object' (default) erases whole strokes on contact; 'pixel' trims strokes at the eraser path — Notes' precision eraser. */
  eraserMode?: 'object' | 'pixel'
  /** When true, near-straight or closed strokes snap into clean lines/circles/rectangles on release — Notes' "shape assist". */
  shapeAssist?: boolean
}

interface Point {
  x: number
  y: number
}

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se'

interface Selection {
  indices: number[]
  bounds: Bounds
}

interface SelectionDrag {
  mode: 'move' | 'resize'
  corner?: ResizeCorner
  start: Point
  bounds: Bounds
  strokes: Array<{ index: number; points: StrokePoint[] }>
}

const LASSO_RECOLOR_SWATCHES: ReadonlyArray<string> = [
  'var(--base-ink)',
  'var(--teal-strong)',
  'var(--terracotta-strong)',
  'var(--sage-main)',
]

const RESIZE_CORNERS: ReadonlyArray<{ corner: ResizeCorner; style: CSSProperties }> = [
  { corner: 'nw', style: { top: -6, left: -6, cursor: 'nwse-resize' } },
  { corner: 'ne', style: { top: -6, right: -6, cursor: 'nesw-resize' } },
  { corner: 'sw', style: { bottom: -6, left: -6, cursor: 'nesw-resize' } },
  { corner: 'se', style: { bottom: -6, right: -6, cursor: 'nwse-resize' } },
]

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
 * Pixel/area eraser: walks a stroke's points and cuts out every sample within
 * `radiusPx` of the eraser, splitting the remainder into independent runs —
 * mirrors Notes' precision eraser, which trims strokes instead of deleting them whole.
 */
function erasePixels(stroke: Stroke, point: StrokePoint, containerWidth: number, containerHeight: number, radiusPx: number): Stroke[] {
  const runs: StrokePoint[][] = []
  let current: StrokePoint[] = []
  for (const p of stroke.points) {
    const dx = (p.x - point.x) * containerWidth
    const dy = (p.y - point.y) * containerHeight
    if (Math.hypot(dx, dy) <= radiusPx) {
      if (current.length > 1) runs.push(current)
      current = []
    } else {
      current.push(p)
    }
  }
  if (current.length > 1) runs.push(current)
  return runs.map((points) => ({ ...stroke, points }))
}

function boundsOf(points: ReadonlyArray<Point>): Bounds {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
}

/** Ray-casting point-in-polygon test — used to find which strokes a closed lasso loop encloses. */
function pointInPolygon(point: Point, polygon: ReadonlyArray<Point>): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    const crosses = a.y > point.y !== b.y > point.y
    if (crosses && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

function strokeCentroid(stroke: Stroke): Point {
  const sum = stroke.points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / stroke.points.length, y: sum.y / stroke.points.length }
}

interface SelectionOverlayProps {
  bounds: Bounds
  onMoveStart: (event: ReactPointerEvent) => void
  onResizeStart: (event: ReactPointerEvent, corner: ResizeCorner) => void
  onDragMove: (event: ReactPointerEvent) => void
  onDragEnd: (event: ReactPointerEvent) => void
  onRecolor: (color: string) => void
}

/**
 * Floating selection chrome for lasso groups (P2.7): a draggable bounding box
 * with corner resize handles plus a recolor palette. Marked `data-annotation-ui`
 * so the drawing surface's native pointer listeners ignore it entirely (see
 * `ignoreTarget` on `usePointerCapture` — React's synthetic handlers here run
 * their own independent drag tracking via `setPointerCapture`).
 */
function SelectionOverlay({ bounds, onMoveStart, onResizeStart, onDragMove, onDragEnd, onRecolor }: SelectionOverlayProps) {
  const left = `${bounds.minX * 100}%`
  const top = `${bounds.minY * 100}%`
  const boxWidth = `${Math.max(bounds.maxX - bounds.minX, 0) * 100}%`
  const boxHeight = `${Math.max(bounds.maxY - bounds.minY, 0) * 100}%`

  return (
    <div data-annotation-ui="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div
        role="group"
        aria-label="Seleção de traços"
        onPointerDown={onMoveStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        style={{
          position: 'absolute',
          left,
          top,
          width: boxWidth,
          height: boxHeight,
          border: '1.5px dashed var(--teal-strong)',
          borderRadius: 'var(--radius-l)',
          backgroundColor: 'var(--teal-wash)',
          cursor: 'move',
          pointerEvents: 'auto',
          touchAction: 'none',
        }}
      >
        {RESIZE_CORNERS.map(({ corner, style }) => (
          <div
            key={corner}
            role="button"
            aria-label={`Redimensionar seleção (${corner})`}
            onPointerDown={(event) => onResizeStart(event, corner)}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            style={{
              position: 'absolute',
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: '1.5px solid var(--teal-strong)',
              backgroundColor: 'var(--base-surface)',
              touchAction: 'none',
              ...style,
            }}
          />
        ))}
      </div>

      <div
        role="group"
        aria-label="Recolorir seleção"
        style={{
          position: 'absolute',
          left,
          top: `calc(${top} - 36px)`,
          display: 'flex',
          gap: 6,
          padding: 6,
          borderRadius: 'var(--radius-round)',
          backgroundColor: 'var(--base-surface)',
          border: '1px solid var(--base-edge)',
          pointerEvents: 'auto',
        }}
      >
        {LASSO_RECOLOR_SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            aria-label="Recolorir seleção"
            onClick={() => onRecolor(swatch)}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '1px solid var(--base-edge)',
              backgroundColor: swatch,
              padding: 0,
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Isolated, controlled drawing surface (AC7): captures Apple Pencil / pointer input,
 * renders pressure-sensitive strokes with `perfect-freehand`, and applies "pen always
 * wins" palm rejection — all in normalized (0–1) coordinates so it can be dropped onto
 * any surface (PDF page, summary) regardless of zoom level. Persistence and HTTP calls
 * are the composing parent's responsibility (story 3.3).
 *
 * Also brings the surface to iPad-Notes parity: multi-touch pinch/pan passthrough
 * (P0.1), rAF-throttled rendering (P0.2), ruler-guided straight lines (P1.6), a pixel
 * eraser mode (P1.5), lasso selection with move/resize/recolor (P2.7), and shape-assist
 * snapping (P2.8).
 */
export function AnnotationCanvas({
  value,
  onChange,
  tool,
  color,
  width,
  disabled = false,
  className,
  eraserMode = 'object',
  shapeAssist = false,
}: AnnotationCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [draft, setDraft] = useState<StrokePoint[] | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)

  // Mirrors `value` so pointer handlers always read the latest committed strokes,
  // even across rapid pointermove events fired between React re-renders.
  const valueRef = useRef(value)
  valueRef.current = value

  // Snapshot tool/color/width at stroke start so changing tools mid-stroke can't
  // retroactively alter an in-progress stroke.
  const strokeStyleRef = useRef({ tool, color, width })

  // Full draft point list lives in a ref so pointermove can append every sample
  // (no dropped input) while the React state — and therefore the SVG re-render —
  // is flushed at most once per animation frame (P0.2 perf parity with Notes).
  const draftPointsRef = useRef<StrokePoint[] | null>(null)
  const draftFrameRef = useRef<number | null>(null)
  const rulerStartRef = useRef<StrokePoint | null>(null)
  const lassoPathRef = useRef<StrokePoint[] | null>(null)
  const selectionDragRef = useRef<SelectionDrag | null>(null)

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

  useEffect(() => {
    return () => {
      if (draftFrameRef.current !== null) cancelAnimationFrame(draftFrameRef.current)
    }
  }, [])

  // Selection is ephemeral UI state — leaving the lasso tool, or the underlying
  // strokes shifting beneath it (e.g. an undo), invalidates it.
  useEffect(() => {
    if (tool !== 'lasso') setSelection(null)
  }, [tool])

  useEffect(() => {
    setSelection((current) => {
      if (!current) return current
      return current.indices.every((index) => index < value.length) ? current : null
    })
  }, [value])

  const flushDraftFrame = useCallback(() => {
    draftFrameRef.current = null
    setDraft(draftPointsRef.current ? [...draftPointsRef.current] : null)
  }, [])

  const scheduleDraftFrame = useCallback(() => {
    if (draftFrameRef.current !== null) return
    draftFrameRef.current = requestAnimationFrame(flushDraftFrame)
  }, [flushDraftFrame])

  const cancelDraftFrame = useCallback(() => {
    if (draftFrameRef.current !== null) {
      cancelAnimationFrame(draftFrameRef.current)
      draftFrameRef.current = null
    }
  }, [])

  const eraseAt = useCallback(
    (point: NormalizedPoint) => {
      const { width: containerWidth, height: containerHeight } = size
      if (containerWidth === 0 || containerHeight === 0) return
      const eraserPoint = toStrokePoint(point)
      const current = valueRef.current

      if (eraserMode === 'pixel') {
        let changed = false
        const next: Stroke[] = []
        for (const stroke of current) {
          if (!strokeIntersects(stroke, eraserPoint, containerWidth, containerHeight, width)) {
            next.push(stroke)
            continue
          }
          changed = true
          next.push(...erasePixels(stroke, eraserPoint, containerWidth, containerHeight, width))
        }
        if (changed) onChange(next)
        return
      }

      const remaining = current.filter((stroke) => !strokeIntersects(stroke, eraserPoint, containerWidth, containerHeight, width))
      if (remaining.length !== current.length) onChange(remaining)
    },
    [size, width, onChange, eraserMode]
  )

  const selectWithLasso = useCallback((loop: StrokePoint[]) => {
    if (loop.length < 3) {
      setSelection(null)
      return
    }
    const indices: number[] = []
    valueRef.current.forEach((stroke, index) => {
      if (pointInPolygon(strokeCentroid(stroke), loop)) indices.push(index)
    })
    if (indices.length === 0) {
      setSelection(null)
      return
    }
    const points = indices.flatMap((index) => valueRef.current[index].points)
    setSelection({ indices, bounds: boundsOf(points) })
  }, [])

  const handleStrokeStart = useCallback(
    (point: NormalizedPoint) => {
      if (tool === 'eraser') {
        eraseAt(point)
        return
      }
      if (tool === 'lasso') {
        setSelection(null)
        const start = toStrokePoint(point)
        lassoPathRef.current = [start]
        setDraft([start])
        return
      }

      strokeStyleRef.current = { tool, color, width }
      const start = toStrokePoint(point)
      if (tool === 'ruler') {
        rulerStartRef.current = start
        draftPointsRef.current = [start, start]
        setDraft(draftPointsRef.current)
        return
      }
      draftPointsRef.current = [start]
      setDraft(draftPointsRef.current)
    },
    [tool, color, width, eraseAt]
  )

  const handleStrokePoint = useCallback(
    (point: NormalizedPoint) => {
      if (tool === 'eraser') {
        eraseAt(point)
        return
      }
      const sample = toStrokePoint(point)

      if (tool === 'lasso') {
        if (!lassoPathRef.current) return
        lassoPathRef.current = [...lassoPathRef.current, sample]
        setDraft(lassoPathRef.current)
        return
      }

      if (tool === 'ruler') {
        const start = rulerStartRef.current
        if (!start) return
        draftPointsRef.current = [start, sample]
        scheduleDraftFrame()
        return
      }

      if (!draftPointsRef.current) return
      draftPointsRef.current = [...draftPointsRef.current, sample]
      scheduleDraftFrame()
    },
    [tool, eraseAt, scheduleDraftFrame]
  )

  const handleStrokeEnd = useCallback(() => {
    if (tool === 'eraser') return

    if (tool === 'lasso') {
      const loop = lassoPathRef.current
      lassoPathRef.current = null
      setDraft(null)
      if (loop) selectWithLasso(loop)
      return
    }

    cancelDraftFrame()
    const points = draftPointsRef.current
    draftPointsRef.current = null
    rulerStartRef.current = null
    setDraft(null)
    if (!points || points.length === 0) return

    let finalPoints = points
    if (shapeAssist && tool !== 'ruler') {
      const recognized = recognizeShape(points)
      if (recognized) finalPoints = recognized
    }

    const stroke: Stroke = { ...strokeStyleRef.current, points: finalPoints }
    onChange([...valueRef.current, stroke])
  }, [tool, onChange, shapeAssist, cancelDraftFrame, selectWithLasso])

  // P0.1: a second finger landing mid-stroke hands off to the browser's native
  // pinch/pan recognizer — any single-finger draft in flight must be discarded,
  // never committed.
  const handleStrokeCancel = useCallback(() => {
    cancelDraftFrame()
    draftPointsRef.current = null
    rulerStartRef.current = null
    lassoPathRef.current = null
    setDraft(null)
  }, [cancelDraftFrame])

  const ignoreTarget = useCallback((target: EventTarget | null) => {
    return target instanceof Element && target.closest('[data-annotation-ui="true"]') !== null
  }, [])

  usePointerCapture({
    containerRef,
    onStrokeStart: handleStrokeStart,
    onStrokePoint: handleStrokePoint,
    onStrokeEnd: handleStrokeEnd,
    onStrokeCancel: handleStrokeCancel,
    ignoreTarget,
    disabled,
  })

  // --- Lasso selection drag handling (P2.7) — independent pointer tracking on
  // the overlay chrome, kept out of `usePointerCapture` since it targets DOM
  // nodes the drawing surface is told to ignore.

  const normalizeFromEvent = useCallback((event: ReactPointerEvent): Point | null => {
    const container = containerRef.current
    if (!container) return null
    const rect = container.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
  }, [])

  const beginSelectionDrag = useCallback(
    (event: ReactPointerEvent, mode: 'move' | 'resize', corner?: ResizeCorner) => {
      if (!selection) return
      const start = normalizeFromEvent(event)
      if (!start) return
      event.preventDefault()
      event.stopPropagation()
      try {
        ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      } catch {
        // Capture can be rejected for some pointer types; the drag still tracks via move events.
      }
      selectionDragRef.current = {
        mode,
        corner,
        start,
        bounds: selection.bounds,
        strokes: selection.indices.map((index) => ({ index, points: valueRef.current[index].points })),
      }
    },
    [selection, normalizeFromEvent]
  )

  const updateSelectionDrag = useCallback(
    (event: ReactPointerEvent) => {
      const drag = selectionDragRef.current
      if (!drag) return
      const point = normalizeFromEvent(event)
      if (!point) return
      event.preventDefault()
      event.stopPropagation()

      if (drag.mode === 'move') {
        const dx = point.x - drag.start.x
        const dy = point.y - drag.start.y
        const next = [...valueRef.current]
        for (const { index, points } of drag.strokes) {
          next[index] = { ...next[index], points: points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })) }
        }
        onChange(next)
        setSelection({
          indices: drag.strokes.map((s) => s.index),
          bounds: {
            minX: drag.bounds.minX + dx,
            minY: drag.bounds.minY + dy,
            maxX: drag.bounds.maxX + dx,
            maxY: drag.bounds.maxY + dy,
          },
        })
        return
      }

      // Resize anchors at the corner opposite the one being dragged so the
      // group scales toward the handle, like Notes' selection handles.
      const corner = drag.corner ?? 'se'
      const anchorX = corner.includes('w') ? drag.bounds.maxX : drag.bounds.minX
      const anchorY = corner.includes('n') ? drag.bounds.maxY : drag.bounds.minY
      const originCornerX = corner.includes('w') ? drag.bounds.minX : drag.bounds.maxX
      const originCornerY = corner.includes('n') ? drag.bounds.minY : drag.bounds.maxY
      const scaleX = (point.x - anchorX) / (originCornerX - anchorX || 1e-6)
      const scaleY = (point.y - anchorY) / (originCornerY - anchorY || 1e-6)

      const next = [...valueRef.current]
      for (const { index, points } of drag.strokes) {
        next[index] = {
          ...next[index],
          points: points.map((p) => ({
            ...p,
            x: anchorX + (p.x - anchorX) * scaleX,
            y: anchorY + (p.y - anchorY) * scaleY,
          })),
        }
      }
      onChange(next)

      const newCornerX = anchorX + (originCornerX - anchorX) * scaleX
      const newCornerY = anchorY + (originCornerY - anchorY) * scaleY
      setSelection({
        indices: drag.strokes.map((s) => s.index),
        bounds: {
          minX: Math.min(anchorX, newCornerX),
          minY: Math.min(anchorY, newCornerY),
          maxX: Math.max(anchorX, newCornerX),
          maxY: Math.max(anchorY, newCornerY),
        },
      })
    },
    [normalizeFromEvent, onChange]
  )

  const endSelectionDrag = useCallback((event: ReactPointerEvent) => {
    if (!selectionDragRef.current) return
    selectionDragRef.current = null
    try {
      ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
    } catch {
      // Already released or never captured.
    }
  }, [])

  const recolorSelection = useCallback(
    (nextColor: string) => {
      if (!selection) return
      const next = valueRef.current.map((stroke, index) =>
        selection.indices.includes(index) ? { ...stroke, color: nextColor } : stroke
      )
      onChange(next)
    },
    [selection, onChange]
  )

  const draftStroke: Stroke | null = draft && tool !== 'lasso' ? { ...strokeStyleRef.current, points: draft } : null
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
          {tool === 'lasso' && draft && draft.length > 1 && (
            <path
              d={`M ${draft.map((p) => `${(p.x * size.width).toFixed(2)} ${(p.y * size.height).toFixed(2)}`).join(' L ')}`}
              fill="none"
              stroke="var(--teal-strong)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
          )}
        </svg>
      )}

      {canRender && tool === 'lasso' && selection && (
        <SelectionOverlay
          bounds={selection.bounds}
          onMoveStart={(event) => beginSelectionDrag(event, 'move')}
          onResizeStart={(event, corner) => beginSelectionDrag(event, 'resize', corner)}
          onDragMove={updateSelectionDrag}
          onDragEnd={endSelectionDrag}
          onRecolor={recolorSelection}
        />
      )}
    </div>
  )
}
