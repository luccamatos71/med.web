import { useCallback, useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'

export interface NormalizedPoint {
  x: number
  y: number
  pressure: number
  tiltX: number
  tiltY: number
}

export type PointerPhase = 'down' | 'move' | 'up' | 'cancel'

export interface PointerCaptureEvent {
  pointerId: number
  pointerType: string
  phase: PointerPhase
}

export interface PointerCaptureState {
  activePointerId: number | null
  activePointerType: string | null
}

export interface PointerCaptureDecision {
  state: PointerCaptureState
  /** Whether this event should be forwarded to the drawing callbacks. */
  accept: boolean
}

export const initialPointerCaptureState: PointerCaptureState = {
  activePointerId: null,
  activePointerType: null,
}

/**
 * Pure palm-rejection state machine — "pen always wins".
 *
 * While a `pen` pointer is drawing, every other pointer (in particular
 * `touch`, i.e. a resting palm) is ignored until the pen stroke ends. If a
 * non-pen pointer is active and a pen touches down, the pen immediately takes
 * over. Kept pure and dependency-free so it can be unit tested with synthetic
 * events (AC8) without rendering React or touching the DOM.
 */
export function reducePointerCapture(state: PointerCaptureState, event: PointerCaptureEvent): PointerCaptureDecision {
  const { activePointerId, activePointerType } = state

  if (activePointerId !== null) {
    if (event.pointerId === activePointerId) {
      if (event.phase === 'up' || event.phase === 'cancel') {
        return { state: initialPointerCaptureState, accept: true }
      }
      return { state, accept: true }
    }

    if (activePointerType === 'pen') {
      // Palm rejection: a second pointer (touch/mouse/another pen) never
      // interrupts an in-progress pen stroke.
      return { state, accept: false }
    }

    if (event.pointerType === 'pen' && event.phase === 'down') {
      return { state: { activePointerId: event.pointerId, activePointerType: 'pen' }, accept: true }
    }

    return { state, accept: false }
  }

  if (event.phase !== 'down') {
    return { state, accept: false }
  }

  return { state: { activePointerId: event.pointerId, activePointerType: event.pointerType }, accept: true }
}

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function normalizePoint(event: PointerEvent, container: HTMLElement): NormalizedPoint | null {
  const rect = container.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  return {
    x: clamp01((event.clientX - rect.left) / rect.width),
    y: clamp01((event.clientY - rect.top) / rect.height),
    pressure: event.pressure > 0 ? event.pressure : 0.5,
    tiltX: event.tiltX ?? 0,
    tiltY: event.tiltY ?? 0,
  }
}

interface UsePointerCaptureOptions {
  containerRef: RefObject<HTMLElement | null>
  onStrokeStart: (point: NormalizedPoint) => void
  onStrokePoint: (point: NormalizedPoint) => void
  onStrokeEnd: () => void
  /** When true, all pointer input is ignored (e.g. annotation mode is off). */
  disabled?: boolean
}

/**
 * Captures Apple Pencil / pointer input on a container element, applies
 * "pen always wins" palm rejection, and reports normalized (0–1) coordinates
 * relative to the container so strokes stay correct across zoom levels.
 */
export function usePointerCapture({ containerRef, onStrokeStart, onStrokePoint, onStrokeEnd, disabled = false }: UsePointerCaptureOptions) {
  const stateRef = useRef<PointerCaptureState>(initialPointerCaptureState)
  const callbacksRef = useRef({ onStrokeStart, onStrokePoint, onStrokeEnd })
  callbacksRef.current = { onStrokeStart, onStrokePoint, onStrokeEnd }

  const dispatch = useCallback(
    (event: PointerEvent, phase: PointerPhase, container: HTMLElement) => {
      const decision = reducePointerCapture(stateRef.current, {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        phase,
      })
      const wasActive = stateRef.current.activePointerId !== null
      stateRef.current = decision.state
      if (!decision.accept) return

      const point = normalizePoint(event, container)
      if (!point) return

      if (phase === 'down') {
        callbacksRef.current.onStrokeStart(point)
        return
      }
      if (phase === 'up' || phase === 'cancel') {
        if (wasActive) callbacksRef.current.onStrokeEnd()
        return
      }
      callbacksRef.current.onStrokePoint(point)
    },
    []
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container || disabled) return

    // iOS Safari hands touch/stylus sequences to its own scroll/zoom gesture
    // recognizer unless we explicitly claim them: preventDefault stops the
    // browser from hijacking the gesture, and setPointerCapture keeps events
    // flowing to this container even when the pointer leaves its bounds —
    // without both, strokes from non-Apple-Pencil styluses get cancelled
    // mid-draw and look like "the pen isn't recognized at all".
    const handleDown = (event: PointerEvent) => {
      dispatch(event, 'down', container)
      if (stateRef.current.activePointerId === event.pointerId) {
        event.preventDefault()
        try {
          container.setPointerCapture(event.pointerId)
        } catch {
          // Capture can be rejected for some pointer types; drawing still works without it.
        }
      }
    }
    const handleMove = (event: PointerEvent) => {
      if (container.hasPointerCapture(event.pointerId)) event.preventDefault()
      dispatch(event, 'move', container)
    }
    const handleUp = (event: PointerEvent) => {
      if (container.hasPointerCapture(event.pointerId)) {
        event.preventDefault()
        container.releasePointerCapture(event.pointerId)
      }
      dispatch(event, 'up', container)
    }
    const handleCancel = (event: PointerEvent) => {
      if (container.hasPointerCapture(event.pointerId)) {
        container.releasePointerCapture(event.pointerId)
      }
      dispatch(event, 'cancel', container)
    }

    container.addEventListener('pointerdown', handleDown)
    container.addEventListener('pointermove', handleMove)
    container.addEventListener('pointerup', handleUp)
    container.addEventListener('pointercancel', handleCancel)
    container.addEventListener('pointerleave', handleCancel)

    return () => {
      container.removeEventListener('pointerdown', handleDown)
      container.removeEventListener('pointermove', handleMove)
      container.removeEventListener('pointerup', handleUp)
      container.removeEventListener('pointercancel', handleCancel)
      container.removeEventListener('pointerleave', handleCancel)
      stateRef.current = initialPointerCaptureState
    }
  }, [containerRef, disabled, dispatch])
}

/** No-op handler kept for components that need a stable React pointer prop without capturing. */
export function ignorePointerEvent(_event: ReactPointerEvent): void {}
