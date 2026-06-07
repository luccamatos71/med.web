import type { Stroke } from './strokeRenderer'

const API = process.env.NEXT_PUBLIC_API_URL

export type AnnotationSurface = 'pdf_page' | 'summary'

interface AnnotationKey {
  materialId: string
  surface: AnnotationSurface
  anchor: string
  accessToken: string
}

interface AnnotationPayload {
  strokes_data: Stroke[]
}

/** GET /materials/{id}/annotations — returns `[]` when nothing was saved yet for this surface/anchor (backend responds with an "empty" payload, not 404). */
export async function fetchAnnotation({ materialId, surface, anchor, accessToken }: AnnotationKey): Promise<Stroke[]> {
  const query = new URLSearchParams({ surface, anchor })
  const res = await fetch(`${API}/api/v1/materials/${materialId}/annotations?${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Failed to load annotation (${res.status})`)
  const data: AnnotationPayload = await res.json()
  return data.strokes_data
}

/** PUT /materials/{id}/annotations — upserts the full stroke list for a surface/anchor. */
export async function saveAnnotation({ materialId, surface, anchor, accessToken }: AnnotationKey, strokes: Stroke[]): Promise<void> {
  const res = await fetch(`${API}/api/v1/materials/${materialId}/annotations`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ surface, anchor, strokes_data: strokes } satisfies { surface: AnnotationSurface; anchor: string; strokes_data: Stroke[] }),
  })
  if (!res.ok) throw new Error(`Failed to save annotation (${res.status})`)
}
