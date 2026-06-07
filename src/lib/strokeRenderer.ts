import { getStroke } from 'perfect-freehand'

export type AnnotationTool = 'pen' | 'highlighter' | 'eraser' | 'ruler' | 'lasso'

export interface StrokePoint {
  x: number
  y: number
  pressure: number
}

export interface Stroke {
  tool: AnnotationTool
  color: string
  width: number
  points: StrokePoint[]
}

// `eraser`, `ruler` and `lasso` are interaction modes, never persisted as a
// stroke's `tool` (committed strokes are always remapped to `pen`/`highlighter`)
// — entries kept here only so `Record<AnnotationTool, …>` stays total.
const TOOL_OPTIONS: Record<AnnotationTool, { thinning: number; smoothing: number; opacity: number }> = {
  pen: { thinning: 0.6, smoothing: 0.5, opacity: 1 },
  highlighter: { thinning: 0.1, smoothing: 0.4, opacity: 0.35 },
  eraser: { thinning: 0.6, smoothing: 0.5, opacity: 1 },
  ruler: { thinning: 0.6, smoothing: 0.5, opacity: 1 },
  lasso: { thinning: 0.6, smoothing: 0.5, opacity: 1 },
}

/** Convert a normalized stroke (0–1 coordinates) into an SVG path `d` attribute, scaled to the container size. */
export function strokeToPath(stroke: Stroke, containerWidth: number, containerHeight: number): string {
  const { thinning, smoothing } = TOOL_OPTIONS[stroke.tool]
  const outline = getStroke(
    stroke.points.map((p) => [p.x * containerWidth, p.y * containerHeight, p.pressure]),
    {
      size: stroke.width,
      thinning,
      smoothing,
      streamline: 0.5,
      simulatePressure: false,
    }
  )

  if (outline.length === 0) return ''

  const [first, ...rest] = outline
  const d = rest.reduce((acc, [x, y]) => `${acc} L ${x.toFixed(2)} ${y.toFixed(2)}`, `M ${first[0].toFixed(2)} ${first[1].toFixed(2)}`)
  return `${d} Z`
}

/** Opacity to apply to the rendered path, per tool (the highlighter is translucent, like in Notes). */
export function strokeOpacity(tool: AnnotationTool): number {
  return TOOL_OPTIONS[tool].opacity
}
