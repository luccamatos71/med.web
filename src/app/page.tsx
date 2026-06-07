'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  Sparkles, BookOpen, CalendarDays, Repeat2, HelpCircle,
  GraduationCap, ArrowRight, Target,
} from 'lucide-react'

import type { StudyDay, StudyPlanResponse, StudyTask } from '@/types/studyPlan'
import type { ReviewSession } from '@/types/review'
import type { DoubtSummary } from '@/types/doubt'
import { Skeleton } from '@/components/ui/skeleton'

const API = process.env.NEXT_PUBLIC_API_URL

interface Subject {
  id: string
  name: string
  color: string
  archived: boolean
  topic_count: number
}

const TASK_STYLE: Record<string, { color: string; bg: string }> = {
  study: { color: 'var(--teal-strong)', bg: 'var(--teal-wash)' },
  review: { color: 'var(--amber-strong)', bg: 'var(--amber-wash)' },
  exam: { color: 'var(--terracotta-strong)', bg: 'var(--terracotta-soft)' },
}

const STAT_COLORS = {
  teal: { fg: 'var(--teal-strong)', bg: 'var(--teal-wash)' },
  amber: { fg: 'var(--amber-strong)', bg: 'var(--amber-wash)' },
  terracotta: { fg: 'var(--terracotta-strong)', bg: 'var(--terracotta-soft)' },
  sage: { fg: 'var(--sage-main)', bg: 'var(--teal-wash)' },
} as const

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function Home() {
  const { data: session } = useSession()
  const accessToken = (session?.accessToken as string) ?? ''

  const [plan, setPlan] = useState<StudyPlanResponse | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [reviewSession, setReviewSession] = useState<ReviewSession | null>(null)
  const [doubts, setDoubts] = useState<DoubtSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${accessToken}` }
      const [planRes, subjRes, reviewRes, doubtRes] = await Promise.all([
        fetch(`${API}/api/v1/study-plans/active`, { headers, cache: 'no-store' }),
        fetch(`${API}/api/v1/subjects`, { headers, cache: 'no-store' }),
        fetch(`${API}/api/v1/reviews/session`, { headers, cache: 'no-store' }),
        fetch(`${API}/api/v1/doubts/summary`, { headers, cache: 'no-store' }),
      ])
      setPlan(planRes.ok ? await planRes.json() : null)
      const subjData = subjRes.ok ? await subjRes.json() : []
      setSubjects(Array.isArray(subjData) ? subjData : [])
      setReviewSession(reviewRes.ok ? await reviewRes.json() : null)
      setDoubts(doubtRes.ok ? await doubtRes.json() : null)
    } catch {
      // seções renderizam seu próprio estado vazio
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { void load() }, [load])

  const today = todayISO()
  const todayPlan = plan?.days.find(d => d.date === today)
  const upcomingDays = plan?.days.filter(d => d.date > today && d.tasks.length > 0).slice(0, 3) ?? []
  const activeSubjects = subjects.filter(s => !s.archived)

  let daysToExam: number | null = null
  if (plan?.exam_date) {
    daysToExam = Math.ceil((new Date(`${plan.exam_date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000)
  }

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1120, margin: '0 auto' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-l)', fontWeight: 400, color: 'var(--base-ink)', margin: '0 0 4px' }}>
          {greeting()}
        </h1>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-m)', color: 'var(--base-whisper)', margin: 0, textTransform: 'capitalize' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard icon={BookOpen} label="Matérias ativas" value={loading ? null : activeSubjects.length} accent="teal" href="/subjects" />
        <StatCard icon={Repeat2} label="Revisões pendentes" value={loading ? null : (reviewSession?.total ?? 0)} accent="amber" href="/review" />
        <StatCard icon={HelpCircle} label="Dúvidas em aberto" value={loading ? null : (doubts?.pending_total ?? 0)} accent="terracotta" href="/duvidas" />
        <StatCard
          icon={Target}
          label="Dias até a prova"
          value={loading ? null : daysToExam}
          accent="sage"
          href="/cronograma"
          format={(v) => (v < 0 ? 'Concluída' : v === 0 ? 'Hoje' : String(v))}
          emptyLabel="—"
        />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: 24 }}>
        <section style={{ backgroundColor: 'var(--base-surface)', border: '1px solid var(--base-edge)', borderRadius: 'var(--radius-l)', padding: 24, boxShadow: 'var(--shadow-whisper)' }}>
          <SectionHeader icon={CalendarDays} title="Seu cronograma" href="/cronograma" />

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton style={{ height: 44, borderRadius: 8 }} />
              <Skeleton style={{ height: 44, borderRadius: 8 }} />
              <Skeleton style={{ height: 44, borderRadius: 8 }} />
            </div>
          ) : !plan ? (
            <EmptyHint text="Você ainda não criou um plano de estudos para a prova." actionLabel="Criar cronograma" href="/cronograma" />
          ) : (
            <>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-ui-s)', fontWeight: 500, color: 'var(--base-whisper)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                Hoje
              </p>
              {todayPlan && todayPlan.tasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {todayPlan.tasks.map((task, i) => <TaskPill key={i} task={task} />)}
                </div>
              ) : (
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-m)', color: 'var(--base-whisper)', margin: '0 0 20px' }}>
                  Nada agendado para hoje — bom momento para revisar ou adiantar conteúdo.
                </p>
              )}

              {upcomingDays.length > 0 && (
                <div>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-ui-s)', fontWeight: 500, color: 'var(--base-whisper)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                    Próximos dias
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {upcomingDays.map(day => <UpcomingDayRow key={day.date} day={day} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ShortcutCard icon={Sparkles} title="Assistente" subtitle="Converse e tire dúvidas sobre seus materiais" href="/assistente" />
          <ShortcutCard icon={BookOpen} title="Matérias" subtitle={loading ? 'Carregando…' : `${activeSubjects.length} matérias cadastradas`} href="/subjects" />
          <ShortcutCard icon={Repeat2} title="Revisão" subtitle={loading ? 'Carregando…' : (reviewSession?.total ? `${reviewSession.total} cartões para revisar` : 'Tudo em dia')} href="/review" />
          <ShortcutCard icon={GraduationCap} title="Prova" subtitle="Simule provas e teste seu conhecimento" href="/prova" />
        </section>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, accent, href, format, emptyLabel }: {
  icon: typeof BookOpen
  label: string
  value: number | null
  accent: keyof typeof STAT_COLORS
  href: string
  format?: (v: number) => string
  emptyLabel?: string
}) {
  const c = STAT_COLORS[accent]
  const display = value === null ? (emptyLabel ?? '—') : (format ? format(value) : String(value))
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{ backgroundColor: 'var(--base-surface)', border: '1px solid var(--base-edge)', borderRadius: 'var(--radius-l)', padding: 20, boxShadow: 'var(--shadow-whisper)', display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-m)', backgroundColor: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} strokeWidth={1.5} style={{ color: c.fg }} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-s)', fontWeight: 400, color: 'var(--base-ink)' }}>
            {display}
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-ui-m)', color: 'var(--base-whisper)' }}>
            {label}
          </div>
        </div>
      </div>
    </Link>
  )
}

