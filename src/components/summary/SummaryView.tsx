'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Sparkles, RefreshCw, Download, Network, FileText, Lightbulb, BookText,
  Activity, Brain, Pill, Stethoscope, HeartPulse, FlaskConical, ListChecks, EyeOff,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { SummaryContent, SummaryResponse } from '@/types/summary'
import { exportNodeAsPng } from '@/lib/exportImage'
import { MindMap } from './MindMap'

const API = process.env.NEXT_PUBLIC_API_URL

type View = 'resumo' | 'mapa'

// Soft pastel themes (harmonised with .med), rotated across sections.
interface Theme { bg: string; border: string; accent: string; icon: LucideIcon }
const THEMES: Theme[] = [
  { bg: '#E6F4F2', border: '#A8DCD8', accent: '#0B6E6A', icon: Activity },     // teal
  { bg: '#E9F1EA', border: '#C5D9C8', accent: '#2E7D52', icon: Stethoscope },  // sage
  { bg: '#EDEAF4', border: '#D6CFE6', accent: '#5B4B8A', icon: Brain },        // lavender
  { bg: '#FBEDE6', border: '#F0D0C4', accent: '#9B2226', icon: HeartPulse },   // terracotta
]

const KEYWORD_ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /cin[ée]tic|absor|distribu|metaboli|excre|elimina/i, icon: Activity },
  { match: /din[âa]mic|mecanism|receptor|a[çc][ãa]o/i, icon: Brain },
  { match: /via|administra|dose|posolog|f[áa]rmac|medicament/i, icon: Pill },
  { match: /cl[íi]nic|caso|aplica|pr[áa]tic/i, icon: Stethoscope },
  { match: /cora[çc][ãa]o|cardio|press[ãa]o|vascular/i, icon: HeartPulse },
  { match: /conceito|introdu|defini|b[áa]sic|fundament/i, icon: BookText },
  { match: /qu[íi]mic|reac|lab/i, icon: FlaskConical },
]

function iconForHeading(heading: string, fallback: LucideIcon): LucideIcon {
  return KEYWORD_ICONS.find((k) => k.match.test(heading))?.icon ?? fallback
}

/** Splits "Termo: definição" so the term can be emphasised. */
function splitTerm(text: string): [string | null, string] {
  const idx = text.indexOf(':')
  if (idx > 1 && idx < 45) return [text.slice(0, idx), text.slice(idx + 1).trim()]
  return [null, text]
}

