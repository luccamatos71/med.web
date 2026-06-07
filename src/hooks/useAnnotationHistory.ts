'use client'

import { useCallback, useState } from 'react'
import type { Stroke } from '@/lib/strokeRenderer'

export interface AnnotationHistory {
  onChange: (strokes: Stroke[]) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

/** Wraps a persisted strokes array with undo/redo — mirrors Notes' Cmd+Z / Cmd+Shift+Z. New edits clear the redo stack. */
export function useAnnotationHistory(strokes: Stroke[], onChange: (strokes: Stroke[]) => void): AnnotationHistory {
  const [redoStack, setRedoStack] = useState<Stroke[]>([])

  const handleChange = useCallback(
    (next: Stroke[]) => {
      setRedoStack([])
      onChange(next)
    },
    [onChange]
  )

  const undo = useCallback(() => {
    if (strokes.length === 0) return
    const last = strokes[strokes.length - 1]
    setRedoStack((stack) => [...stack, last])
    onChange(strokes.slice(0, -1))
  }, [strokes, onChange])

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack
      const restored = stack[stack.length - 1]
      onChange([...strokes, restored])
      return stack.slice(0, -1)
    })
  }, [strokes, onChange])

  return { onChange: handleChange, undo, redo, canUndo: strokes.length > 0, canRedo: redoStack.length > 0 }
}