function SectionHeader({ icon: Icon, title, href }: { icon: typeof BookOpen; title: string; href: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={18} strokeWidth={1.5} style={{ color: 'var(--teal-strong)' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-s)', fontWeight: 400, color: 'var(--base-ink)', margin: 0 }}>{title}</h2>
      </div>
      <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-ui-m)', color: 'var(--teal-strong)', textDecoration: 'none' }}>
        Ver tudo <ArrowRight size={14} strokeWidth={1.5} />
      </Link>
    </div>
  )
}

function TaskPill({ task }: { task: StudyTask }) {
  const style = TASK_STYLE[task.type] ?? TASK_STYLE.study
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', backgroundColor: style.bg, borderRadius: 'var(--radius-m)' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: style.color, flexShrink: 0 }} />
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-s)', color: 'var(--base-ink-soft)' }}>{task.label}</span>
    </div>
  )
}

function UpcomingDayRow({ day }: { day: StudyDay }) {
  const label = new Date(`${day.date}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--base-canvas)', borderRadius: 'var(--radius-m)' }}>
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-s)', color: 'var(--base-ink-soft)', textTransform: 'capitalize' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-ui-s)', color: 'var(--base-whisper)' }}>
        {day.tasks.length} {day.tasks.length === 1 ? 'tarefa' : 'tarefas'}
      </span>
    </div>
  )
}

function EmptyHint({ text, actionLabel, href }: { text: string; actionLabel: string; href: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-body-m)', color: 'var(--base-whisper)', margin: '0 0 16px' }}>{text}</p>
      <Link href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: 'var(--teal-strong)', color: '#FFFFFF', borderRadius: 'var(--radius-m)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-ui-m)', fontWeight: 500, textDecoration: 'none' }}>
        {actionLabel} <ArrowRight size={14} strokeWidth={1.5} />
      </Link>
    </div>
  )
}

function ShortcutCard({ icon: Icon, title, subtitle, href }: { icon: typeof BookOpen; title: string; subtitle: string; href: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, backgroundColor: 'var(--base-surface)', border: '1px solid var(--base-edge)', borderRadius: 'var(--radius-l)', padding: 18, boxShadow: 'var(--shadow-whisper)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-m)', backgroundColor: 'var(--teal-wash)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} strokeWidth={1.5} style={{ color: 'var(--teal-strong)' }} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-body-l)', fontWeight: 400, color: 'var(--base-ink)' }}>{title}</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-ui-m)', color: 'var(--base-whisper)' }}>{subtitle}</div>
        </div>
      </div>
    </Link>
  )
}
