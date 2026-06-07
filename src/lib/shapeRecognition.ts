import type { StrokePoint } from './strokeRenderer'

interface Point {
  x: number
  y: number
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function centroid(points: Point[]): Point {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

function boundingBox(points: Point[]) {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
}

function withPressure(points: Point[], pressure: number): StrokePoint[] {
  return points.map((p) => ({ x: p.x, y: p.y, pressure }))
}

const STRAIGHT_LINE_TOLERANCE = 0.025 // max perpendicular deviation from the start–end segment, normalized units
const CLOSED_PATH_TOLERANCE = 0.06 // start/end gap relative to the shape's span — how "closed" counts as closed
const CIRCLE_RADIUS_VARIANCE_TOLERANCE = 0.18 // relative std-dev of distance-from-centroid that still reads as "round"
const RECTANGLE_CORNER_COVERAGE = 0.12 // share of points that must hug a bbox corner to read as "rectangular"

/**
 * Heuristic shape assist (P2.8): straightens near-straight strokes into clean
 * lines and snaps closed loops that look round or boxy into circles/rectangles
 * — mirrors the "shape assist" behavior of Notes/Freeform. Returns `null` when
 * the stroke doesn't resemble a recognizable shape, so the caller keeps the
 * freehand original untouched.
 */
export function recognizeShape(points: StrokePoint[]): StrokePoint[] | null {
  if (points.length < 6) return null

  const averagePressure = points.reduce((sum, p) => sum + p.pressure, 0) / points.length
  const start = points[0]
  const end = points[points.length - 1]
  const { minX, minY, maxX, maxY } = boundingBox(points)
  const span = Math.max(maxX - minX, maxY - minY, 1e-6)

  // 1. Straight line — every sampled point sits close to the start–end segment.
  const lineLength = distance(start, end)
  if (lineLength > span * 0.5) {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const lengthSq = dx * dx + dy * dy || 1e-9
    const maxDeviation = points.reduce((max, p) => {
      const t = ((p.x - start.x) * dx + (p.y - start.y) * dy) / lengthSq
      const projection = { x: start.x + t * dx, y: start.y + t * dy }
      return Math.max(max, distance(p, projection))
    }, 0)
    if (maxDeviation <= STRAIGHT_LINE_TOLERANCE) {
      return withPressure([start, end], averagePressure)
    }
  }

  // Circles and rectangles both require a (roughly) closed loop.
  if (distance(start, end) > span * CLOSED_PATH_TOLERANCE) return null

  const center = centroid(points)
  const radii = points.map((p) => distance(p, center))
  const meanRadius = radii.reduce((sum, r) => sum + r, 0) / radii.length
  const variance = radii.reduce((sum, r) => sum + (r - meanRadius) ** 2, 0) / radii.length
  const relativeStdDev = Math.sqrt(variance) / (meanRadius || 1e-9)

  // 2. Circle — distance from the centroid stays roughly constant all the way around.
  if (relativeStdDev <= CIRCLE_RADIUS_VARIANCE_TOLERANCE) {
    const steps = 48
    const circle: Point[] = Array.from({ length: steps + 1 }, (_, i) => {
      const angle = (i / steps) * Math.PI * 2
      return { x: center.x + Math.cos(angle) * meanRadius, y: center.y + Math.sin(angle) * meanRadius }
    })
    return withPressure(circle, averagePressure)
  }

  // 3. Rectangle — a closed loop that hugs its own bounding-box corners (a
  // loose ellipse leaves the corners empty; a rectangle fills them).
  const cornerHits = points.filter((p) => {
    const nearLeft = p.x - minX <= span * RECTANGLE_CORNER_COVERAGE
    const nearRight = maxX - p.x <= span * RECTANGLE_CORNER_COVERAGE
    const nearTop = p.y - minY <= span * RECTANGLE_CORNER_COVERAGE
    const nearBottom = maxY - p.y <= span * RECTANGLE_CORNER_COVERAGE
    return (nearLeft || nearRight) && (nearTop || nearBottom)
  }).length
  if (cornerHits >= points.length * RECTANGLE_CORNER_COVERAGE) {
    const rectangle: Point[] = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
      { x: minX, y: minY },
    ]
    return withPressure(rectangle, averagePressure)
  }

  return null
}
