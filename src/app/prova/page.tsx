'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { GraduationCap, Layers3, Check, X, Clock, ArrowLeft, ArrowRight } from 'lucide-react'

import type { ExamResult, ExamSessionPublic } from '@/types/exam'

const API = process.env.NEXT_PUBLIC_API_URL

interface SubjectOption { id: string; name: string }
interface Flashcard { id: string; front: string; back: string }

type Phase = 'config' | 'exam' | 'result' | 'drill'
type Mode = 'simulado' | 'treino'

export default function ProvaPage() {
  const { data: session } = useSession()
  const accessToken = (session?.accessToken as string) ?? ''

  const [phase, setPhase] = useState<Phase>('config')
  const [mode, setMode] = useState<Mode>('simulado')
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [subjectId, setSubjectId] = useState('')
  const [numQuestions, setNumQuestions] = useState(10)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [exam, setExam] = useState<ExamSessionPublic | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [current, setCurrent] = useState(0)
  const [result, setResult] = useState<ExamResult | null>(null)
  const [seconds, setSeconds] = useState(0)

  // drill
  const [cards, setCards] = useState<Flashcard[]>([])
  const [drillIdx, setDrillIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    fetch(`${API}/api/v1/subjects`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setSubjects(list)
        if (list[0]) setSubjectId(list[0].id)
      })
      .catch(() => {})
  }, [accessToken])

  // timer during exam
  useEffect(() => {
    if (phase !== 'exam') return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  const startSimulado = useCallback(async () => {
    if (!subjectId) return
    setBusy(true); setError('')
    try {
      const res = await fetch(`${API}/api/v1/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ scope_type: 'subject', scope_id: subjectId, num_questions: numQuestions }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.detail || 'Não foi possível gerar a prova.')
        return
      }
      const data: ExamSessionPublic = await res.json()
      setExam(data); setAnswers({}); setCurrent(0); setSeconds(0); setPhase('exam')
    } catch {
      setError('Não foi possível gerar a prova.')
    } finally {
      setBusy(false)
    }
  }, [accessToken, subjectId, numQuestions])

  const startDrill = useCallback(async () => {
    if (!subjectId) return
    setBusy(true); setError('')
    try {
      const res = await fetch(`${API}/api/v1/flashcards?subject_id=${subjectId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store',
      })
      const data = res.ok ? await res.json() : []
      const list: Flashcard[] = (Array.isArray(data) ? data : []).map((f: Flashcard) => ({ id: f.id, front: f.front, back: f.back }))
      if (list.length === 0) {
        setError('Nenhum flashcard nessa matéria ainda.')
        return
      }
      setCards(list.sort(() => Math.random() - 0.5)); setDrillIdx(0); setRevealed(false); setPhase('drill')
    } catch {
      setError('Não foi possível carregar os flashcards.')
    } finally {
      setBusy(false)
    }
  }, [accessToken, subjectId])

  const finishExam = useCallback(async () => {
    if (!exam) return
    setBusy(true)
    try {
      const res = await fetch(`${API}/api/v1/exams/${exam.id}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v])), duration_seconds: seconds }),
      })
      if (res.ok) { setResult(await res.json()); setPhase('result') }
    } finally {
      setBusy(false)
    }
  }, [accessToken, exam, answers, seconds])

  const mmss = useMemo(() => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`, [seconds])

  return (
    <div style={{ height: 'var(--app-vh)', overflowY: 'auto', padding: 'max(32px, var(--safe-top)) 48px max(32px, var(--safe-bottom))' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <h1 style={h1}>Modo Prova</h1>

        {phase === 'config' && (
          <ConfigScreen
            mode={mode} setMode={setMode} subjects={subjects} subjectId={subjectId} setSubjectId={setSubjectId}
            numQuestions={numQuestions} setNumQuestions={setNumQuestions} busy={busy} error={error}
            onStart={() => (mode === 'simulado' ? startSimulado() : startDrill())}
          />
        )}

        {phase === 'exam' && exam && (
          <ExamScreen
            exam={exam} current={current} setCurrent={setCurrent} answers={answers} setAnswers={setAnswers}
            mmss={mmss} busy={busy} onFinish={finishExam}
          />
        )}

        {phase === 'result' && result && (
          <ResultScreen result={result} onRestart={() => { setPhase('config'); setResult(null) }} />
        )}

        {phase === 'drill' && (
          <DrillScreen
            cards={cards} idx={drillIdx} revealed={revealed} setRevealed={setRevealed}
            onNext={() => { setRevealed(false); setDrillIdx((i) => (i + 1) % cards.length) }}
            onExit={() => setPhase('config')}
          />
        )}
      </div>
    </div>
  )
}

function ConfigScreen({ mode, setMode, subjects, subjectId, setSubjectId, numQuestions, setNumQuestions, busy, error, onStart }: any) {
  return (
    <div style={{ marginTop: 12 }}>
      <p style={subtle}>Teste seu conhecimento com um simulado gerado por IA ou treine seus flashcards.</p>
      <div style={{ display: 'flex', gap: 12, margin: '20px 0' }}>
        <ModeCard active={mode === 'simulado'} onClick={() => setMode('simulado')} icon={<GraduationCap size={22} strokeWidth={1.5} />} title="Simulado" desc="Questões de múltipla escolha com nota e gabarito comentado." />
        <ModeCard active={mode === 'treino'} onClick={() => setMode('treino')} icon={<Layers3 size={22} strokeWidth={1.5} />} title="Treino de flashcards" desc="Revise os flashcards sem afetar o agendamento (FSRS)." />
      </div>

      <div style={card}>
        <label style={label}>Matéria</label>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} style={select}>
          {subjects.map((s: SubjectOption) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {mode === 'simulado' && (
          <>
            <label style={{ ...label, marginTop: 16 }}>Número de questões: <strong>{numQuestions}</strong></label>
            <input type="range" min={3} max={20} value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--teal-strong)' }} />
          </>
        )}

        <button onClick={onStart} disabled={busy || !subjectId} style={{ ...primary, marginTop: 20, opacity: busy || !subjectId ? 0.6 : 1 }}>
          {busy ? 'Preparando…' : mode === 'simulado' ? 'Iniciar simulado' : 'Começar treino'}
        </button>
        {error && <p style={{ ...subtle, color: 'var(--terracotta-strong)', marginTop: 10 }}>{error}</p>}
      </div>
    </div>
  )
}

function ExamScreen({ exam, current, setCurrent, answers, setAnswers, mmss, busy, onFinish }: any) {
  const q = exam.questions[current]
  const answeredCount = Object.keys(answers).length
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={subtle}>Questão {current + 1} de {exam.questions.length}</span>
        <span style={{ ...subtle, display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} strokeWidth={1.5} /> {mmss}</span>
      </div>
      <div style={{ height: 3, background: 'var(--base-edge)', borderRadius: 2, marginBottom: 20 }}>
        <div style={{ height: '100%', width: `${(answeredCount / exam.questions.length) * 100}%`, background: 'var(--teal-strong)', borderRadius: 2, transition: 'width .3s' }} />
      </div>

      <div style={{ ...card, padding: '24px 26px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.0625rem', lineHeight: 1.6, color: 'var(--base-ink)', margin: '0 0 18px' }}>{q.stem}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {q.options.map((opt: string, i: number) => {
            const sel = answers[current] === i
            return (
              <button key={i} onClick={() => setAnswers({ ...answers, [current]: i })} style={{
                textAlign: 'left', padding: '12px 16px', borderRadius: 'var(--radius-m)', cursor: 'pointer',
                border: `1.5px solid ${sel ? 'var(--teal-main)' : 'var(--base-edge)'}`,
                backgroundColor: sel ? 'var(--teal-wash)' : 'var(--base-surface)',
                fontFamily: 'var(--font-body)', fontSize: '0.9375rem', color: 'var(--base-ink)',
                display: 'flex', gap: 10, alignItems: 'center',
              }}>
                <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', border: `1.5px solid ${sel ? 'var(--teal-strong)' : 'var(--base-mute)'}`, color: sel ? '#fff' : 'var(--base-whisper)', backgroundColor: sel ? 'var(--teal-strong)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-ui)', fontSize: '0.75rem' }}>{String.fromCharCode(65 + i)}</span>
                {opt}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
        <button onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0} style={{ ...ghost, opacity: current === 0 ? 0.4 : 1 }}><ArrowLeft size={16} strokeWidth={1.5} /> Anterior</button>
        {current < exam.questions.length - 1 ? (
          <button onClick={() => setCurrent(current + 1)} style={primary}>Próxima <ArrowRight size={16} strokeWidth={1.5} /></button>
        ) : (
          <button onClick={onFinish} disabled={busy} style={{ ...primary, backgroundColor: 'var(--teal-strong)' }}>{busy ? 'Corrigindo…' : 'Finalizar prova'}</button>
        )}
      </div>
    </div>
  )
}

function ResultScreen({ result, onRestart }: { result: ExamResult; onRestart: () => void }) {
  const pct = Math.round(result.score)
  const color = pct >= 70 ? 'var(--teal-strong)' : pct >= 50 ? 'var(--amber-main)' : 'var(--terracotta-strong)'
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ ...card, textAlign: 'center', padding: '28px' }}>
        <p style={kicker}>Resultado</p>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 300, color, margin: '4px 0' }}>{pct}%</p>
        <p style={subtle}>{result.correct} de {result.total} corretas{result.duration_seconds ? ` · ${Math.floor(result.duration_seconds / 60)}min` : ''}</p>
        <button onClick={onRestart} style={{ ...primary, marginTop: 16 }}>Nova prova</button>
      </div>

      <h2 style={{ ...h2, marginTop: 28 }}>Gabarito comentado</h2>
      {result.questions.map((q) => (
        <div key={q.index} style={{ ...card, margin: '0 0 14px', borderLeft: `3px solid ${q.is_correct ? 'var(--teal-main)' : 'var(--terracotta-soft)'}` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
            <span style={{ flexShrink: 0, color: q.is_correct ? 'var(--teal-strong)' : 'var(--terracotta-strong)' }}>{q.is_correct ? <Check size={18} /> : <X size={18} />}</span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', margin: 0, color: 'var(--base-ink)' }}>{q.index + 1}. {q.stem}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 26 }}>
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correct_index
              const isSelected = i === q.selected_index
              const bg = isCorrect ? 'var(--teal-wash)' : isSelected ? 'var(--terracotta-soft)' : 'transparent'
              return (
                <div key={i} style={{ padding: '7px 12px', borderRadius: 'var(--radius-s)', backgroundColor: bg, fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--base-ink)' }}>
                  {String.fromCharCode(65 + i)}. {opt} {isCorrect && <strong style={{ color: 'var(--teal-strong)' }}>✓</strong>}
                </div>
              )
            })}
          </div>
          {q.explanation && <p style={{ ...subtle, marginLeft: 26, marginTop: 10, fontStyle: 'italic' }}>{q.explanation}</p>}
        </div>
      ))}
    </div>
  )
}

function DrillScreen({ cards, idx, revealed, setRevealed, onNext, onExit }: any) {
  const c = cards[idx]
  if (!c) return null
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={subtle}>Treino · {idx + 1} de {cards.length}</span>
        <button onClick={onExit} style={{ ...ghost, padding: '4px 10px' }}>Sair</button>
      </div>
      <div style={{ ...card, minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 40 }}>
        <p style={kicker}>Pergunta</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.375rem', lineHeight: 1.5, color: 'var(--base-ink)', margin: '10px 0 0' }}>{c.front}</p>
        {revealed && (
          <>
            <div style={{ width: 40, height: 1, background: 'var(--base-edge)', margin: '24px 0' }} />
            <p style={kicker}>Resposta</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.0625rem', lineHeight: 1.6, color: 'var(--base-ink-soft)', margin: '10px 0 0' }}>{c.back}</p>
          </>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
        {!revealed ? (
          <button onClick={() => setRevealed(true)} style={primary}>Revelar resposta</button>
        ) : (
          <button onClick={onNext} style={primary}>Próximo card <ArrowRight size={16} strokeWidth={1.5} /></button>
        )}
      </div>
    </div>
  )
}

function ModeCard({ active, onClick, icon, title, desc }: any) {
  return (
    <button onClick={onClick} style={{
      flex: 1, textAlign: 'left', padding: '18px 20px', borderRadius: 'var(--radius-l)', cursor: 'pointer',
      border: `1.5px solid ${active ? 'var(--teal-main)' : 'var(--base-edge)'}`,
      backgroundColor: active ? 'var(--teal-wash)' : 'var(--base-surface)',
    }}>
      <span style={{ color: 'var(--teal-strong)', display: 'block', marginBottom: 8 }}>{icon}</span>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--base-ink)', margin: '0 0 4px' }}>{title}</p>
      <p style={subtle}>{desc}</p>
    </button>
  )
}

const h1: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-l)', fontWeight: 300, color: 'var(--base-ink)', margin: 0 }
const h2: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 'var(--text-display-m)', fontWeight: 300, color: 'var(--base-ink)', margin: 0 }
const subtle: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: '0.875rem', color: 'var(--base-whisper)', margin: 0, lineHeight: 1.5 }
const kicker: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--base-whisper)', margin: 0 }
const card: React.CSSProperties = { backgroundColor: 'var(--base-surface)', border: '1px solid var(--base-edge)', borderRadius: 'var(--radius-l)', padding: 20 }
const label: React.CSSProperties = { display: 'block', fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--base-ink-soft)', marginBottom: 6 }
const select: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-m)', border: '1px solid var(--base-edge)', backgroundColor: 'var(--base-canvas)', fontFamily: 'var(--font-ui)', fontSize: '0.875rem', color: 'var(--base-ink)' }
const primary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 'var(--radius-m)', border: 'none', backgroundColor: 'var(--teal-strong)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', cursor: 'pointer' }
const ghost: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 'var(--radius-m)', border: '1px solid var(--base-edge)', backgroundColor: 'var(--base-surface)', color: 'var(--base-ink-soft)', fontFamily: 'var(--font-ui)', fontSize: '0.875rem', cursor: 'pointer' }
