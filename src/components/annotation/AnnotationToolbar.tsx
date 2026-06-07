'use client'

import { Eraser, Highlighter, Lasso, Pen, Pipette, Redo2, Ruler, Shapes, Undo2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { AnnotationTool } from '@/lib/strokeRenderer'

export type EraserMode = 'object' | 'pixel'

export interface AnnotationToolbarProps {
  tool: AnnotationTool
  onToolChange: (tool: AnnotationTool) => void
  color: string
  onColorChange: (color: string) => void
  width: number
  onWidthChange: (width: number) => void
  onUndo: () => void
  canUndo: boolean
  onRedo: () => void
  canRedo: boolean
  /** Only meaningful while `tool === 'eraser'` — 'object' deletes whole strokes, 'pixel' trims them (Notes' precision eraser). */
  eraserMode: EraserMode
  onEraserModeChange: (mode: EraserMode) => void
  /** "Shape assist" — snaps near-straight/closed strokes into clean lines, circles and rectangles on release, like Notes/Freeform. */
  shapeAssist: boolean
  onShapeAssistChange: (enabled: boolean) => void
  className?: string
}

const TOOLS: ReadonlyArray<{ tool: AnnotationTool; label: string; icon: LucideIcon }> = [
  { tool: 'pen', label: 'Caneta', icon: Pen },
  { tool: 'highlighter', label: 'Marca-texto', icon: Highlighter },
  { tool: 'eraser', label: 'Borracha', icon: Eraser },
  { tool: 'ruler', label: 'Régua', icon: Ruler },
  { tool: 'lasso', label: 'Laço', icon: Lasso },
]

const ERASER_MODES: ReadonlyArray<{ value: EraserMode; label: string }> = [
  { value: 'object', label: 'Traço' },
  { value: 'pixel', label: 'Pixel' },
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

// `<input type="color">` requires a #rrggbb value — DS swatches are CSS custom
// properties, so free-picker selections fall back to this neutral ink tone
// whenever the active color isn't already a hex string.
const FREE_COLOR_FALLBACK = '#2B2B2B'
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}){1,2}$/

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
 * Controls for `AnnotationCanvas` (AC5): tool, color, stroke-width, undo/redo,
 * eraser precision mode, and shape-assist selection. Purely presentational —
 * owns no stroke data, so the composing parent (story 3.3) decides how each
 * callback mutates its `strokes` state.
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
  onRedo,
  canRedo,
  eraserMode,
  onEraserModeChange,
  shapeAssist,
  onShapeAssistChange,
  className,
}: AnnotationToolbarProps) {
  const colorInputValue = HEX_COLOR_PATTERN.test(color) ? color : FREE_COLOR_FALLBACK

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

      {tool === 'eraser' && (
        <div role="group" aria-label="Modo da borracha" style={{ display: 'flex', gap: 4 }}>
          {ERASER_MODES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-label={`Borracha por ${label.toLowerCase()}`}
              aria-pressed={eraserMode === value}
              title={`Borracha por ${label.toLowerCase()}`}
              onClick={() => onEraserModeChange(value)}
              style={pillButtonStyle(eraserMode === value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div role="group" aria-label="Cor" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
        <label
          aria-label="Cor personalizada"
          title="Cor personalizada"
          style={{
            ...swatchButtonStyle(!COLORS.some((c) => c.value === color)),
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            backgroundColor: 'var(--base-surface)',
            color: 'var(--base-ink-soft)',
          }}
        >
          <Pipette size={12} strokeWidth={1.5} aria-hidden="true" />
          <input
            type="color"
            aria-hidden="true"
            tabIndex={-1}
            value={colorInputValue}
            onChange={(event) => onColorChange(event.target.value)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 0, padding: 0 }}
          />
        </label>
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
        aria-label="Assistente de forma"
        aria-pressed={shapeAssist}
        title="Assistente de forma — alinha traços em linhas, círculos e retângulos"
        onClick={() => onShapeAssistChange(!shapeAssist)}
        style={pillButtonStyle(shapeAssist)}
      >
        <Shapes size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>

      <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
        <button
          type="button"
          aria-label="Desfazer último traço"
          title="Desfazer"
          onClick={onUndo}
          disabled={!canUndo}
          style={{ ...pillButtonStyle(false), opacity: canUndo ? 1 : 0.5, cursor: canUndo ? 'pointer' : 'not-allowed' }}
        >
          <Undo2 size={16} strokeWidth={1.5} aria-hidden="true" />
          Desfazer
        </button>
        <button
          type="button"
          aria-label="Refazer último traço desfeito"
          title="Refazer"
          onClick={onRedo}
          disabled={!canRedo}
          style={{ ...pillButtonStyle(false), opacity: canRedo ? 1 : 0.5, cursor: canRedo ? 'pointer' : 'not-allowed' }}
        >
          <Redo2 size={16} strokeWidth={1.5} aria-hidden="true" />
          Refazer
        </button>
      </div>
    </div>
  )
}
