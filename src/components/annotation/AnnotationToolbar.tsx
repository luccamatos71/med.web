'use client'

import { Eraser, Highlighter, Pen, Undo2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { AnnotationTool } from '@/lib/strokeRenderer'

export interface AnnotationToolbarProps {
  tool: AnnotationTool
  onToolChange: (tool: AnnotationTool) => void
  color: string
  onColorChange: (color: string) => void
  width: number
  onWidthChange: (width: number) => void
  onUndo: () => void
  canUndo: boolean
  className?: string
}

const TOOLS: ReadonlyArray<{ tool: AnnotationTool; label: string; icon: LucideIcon }> = [
  { tool: 'pen', label: 'Caneta', icon: Pen },
  { tool: 'highlighter', label: 'Marca-texto', icon: Highlighter },
  { tool: 'eraser', label: 'Borracha', icon: Eraser },
]

// Swatch values are the legible "ink" shade of each palette family — a literal
// ivory (#F9F5F0) stroke would be invisible against the canvas it's drawn on.
const COLORS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'var(--base-ink)', label: 'Ivory' },
  { value: 'var(--teal-strong)', label: 'Teal' },
  { value: 'var(--terracotta-strong)', label: 'Terracota' },
  { value: 'var(--sage-main)', label: 'Sage' },
]

const WIDTHS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 2, label: 'Fina' },
  { value: 4, label: 'Média' },
  { value: 8, label: 'Grossa' },
]

const swatchButtonStyle = (active: boolean): React.CSSProperties => ({
  width: 24,
  height: 24,
  borderRadius: '50%',
  border: active ? '2px solid var(--teal-main)' : '1px solid var(--base-edge)',
  padding: 0,
  cursor: 'pointer',
  outlineOffset: 2,
})

const pillButtonStyle = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 32,
  padding: '0 10px',
  borderRadius: 'var(--radius-round)',
  border: '1px solid',
  borderColor: active ? 'var(--teal-main)' : 'var(--base-edge)',
  backgroundColor: active ? 'var(--teal-wash)' : 'var(--base-surface)',
  color: active ? 'var(--teal-strong)' : 'var(--base-ink-soft)',
  fontFamily: 'var(--font-ui)',
  fontSize: '0.8125rem',
  cursor: 'pointer',
})

/**
 * Controls for `AnnotationCanvas` (AC5): tool, color and stroke-width selection,
 * plus undo. Purely presentational — owns no stroke data, so the composing
 * parent (story 3.3) decides how `onUndo` mutates its `strokes` state.
 */
export function AnnotationToolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  width,
  onWidthChange,
  onUndo,
  canUndo,
  className,
}: AnnotationToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Ferramentas de anotação"
      className={cn('flex flex-wrap items-center gap-3', className)}
      style={{
        backgroundColor: 'var(--base-surface)',
        border: '1px solid var(--base-edge)',
        borderRadius: 'var(--radius-l)',
        padding: 8,
      }}
    >
      <div role="group" aria-label="Ferramenta" style={{ display: 'flex', gap: 4 }}>
        {TOOLS.map(({ tool: candidate, label, icon: Icon }) => (
          <button
            key={candidate}
            type="button"
            aria-label={label}
            aria-pressed={tool === candidate}
            title={label}
            onClick={() => onToolChange(candidate)}
            style={pillButtonStyle(tool === candidate)}
          >
            <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        ))}
      </div>

      <div role="group" aria-label="Cor" style={{ display: 'flex', gap: 6 }}>
        {COLORS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={color === value}
            title={label}
            onClick={() => onColorChange(value)}
            style={{ ...swatchButtonStyle(color === value), backgroundColor: value }}
          />
        ))}
      </div>

      <div role="group" aria-label="Espessura" style={{ display: 'flex', gap: 4 }}>
        {WIDTHS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={width === value}
            title={label}
            onClick={() => onWidthChange(value)}
            style={pillButtonStyle(width === value)}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: value + 6,
                height: value + 6,
                borderRadius: '50%',
                backgroundColor: 'currentColor',
              }}
            />
          </button>
        ))}
      </div>

      <button
        type="button"
        aria-label="Desfazer último traço"
        title="Desfazer"
        onClick={onUndo}
        disabled={!canUndo}
        style={{
          ...pillButtonStyle(false),
          marginLeft: 'auto',
          opacity: canUndo ? 1 : 0.5,
          cursor: canUndo ? 'pointer' : 'not-allowed',
        }}
      >
        <Undo2 size={16} strokeWidth={1.5} aria-hidden="true" />
        Desfazer
      </button>
    </div>
  )
}
