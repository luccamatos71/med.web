export interface GlossaryItem {
  term: string
  definition: string
}

export interface SummarySection {
  heading: string
  bullets: string[]
}

export interface SummaryContent {
  title: string
  tldr: string
  key_points: string[]
  sections: SummarySection[]
  glossary: GlossaryItem[]
  clinical_pearls: string[]
  mindmap_markdown: string
}

export interface SummaryResponse {
  id: string
  material_id: string
  summary: SummaryContent
  created_at: string
  updated_at: string
}
