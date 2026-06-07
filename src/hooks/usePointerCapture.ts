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

    if (event.pointerType === 'pen' && event.phase === 'down') {
      // Pen always wins immediately — even over another pointer this state
      // machine still considers "active". On iOS Safari a pen's `pointerup`/
      // `pointercancel` is occasionally dropped (capture lost mid-gesture),
      // which would otherwise leave `activePointerType: 'pen'` stuck forever
      // and silently reject every later Apple Pencil contact ("doesn't
      // recognize the pencil anymore"). Letting a fresh pen contact take over
      // unconditionally makes the machine self-healing without weakening palm
      // rejection — palm contact is always reported as `touch`, never `pen`.
      return { state: { activePointerId: event.pointerId, activePointerType: 'pen' }, accept: true }
    }

    if (activePointerType === 'pen') {
      // Palm rejection: a second non-pen pointer never interrupts an
      // in-progress pen stroke.
      return { state, accept: false }
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
  /**
   * Fired when an in-progress draft must be discarded without committing —
   * e.g. a second finger lands mid-stroke and the gesture must hand off to
   * the browser's native pinch/pan recognizer (P0.1).
   */
  onStrokeCancel?: () => void
  /** When true, all pointer input is ignored (e.g. annotation mode is off). */
  disabled?: boolean
  /**
   * Lets the caller mark DOM regions (toolbars overlaid on the canvas, e.g.
   * recolor swatches) that should never be treated as drawing input. Checked
   * before any capture/preventDefault so taps on that UI behave like normal
   * buttons instead of starting a stroke.
   */
  ignoreTarget?: (target: EventTarget | null) => boolean
}

/**
 * Captures Apple Pencil / pointer input on a container element, applies
 * "pen always wins" palm rejection, and reports normalized (0–1) coordinates
 * relative to the container so strokes stay correct across zoom levels.
 *
 * Also disambiguates multi-touch gestures (P0.1): a second simultaneous
 * non-pen pointer means the user is pinching/panning, not drawing — any
 * single-finger draft in progress is cancelled (via `onStrokeCancel`) and
 * every pointer in that gesture is left alone (no `preventDefault`/capture)
 * so the browser's native zoom/pan recognizer takes over, exactly like
 * Notes lets you pinch-zoom mid-drawing without interrupting the pen.
 */
export function usePointerCapture({
  containerRef,
  onStrokeStart,
  onStrokePoint,
  onStrokeEnd,
  onStrokeCancel,
  disabled = false,
  ignoreTarget,
}: UsePointerCaptureOptions) {
  const stateRef = useRef<PointerCaptureState>(initialPointerCaptureState)
  const callbacksRef = useRef({ onStrokeStart, onStrokePoint, onStrokeEnd, onStrokeCancel })
  callbacksRef.current = { onStrokeStart, onStrokePoint, onStrokeEnd, onStrokeCancel }

  // Multi-touch gesture tracking (P0.1) — lives entirely in refs, outside the
  // pure `reducePointerCapture` state machine, so its 10 unit tests (which
  // exercise only the reducer) remain untouched and unaffected.
  const touchPointersRef = useRef<Set<number>>(new Set())
  const gestureActiveRef = useRef(false)

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
      if (ignoreTarget?.(event.target)) return

      if (event.pointerType !== 'pen') {
        touchPointersRef.current.add(event.pointerId)
        if (touchPointersRef.current.size >= 2) {
          if (!gestureActiveRef.current) {
            gestureActiveRef.current = true
            // Second finger landed — this is a pinch/pan, not a stroke. Hand
            // off to the browser's native recognizer and discard any
            // single-finger draft in flight (without committing it, P0.1).
            const { activePointerId, activePointerType } = stateRef.current
            if (activePointerId !== null && activePointerType !== 'pen') {
              try {
                container.releasePointerCapture(activePointerId)
              } catch {
                // Already released or never captured.
              }
              stateRef.current = initialPointerCaptureState
              callbacksRef.current.onStrokeCancel?.()
            }
          }
          return
        }
        if (gestureActiveRef.current) return
      }

      dispatch(event, 'down', container)
      if (stateRef.current.activePointerId === event.pointerId) {
        if (event.pointerType === 'pen') {
          // The pen just took over (possibly from a stuck/stale pointer or a
          // mid-flight gesture) — drop any multi-touch bookkeeping so a pen
          // stroke is never mistaken for an in-progress pinch/pan.
          touchPointersRef.current.clear()
          gestureActiveRef.current = false
        }
        event.preventDefault()
        try {
          container.setPointerCapture(event.pointerId)
        } catch {
          // Capture can be rejected for some pointer types; drawing still works without it.
        }
      }
    }
    const handleMove = (event: PointerEvent) => {
      if (ignoreTarget?.(event.target)) return
      if (gestureActiveRef.current && event.pointerType !== 'pen') return
      if (container.hasPointerCapture(event.pointerId)) event.preventDefault()
      dispatch(event, 'move', container)
    }
    const handleUp = (event: PointerEvent) => {
      if (ignoreTarget?.(event.target)) return
      if (event.pointerType !== 'pen') {
        touchPointersRef.current.delete(event.pointerId)
        if (touchPointersRef.current.size === 0) gestureActiveRef.current = false
        else if (gestureActiveRef.current) return
      }
      if (container.hasPointerCapture(event.pointerId)) {
        event.preventDefault()
        container.releasePointerCapture(event.pointerId)
      }
      dispatch(event, 'up', container)
    }
    const handleCancel = (event: PointerEvent) => {
      if (ignoreTarget?.(event.target)) return
      if (event.pointerType !== 'pen') {
        touchPointersRef.current.delete(event.pointerId)
        if (touchPointersRef.current.size === 0) gestureActiveRef.current = false
        else if (gestureActiveRef.current) return
      }
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
      touchPointersRef.current.clear()
      gestureActiveRef.current = false
    }
  }, [containerRef, disabled, dispatch, ignoreTarget])
}

/** No-op handler kept for components that need a stable React pointer prop without capturing. */
export function ignorePointerEvent(_event: ReactPointerEvent): void {}
