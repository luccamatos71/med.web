'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles, RefreshCw, Download, Network, FileText } from 'lucide-react'

import type { SummaryContent, SummaryResponse } from '@/types/summary'
import { exportNodeAsPng } from '@/lib/exportImage'
import { MindMap } from './MindMap'

const API = process.env.NEXT_PUBLIC_API_URL

type View = 'resumo' | 'mapa'

export function SummaryView({
  materialId,
  materialTitle,
  accessToken,
}: {
  materialId: string
  materialTitle: string
  accessToken: string
}) {
  const [summary, setSummary] = useState<SummaryContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('resumo')
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    setLoading(true)
    fetch(`${API}/api/v1/materials/${materialId}/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SummaryResponse | null) => {
        if (cancelled) return
        if (data) setSummary(data.summary)
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [materialId, accessToken])

  const generate = useCallback(
    async (regenerate = false) => {
      setGenerating(true)
      setError(null)
      try {
        const res = await fetch(
          `${API}/api/v1/materials/${materialId}/summary${regenerate ? '?regenerate=true' : ''}`,
          { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (!res.ok) {
          setError('Não foi possível gerar o resumo agora. Tente novamente.')
          return
        }
        const data: SummaryResponse = await res.json()
        setSummary(data.summary)
      } catch {
        setError('Não foi possível gerar o resumo agora. Tente novamente.')
      } finally {
        setGenerating(false)
      }
    },
    [materialId, accessToken]
  )

  const handleExport = useCallback(async () => {
    if (!exportRef.current) return
    const safe = materialTitle.replace(/[^\w\-]+/g, '_').slice(0, 40)
    await exportNodeAsPng(exportRef.current, `resumo_${safe}`)
  }, [materialTitle])

  if (loading) {
    return <p style={muted}>Carregando resumo…</p>
  }

  if (!summary) {
    return (
      <div style={{ textAlign: 'center', marginTop: '12vh', maxWidth: 460, marginInline: 'auto' }}>
        <Sparkles size={32} strokeWidth={1.25} style={{ color: 'var(--teal-main)', marginBottom: 12 }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-m)', fontWeight: 300, margin: '0 0 8px', color: 'var(--base-ink)' }}>
          Resumo do material
        </h2>
        <p style={{ ...muted, marginBottom: 20 }}>
          Gere um resumo estruturado e um mapa mental a partir deste material.
        </p>
        <button onClick={() => generate(false)} disabled={generating} style={primaryBtn(generating)}>
          {generating ? 'Gerando…' : 'Gerar resumo'}
        </button>
        {error && <p style={{ ...muted, color: 'var(--terracotta-strong)', marginTop: 12 }}>{error}</p>}
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--base-surface)', border: '1px solid var(--base-edge)', borderRadius: 'var(--radius-round)', padding: 3 }}>
          <ToggleBtn active={view === 'resumo'} onClick={() => setView('resumo')} icon={<FileText size={14} strokeWidth={1.5} />} label="Resumo" />
          <ToggleBtn active={view === 'mapa'} onClick={() => setView('mapa')} icon={<Network size={14} strokeWidth={1.5} />} label="Mapa mental" />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExport} style={ghostBtn}><Download size={14} strokeWidth={1.5} /> Exportar</button>
          <button onClick={() => generate(true)} disabled={generating} style={ghostBtn}>
            <RefreshCw size={14} strokeWidth={1.5} /> {generating ? 'Gerando…' : 'Regenerar'}
          </button>
        </div>
      </div>

      {error && <p style={{ ...muted, color: 'var(--terracotta-strong)', marginBottom: 12 }}>{error}</p>}

      <div ref={exportRef} style={{ backgroundColor: 'var(--base-canvas)', padding: view === 'resumo' ? 4 : 0 }}>
        {view === 'resumo' ? <ResumoBody summary={summary} /> : (
          <div style={{ backgroundColor: 'var(--base-surface)', border: '1px solid var(--base-edge)', borderRadius: 'var(--radius-l)' }}>
            <MindMap markdown={summary.mindmap_markdown} />
          </div>
        )}
        {/* Branded footer for shared exports */}
        <p style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--teal-strong)', margin: '12px 6px 0' }}>.med</p>
      </div>
    </div>
  )
}

function ResumoBody({ summary }: { summary: SummaryContent }) {
  return (
    <article style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-l)', fontWeight: 400, color: 'var(--base-ink)', margin: '0 0 12px', lineHeight: 1.2 }}>
        {summary.title}
      </h1>

      {/* TL;DR */}
      {summary.tldr && (
        <div style={{ borderLeft: '3px solid var(--teal-main)', backgroundColor: 'var(--teal-wash)', borderRadius: '0 8px 8px 0', padding: '12px 16px', margin: '0 0 24px' }}>
          <Label>Em resumo</Label>
          <p style={{ ...bodyText, margin: 0 }}>{summary.tldr}</p>
        </div>
      )}

      {/* Key points */}
      {summary.key_points.length > 0 && (
        <Section heading="Pontos-chave">
          <ul style={{ ...bodyText, margin: 0, paddingLeft: '1.1em' }}>
            {summary.key_points.map((p, i) => <li key={i} style={{ marginBottom: 6 }}>{p}</li>)}
          </ul>
        </Section>
      )}

      {/* Sections */}
      {summary.sections.map((sec, i) => (
        <Section key={i} heading={sec.heading}>
          <ul style={{ ...bodyText, margin: 0, paddingLeft: '1.1em' }}>
            {sec.bullets.map((b, j) => <li key={j} style={{ marginBottom: 6 }}>{b}</li>)}
          </ul>
        </Section>
      ))}

      {/* Clinical pearls */}
      {summary.clinical_pearls.length > 0 && (
        <div style={{ borderLeft: '3px solid var(--amber-main)', backgroundColor: 'var(--amber-wash)', borderRadius: '0 8px 8px 0', padding: '12px 16px', margin: '0 0 24px' }}>
          <Label>Pérolas clínicas</Label>
          <ul style={{ ...bodyText, margin: 0, paddingLeft: '1.1em' }}>
            {summary.clinical_pearls.map((p, i) => <li key={i} style={{ marginBottom: 6 }}>{p}</li>)}
          </ul>
        </div>
      )}

      {/* Glossary */}
      {summary.glossary.length > 0 && (
        <Section heading="Glossário">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {summary.glossary.map((g, i) => (
              <div key={i} style={{ backgroundColor: 'var(--base-surface)', border: '1px solid var(--base-edge)', borderRadius: 'var(--radius-m)', padding: '10px 12px' }}>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--teal-strong)', margin: '0 0 2px' }}>{g.term}</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--base-ink-soft)', margin: 0, lineHeight: 1.5 }}>{g.definition}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </article>
  )
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section style={{ margin: '0 0 24px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-s)', fontWeight: 400, color: 'var(--base-ink)', margin: '0 0 10px' }}>
        {heading}
      </h3>
      {children}
    </section>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--base-whisper)', margin: '0 0 4px' }}>
      {children}
    </p>
  )
}

function ToggleBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 'var(--radius-round)', border: 'none', cursor: 'pointer',
      fontFamily: 'var(--font-ui)', fontSize: '0.8125rem',
      backgroundColor: active ? 'var(--teal-strong)' : 'transparent',
      color: active ? '#fff' : 'var(--base-ink-soft)',
    }}>
      {icon} {label}
    </button>
  )
}

const bodyText: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--base-ink)' }
const muted: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--base-whisper)' }
const ghostBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 'var(--radius-m)',
  border: '1px solid var(--base-edge)', backgroundColor: 'var(--base-surface)', color: 'var(--base-ink-soft)',
  fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', cursor: 'pointer',
}
function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 20px', borderRadius: 'var(--radius-m)', border: 'none',
    backgroundColor: disabled ? 'var(--base-edge)' : 'var(--teal-strong)', color: disabled ? 'var(--base-whisper)' : '#fff',
    fontFamily: 'var(--font-ui)', fontSize: '0.875rem', cursor: disabled ? 'not-allowed' : 'pointer',
  }
}
