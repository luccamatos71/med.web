'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { CalendarDays, BookOpen, Repeat2, GraduationCap, Sparkles, Target } from 'lucide-react'

import type { StudyDay, StudyPlanResponse, StudyTask } from '@/types/studyPlan'

const API = process.env.NEXT_PUBLIC_API_URL

interface SubjectOption { id: string; name: string }

const TASK_STYLE: Record<string, { color: string; bg: string; icon: typeof BookOpen }> = {
  study: { color: 'var(--teal-strong)', bg: 'var(--teal-wash)', icon: BookOpen },
  review: { color: '#92400E', bg: '#FEF3C7', icon: Repeat2 },
  exam: { color: '#9B2226', bg: '#FBEDE6', icon: GraduationCap },
}

export default function CronogramaPage() {
  const { data: session } = useSession()
  const accessToken = (session?.accessToken as string) ?? ''

  const [plan, setPlan] = useState<StudyPlanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [examDate, setExamDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const [planRes, subjRes] = await Promise.all([
        fetch(`${API}/api/v1/study-plans/active`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }),
        fetch(`${API}/api/v1/subjects`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }),
      ])
      const planData = planRes.ok ? await planRes.json() : null
      const subjData = subjRes.ok ? await subjRes.json() : []
      setPlan(planData)
      const list = Array.isArray(subjData) ? subjData : []
      setSubjects(list)
      setSelected(new Set(list.map((s: SubjectOption) => s.id)))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { void load() }, [load])

  const generate = useCallback(async () => {
    if (!examDate) { setError('Escolha a data da prova.'); return }
    setBusy(true); setError('')
    try {
      const res = await fetch(`${API}/api/v1/study-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ exam_date: examDate, subject_ids: Array.from(selected) }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.detail || 'Não foi possível gerar o cronograma.')
        return
      }
      setPlan(await res.json())
    } catch {
      setError('Não foi possível gerar o cronograma.')
    } finally {
      setBusy(false)
    }
  }, [accessToken, examDate, selected])

  const regenerate = useCallback(async () => {
    setPlan(null)
  }, [])

  return (
    <div style={{ height: 'var(--app-vh)', overflowY: 'auto', padding: 'max(32px, var(--safe-top)) 48px max(32px, var(--safe-bottom))' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <h1 style={h1}>Cronograma</h1>

        {loading ? (
          <p style={subtle}>Carregando…</p>
        ) : plan ? (
          <PlanView plan={plan} onRegenerate={regenerate} />
        ) : (
          <SetupView
            subjects={subjects} selected={selected} setSelected={setSelected}
            examDate={examDate} setExamDate={setExamDate} busy={busy} error={error} onGenerate={generate}
          />
        )}
      </div>
    </div>
  )
}

function SetupView({ subjects, selected, setSelected, examDate, setExamDate, busy, error, onGenerate }: any) {
  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }
  return (
    <div style={{ marginTop: 12 }}>
      <p style={subtle}>A IA monta um plano de estudos distribuindo tópicos, revisões e simulados até o dia da sua prova.</p>
      <div style={{ ...card, marginTop: 18 }}>
        <label style={label}>Data da prova</label>
        <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} style={select} />

        <label style={{ ...label, marginTop: 18 }}>Matérias incluídas</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {subjects.map((s: SubjectOption) => {
            const on = selected.has(s.id)
            return (
              <button key={s.id} onClick={() => toggle(s.id)} style={{
                padding: '8px 14px', borderRadius: 'var(--radius-round)', cursor: 'pointer',
                border: `1.5px solid ${on ? 'var(--teal-main)' : 'var(--base-edge)'}`,
                backgroundColor: on ? 'var(--teal-strong)' : 'var(--base-surface)',
                color: on ? '#fff' : 'var(--base-ink-soft)', fontFamily: 'var(--font-ui)', fontSize: '0.8125rem',
              }}>{s.name}</button>
            )
          })}
        </div>

        <button onClick={onGenerate} disabled={busy} style={{ ...primary, marginTop: 22, opacity: busy ? 0.6 : 1 }}>
          <Sparkles size={16} strokeWidth={1.5} /> {busy ? 'Montando plano…' : 'Gerar cronograma'}
        </button>
        {error && <p style={{ ...subtle, color: 'var(--terracotta-strong)', marginTop: 10 }}>{error}</p>}
      </div>
    </div>
  )
}

function PlanView({ plan, onRegenerate }: { plan: StudyPlanResponse; onRegenerate: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const todayDay = plan.days.find((d) => d.date === today)
  const examDate = new Date(plan.exam_date + 'T00:00:00')
  const daysLeft = Math.max(0, Math.ceil((examDate.getTime() - Date.now()) / 86400000))

  return (
    <div style={{ marginTop: 12 }}>
      {/* Overview */}
      <div style={{ ...card, background: 'var(--teal-wash)', border: '1px solid #A8DCD8', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Target size={22} strokeWidth={1.5} style={{ color: 'var(--teal-strong)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--base-ink)', margin: '0 0 4px' }}>
            {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'} até a prova
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--base-ink-soft)', margin: 0 }}>{plan.overview}</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, margin: '16px 0' }}>
        <Stat label="Tópicos" value={plan.summary.topics ?? 0} />
        <Stat label="Sessões de estudo" value={plan.summary.study_sessions ?? 0} />
        <Stat label="Revisões" value={plan.summary.reviews ?? 0} />
        <Stat label="Simulados" value={plan.summary.exams ?? 0} />
      </div>

      {/* Today */}
      {todayDay && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={h2}>Hoje</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {todayDay.tasks.map((t, i) => <TaskRow key={i} task={t} highlight />)}
          </div>
        </div>
      )}

      {/* Agenda */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={h2}>Agenda</h2>
        <button onClick={onRegenerate} style={ghost}>Refazer plano</button>
      </div>
      <div style={{ marginTop: 12 }}>
        {plan.days.map((d) => <DayBlock key={d.date} day={d} isToday={d.date === today} />)}
      </div>
    </div>
  )
}

function DayBlock({ day, isToday }: { day: StudyDay; isToday: boolean }) {
  const d = new Date(day.date + 'T00:00:00')
  const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
  return (
    <div style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--base-edge)' }}>
      <div style={{ width: 96, flexShrink: 0, fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: isToday ? 'var(--teal-strong)' : 'var(--base-whisper)', fontWeight: isToday ? 600 : 400, textTransform: 'capitalize', paddingTop: 4 }}>
        {label}{isToday ? ' · hoje' : ''}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {day.tasks.map((t, i) => <TaskRow key={i} task={t} />)}
      </div>
    </div>
  )
}

function TaskRow({ task, highlight }: { task: StudyTask; highlight?: boolean }) {
  const st = TASK_STYLE[task.type] ?? TASK_STYLE.study
  const Icon = st.icon
  const href = task.type === 'review' ? '/review' : task.type === 'exam' ? '/prova' : task.topic_id ? `/subjects/${task.subject_id}/topics/${task.topic_id}` : undefined
  const content = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-m)',
      backgroundColor: highlight ? st.bg : 'var(--base-surface)', border: `1px solid ${highlight ? st.color + '40' : 'var(--base-edge)'}`,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, backgroundColor: st.bg, color: st.color, flexShrink: 0 }}>
        <Icon size={15} strokeWidth={1.75} />
      </span>
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.875rem', color: 'var(--base-ink)' }}>{task.label}</span>
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{content}</Link> : content
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ flex: 1, ...card, padding: '14px 16px' }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 400, color: 'var(--teal-strong)', margin: 0 }}>{value}</p>
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.6875rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--base-whisper)', margin: '2px 0 0' }}>{label}</p>
    </div>
  )
}

const h1: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-l)', fontWeight: 300, color: 'var(--base-ink)', margin: 0 }
const h2: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-m)', fontWeight: 300, color: 'var(--base-ink)', margin: 0 }
const subtle: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: '0.875rem', color: 'var(--base-whisper)', margin: 0, lineHeight: 1.5 }
const card: React.CSSProperties = { backgroundColor: 'var(--base-surface)', border: '1px solid var(--base-edge)', borderRadius: 'var(--radius-l)', padding: 18 }
const label: React.CSSProperties = { display: 'block', fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--base-ink-soft)', marginBottom: 6 }
const select: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-m)', border: '1px solid var(--base-edge)', backgroundColor: 'var(--base-canvas)', fontFamily: 'var(--font-ui)', fontSize: '0.875rem', color: 'var(--base-ink)' }
const primary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 'var(--radius-m)', border: 'none', backgroundColor: 'var(--teal-strong)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', cursor: 'pointer' }
const ghost: React.CSSProperties = { padding: '6px 14px', borderRadius: 'var(--radius-m)', border: '1px solid var(--base-edge)', backgroundColor: 'var(--base-surface)', color: 'var(--base-ink-soft)', fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', cursor: 'pointer' }