export function SummaryView({
  materialId,
  topicId,
  title,
  accessToken,
}: {
  materialId?: string
  topicId?: string
  title: string
  accessToken: string
}) {
  const base = topicId ? `topics/${topicId}` : `materials/${materialId}`
  const [summary, setSummary] = useState<SummaryContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('resumo')
  const [studyMode, setStudyMode] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    setLoading(true)
    fetch(`${API}/api/v1/${base}/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SummaryResponse | null) => {
        if (!cancelled && data) setSummary(data.summary)
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [base, accessToken])

  const generate = useCallback(
    async (regenerate = false) => {
      setGenerating(true)
      setError(null)
      try {
        const res = await fetch(
          `${API}/api/v1/${base}/summary${regenerate ? '?regenerate=true' : ''}`,
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
    [base, accessToken]
  )

  const handleExport = useCallback(async () => {
    if (!exportRef.current) return
    const safe = title.replace(/[^\w\-]+/g, '_').slice(0, 40)
    await exportNodeAsPng(exportRef.current, `resumo_${safe}`)
  }, [title])

  if (loading) return <p style={muted}>Carregando resumo…</p>

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--base-surface)', border: '1px solid var(--base-edge)', borderRadius: 'var(--radius-round)', padding: 3 }}>
          <ToggleBtn active={view === 'resumo'} onClick={() => setView('resumo')} icon={<FileText size={14} strokeWidth={1.5} />} label="Resumo" />
          <ToggleBtn active={view === 'mapa'} onClick={() => setView('mapa')} icon={<Network size={14} strokeWidth={1.5} />} label="Mapa mental" />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {view === 'resumo' && (
            <button onClick={() => setStudyMode((v) => !v)} style={{ ...ghostBtn, ...(studyMode ? { borderColor: 'var(--teal-main)', color: 'var(--teal-strong)', backgroundColor: 'var(--teal-wash)' } : {}) }}>
              <EyeOff size={14} strokeWidth={1.5} /> {studyMode ? 'Modo estudo ativo' : 'Modo estudo'}
            </button>
          )}
          <button onClick={handleExport} style={ghostBtn}><Download size={14} strokeWidth={1.5} /> Exportar</button>
          <button onClick={() => generate(true)} disabled={generating} style={ghostBtn}>
            <RefreshCw size={14} strokeWidth={1.5} /> {generating ? 'Gerando…' : 'Regenerar'}
          </button>
        </div>
      </div>
      {studyMode && view === 'resumo' && (
        <p style={{ ...muted, margin: '0 0 12px', textAlign: 'center' }}>👆 Tente lembrar antes de tocar para revelar cada resposta.</p>
      )}

      {error && <p style={{ ...muted, color: 'var(--terracotta-strong)', marginBottom: 12 }}>{error}</p>}

      <div ref={exportRef} style={{ backgroundColor: 'var(--base-canvas)', padding: 20, borderRadius: 'var(--radius-l)' }}>
        {view === 'resumo' ? <ResumoBody summary={summary} studyMode={studyMode} /> : (
          <div style={{ backgroundColor: 'var(--base-surface)', border: '1px solid var(--base-edge)', borderRadius: 'var(--radius-l)', overflow: 'hidden' }}>
            <MindMap markdown={summary.mindmap_markdown} />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, margin: '16px 4px 0', opacity: 0.7 }}>
          <Sparkles size={12} strokeWidth={1.5} style={{ color: 'var(--teal-strong)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--teal-strong)' }}>.med</span>
        </div>
      </div>
    </div>
  )
}

function Reveal({ active, children }: { active: boolean; children: React.ReactNode }) {
  const [shown, setShown] = useState(false)
  if (!active || shown) return <>{children}</>
  return (
    <span
      onClick={() => setShown(true)}
      style={{ filter: 'blur(5px)', cursor: 'pointer', userSelect: 'none', transition: 'filter .2s' }}
      title="Tocar para revelar"
    >
      {children}
    </span>
  )
}

function ResumoBody({ summary, studyMode }: { summary: SummaryContent; studyMode: boolean }) {
  return (
    <article style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Title */}
      <header style={{ textAlign: 'center', marginBottom: 28 }}>
        <p style={{ ...kicker, justifyContent: 'center' }}>
          <Sparkles size={12} strokeWidth={1.5} /> Resumo de estudo
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-l)', fontWeight: 400, color: 'var(--base-ink)', margin: '6px 0 0', lineHeight: 1.15 }}>
          {summary.title}
        </h1>
        <div style={{ width: 48, height: 3, borderRadius: 2, backgroundColor: 'var(--teal-main)', margin: '14px auto 0' }} />
      </header>

      {/* TL;DR */}
      {summary.tldr && (
        <div style={{ textAlign: 'center', backgroundColor: 'var(--teal-wash)', border: '1px solid #A8DCD8', borderRadius: 'var(--radius-l)', padding: '18px 22px', margin: '0 0 26px' }}>
          <p style={{ ...kicker, justifyContent: 'center', color: 'var(--teal-strong)' }}>Em resumo</p>
          <p style={{ ...bodyText, margin: '6px 0 0', fontSize: '1rem' }}>{summary.tldr}</p>
        </div>
      )}

      {/* Key points — numbered */}
      {summary.key_points.length > 0 && (
        <div style={{ margin: '0 0 26px' }}>
          <SectionTitle icon={ListChecks} color="var(--teal-strong)">Pontos-chave</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {summary.key_points.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', backgroundColor: 'var(--base-surface)', border: '1px solid var(--base-edge)', borderRadius: 'var(--radius-m)', padding: '12px 14px' }}>
                <span style={numberBadge}>{i + 1}</span>
                <span style={{ ...bodyText, margin: 0 }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections — themed colored cards */}
      {summary.sections.map((sec, i) => {
        const theme = THEMES[i % THEMES.length]
        const Icon = iconForHeading(sec.heading, theme.icon)
        return (
          <div key={i} style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 'var(--radius-l)', padding: '16px 18px', margin: '0 0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, backgroundColor: '#fff', color: theme.accent }}>
                <Icon size={17} strokeWidth={1.75} />
              </span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-s)', fontWeight: 400, color: 'var(--base-ink)', margin: 0 }}>
                {sec.heading}
              </h3>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {sec.bullets.map((b, j) => {
                const [term, rest] = splitTerm(b)
                return (
                  <li key={j} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <span style={{ marginTop: 8, width: 6, height: 6, borderRadius: '50%', backgroundColor: theme.accent, flexShrink: 0 }} />
                    <span style={{ ...bodyText, margin: 0 }}>
                      {term && <strong style={{ color: theme.accent, fontWeight: 600 }}>{term}: </strong>}
                      <Reveal active={studyMode}>{rest}</Reveal>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}

      {/* Clinical pearls */}
      {summary.clinical_pearls.length > 0 && (
        <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 'var(--radius-l)', padding: '16px 18px', margin: '0 0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, backgroundColor: '#fff', color: '#92400E' }}>
              <Lightbulb size={17} strokeWidth={1.75} />
            </span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-s)', fontWeight: 400, color: 'var(--base-ink)', margin: 0 }}>Pérolas clínicas</h3>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {summary.clinical_pearls.map((p, i) => (
              <li key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <span style={{ marginTop: 8, width: 6, height: 6, borderRadius: '50%', backgroundColor: '#92400E', flexShrink: 0 }} />
                <span style={{ ...bodyText, margin: 0 }}>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Glossary */}
      {summary.glossary.length > 0 && (
        <div style={{ margin: '8px 0 0' }}>
          <SectionTitle icon={BookText} color="var(--teal-strong)">Glossário</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {summary.glossary.map((g, i) => (
              <div key={i} style={{ backgroundColor: 'var(--base-surface)', border: '1px solid var(--base-edge)', borderLeft: '3px solid var(--teal-main)', borderRadius: 'var(--radius-m)', padding: '10px 12px' }}>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--teal-strong)', margin: '0 0 2px' }}>{g.term}</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--base-ink-soft)', margin: 0, lineHeight: 1.5 }}><Reveal active={studyMode}>{g.definition}</Reveal></p>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

function SectionTitle({ icon: Icon, color, children }: { icon: LucideIcon; color: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
      <Icon size={18} strokeWidth={1.75} style={{ color }} />
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-s)', fontWeight: 400, color: 'var(--base-ink)', margin: 0 }}>{children}</h3>
    </div>
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

const bodyText: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: '0.9375rem', lineHeight: 1.65, color: 'var(--base-ink)' }
const muted: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--base-whisper)' }
const kicker: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)', fontSize: '0.6875rem', fontWeight: 500,
  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--base-whisper)', margin: 0,
}
const numberBadge: React.CSSProperties = {
  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24,
  borderRadius: '50%', backgroundColor: 'var(--teal-strong)', color: '#fff',
  fontFamily: 'var(--font-ui)', fontSize: '0.75rem', fontWeight: 600,
}
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
