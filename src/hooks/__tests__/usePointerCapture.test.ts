import { describe, expect, it } from 'vitest'
import {
  initialPointerCaptureState,
  reducePointerCapture,
  type PointerCaptureEvent,
  type PointerCaptureState,
} from '../usePointerCapture'

function event(pointerId: number, pointerType: string, phase: PointerCaptureEvent['phase']): PointerCaptureEvent {
  return { pointerId, pointerType, phase }
}

describe('reducePointerCapture — palm rejection ("pen always wins")', () => {
  it('accepts the first pointer down and captures it', () => {
    const result = reducePointerCapture(initialPointerCaptureState, event(1, 'touch', 'down'))
    expect(result.accept).toBe(true)
    expect(result.state).toEqual({ activePointerId: 1, activePointerType: 'touch' })
  })

  it('ignores move/up/cancel from a pointer that never went down', () => {
    const result = reducePointerCapture(initialPointerCaptureState, event(1, 'touch', 'move'))
    expect(result.accept).toBe(false)
    expect(result.state).toEqual(initialPointerCaptureState)
  })

  it('keeps forwarding move events from the active pointer', () => {
    const afterDown = reducePointerCapture(initialPointerCaptureState, event(1, 'pen', 'down'))
    const afterMove = reducePointerCapture(afterDown.state, event(1, 'pen', 'move'))
    expect(afterMove.accept).toBe(true)
    expect(afterMove.state).toEqual({ activePointerId: 1, activePointerType: 'pen' })
  })

  it('resets to the initial state when the active pointer goes up', () => {
    const afterDown = reducePointerCapture(initialPointerCaptureState, event(1, 'touch', 'down'))
    const afterUp = reducePointerCapture(afterDown.state, event(1, 'touch', 'up'))
    expect(afterUp.accept).toBe(true)
    expect(afterUp.state).toEqual(initialPointerCaptureState)
  })

  it('resets to the initial state when the active pointer cancels', () => {
    const afterDown = reducePointerCapture(initialPointerCaptureState, event(1, 'touch', 'down'))
    const afterCancel = reducePointerCapture(afterDown.state, event(1, 'touch', 'cancel'))
    expect(afterCancel.accept).toBe(true)
    expect(afterCancel.state).toEqual(initialPointerCaptureState)
  })

  it('ignores a resting palm (touch) while a pen stroke is in progress', () => {
    const penDown = reducePointerCapture(initialPointerCaptureState, event(1, 'pen', 'down'))
    expect(penDown.accept).toBe(true)

    const palmDown = reducePointerCapture(penDown.state, event(2, 'touch', 'down'))
    expect(palmDown.accept).toBe(false)
    expect(palmDown.state).toEqual(penDown.state)

    const palmMove = reducePointerCapture(palmDown.state, event(2, 'touch', 'move'))
    expect(palmMove.accept).toBe(false)
    expect(palmMove.state).toEqual(penDown.state)

    const penMove = reducePointerCapture(palmMove.state, event(1, 'pen', 'move'))
    expect(penMove.accept).toBe(true)
    expect(penMove.state).toEqual({ activePointerId: 1, activePointerType: 'pen' })
  })

  it('lets the pen take over immediately from an active touch pointer', () => {
    const touchDown = reducePointerCapture(initialPointerCaptureState, event(1, 'touch', 'down'))
    expect(touchDown.accept).toBe(true)

    const penDown = reducePointerCapture(touchDown.state, event(2, 'pen', 'down'))
    expect(penDown.accept).toBe(true)
    expect(penDown.state).toEqual({ activePointerId: 2, activePointerType: 'pen' })

    const touchMove = reducePointerCapture(penDown.state, event(1, 'touch', 'move'))
    expect(touchMove.accept).toBe(false)
    expect(touchMove.state).toEqual(penDown.state)
  })

  it('ignores a second non-pen pointer while a non-pen pointer is already active', () => {
    const mouseDown = reducePointerCapture(initialPointerCaptureState, event(1, 'mouse', 'down'))
    const touchDown = reducePointerCapture(mouseDown.state, event(2, 'touch', 'down'))
    expect(touchDown.accept).toBe(false)
    expect(touchDown.state).toEqual(mouseDown.state)
  })

  it('allows a fresh stroke to start after the active pointer ends', () => {
    const firstDown = reducePointerCapture(initialPointerCaptureState, event(1, 'pen', 'down'))
    const firstUp = reducePointerCapture(firstDown.state, event(1, 'pen', 'up'))
    expect(firstUp.state).toEqual(initialPointerCaptureState)

    const secondDown = reducePointerCapture(firstUp.state, event(2, 'touch', 'down'))
    expect(secondDown.accept).toBe(true)
    expect(secondDown.state).toEqual({ activePointerId: 2, activePointerType: 'touch' })
  })

  it('never mutates the input state object', () => {
    const state: PointerCaptureState = { activePointerId: 1, activePointerType: 'pen' }
    const snapshot = { ...state }
    reducePointerCapture(state, event(2, 'touch', 'down'))
    expect(state).toEqual(snapshot)
  })
})
