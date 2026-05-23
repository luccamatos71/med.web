'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SUBJECT_COLORS, MED_CURRICULUM, SUGGESTED_SUBJECTS, type SubjectColor } from '@/lib/medCurriculum'

const API = process.env.NEXT_PUBLIC_API_URL

interface SubjectDraft {
  name: string
  color: SubjectColor
  suggestedTopics: string[]
  selectedTopics: string[]
}

export default function SetupPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [step, setStep] = useState<'pick' | 'topics'>('pick')
  const [drafts, setDrafts] = useState<SubjectDraft[]>([])
  const [currentDraft, setCurrentDraft] = useState<SubjectDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [customName, setCustomName] = useState('')
  const [selectedColor, setSelectedColor] = useState<SubjectColor>(SUBJECT_COLORS[0])

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.accessToken}`,
  })

  function pickSuggested(name: string) {
    const colorIdx = drafts.length % SUBJECT_COLORS.length
    const topics = MED_CURRICULUM[name] ?? []
    setCurrentDraft({
      name,
      color: SUBJECT_COLORS[colorIdx],
      suggestedTopics: topics,
      selectedTopics: [...topics],
    })
    setStep('topics')
  }

  function addCustom() {
    if (!customName.trim()) return
    setCurrentDraft({
      name: customName.trim(),
      color: selectedColor,
      suggestedTopics: [],
      selectedTopics: [],
    })
    setCustomName('')
    setStep('topics')
  }

  function toggleTopic(topic: string) {
    if (!currentDraft) return
    setCurrentDraft(prev => {
      if (!prev) return prev
      const has = prev.selectedTopics.includes(topic)
      return {
        ...prev,
        selectedTopics: has
          ? prev.selectedTopics.filter(t => t !== topic)
          : [...prev.selectedTopics, topic],
      }
    })
  }

  function addTopicToSuggested() {
    if (!currentDraft) return
    const newTopic = prompt('Nome do tópico:')
    if (!newTopic?.trim()) return
    setCurrentDraft(prev => prev ? {
      ...prev,
      suggestedTopics: [...prev.suggestedTopics, newTopic.trim()],
      selectedTopics: [...prev.selectedTopics, newTopic.trim()],
    } : prev)
  }

  function confirmDraft() {
    if (!currentDraft) return
    setDrafts(prev => [...prev, currentDraft])
    setCurrentDraft(null)
    setStep('pick')
  }

  async function saveAll() {
    if (drafts.length === 0) return
    setSaving(true)
    for (const draft of drafts) {
      const res = await fetch(`${API}/api/v1/subjects`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ name: draft.name, color: draft.color }),
      })
      if (!res.ok) continue
      const subject = await res.json()
      for (let i = 0; i < draft.selectedTopics.length; i++) {
        await fetch(`${API}/api/v1/topics`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ subject_id: subject.id, name: draft.selectedTopics[i] }),
        })
      }
    }
    setSaving(false)
    router.push('/subjects')
  }

  if (step === 'topics' && currentDraft) {
    return (
      <div style={{ padding: '32px 48px', maxWidth: '600px' }}>
        <button onClick={() => { setCurrentDraft(null); setStep('pick') }} style={backButtonStyle}>← Voltar</button>
        <h1 style={displayStyle}>{currentDraft.name}</h1>
        <p style={bodyStyle}>Selecione os tópicos que deseja estudar:</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {currentDraft.suggestedTopics.map(topic => (
            <label key={topic} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={currentDraft.selectedTopics.includes(topic)}
                onChange={() => toggleTopic(topic)}
                style={{ width: '16px', height: '16px', accentColor: '#2EA39E' }}
              />
              <span style={bodyStyle}>{topic}</span>
            </label>
          ))}
        </div>

        <button onClick={addTopicToSuggested} style={{ ...ghostButtonStyle, marginBottom: '24px' }}>+ Adicionar tópico</button>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={confirmDraft} style={primaryButtonStyle}>
            Confirmar ({currentDraft.selectedTopics.length} tópicos)
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 48px', maxWidth: '720px' }}>
      <h1 style={displayStyle}>Configure seu semestre</h1>
      <p style={{ ...bodyStyle, marginBottom: '32px' }}>
        Selecione as matérias que você está estudando agora.
      </p>

      {drafts.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={sectionTitleStyle}>Matérias selecionadas</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {drafts.map((d, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                backgroundColor: '#F9F5F0', borderRadius: '8px', padding: '8px 12px',
                border: '1px solid #E8DDD4',
              }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: d.color, flexShrink: 0 }} />
                <span style={bodyStyle}>{d.name}</span>
                <span style={{ fontSize: '0.75rem', color: '#9B8E84' }}>({d.selectedTopics.length})</span>
                <button onClick={() => setDrafts(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B8E84', padding: 0 }}>×</button>
              </div>
            ))}
          </div>
          <button onClick={saveAll} disabled={saving} style={primaryButtonStyle}>
            {saving ? 'Salvando...' : `Começar com ${drafts.length} ${drafts.length === 1 ? 'matéria' : 'matérias'}`}
          </button>
        </div>
      )}

      <h2 style={sectionTitleStyle}>Sugestões do currículo médico</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginBottom: '32px' }}>
        {SUGGESTED_SUBJECTS.filter(s => !drafts.some(d => d.name === s)).map((name, i) => (
          <button key={name} onClick={() => pickSuggested(name)} style={{
            backgroundColor: '#FFFFFF', border: '1px solid #E8DDD4', borderLeft: `4px solid ${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}`,
            borderRadius: '8px', padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
            fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.9375rem', color: '#1C1917',
          }}>
            {name}
          </button>
        ))}
      </div>

      <h2 style={sectionTitleStyle}>Matéria personalizada</h2>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={customName}
          onChange={e => setCustomName(e.target.value)}
          placeholder="Nome da matéria"
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          style={{ ...inputStyle, flex: 1, minWidth: '200px' }}
        />
        <div style={{ display: 'flex', gap: '6px' }}>
          {SUBJECT_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setSelectedColor(c)} style={{
              width: '24px', height: '24px', borderRadius: '50%', backgroundColor: c, border: selectedColor === c ? '2px solid #1C1917' : '2px solid transparent', cursor: 'pointer', padding: 0,
            }} />
          ))}
        </div>
        <button onClick={addCustom} style={primaryButtonStyle}>Adicionar</button>
      </div>
    </div>
  )
}

const displayStyle: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '2.25rem', fontWeight: 400, color: '#1C1917', margin: '0 0 8px',
}
const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.9375rem', fontWeight: 500, color: '#4A3F3A', margin: '0 0 12px',
}
const bodyStyle: React.CSSProperties = {
  fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.9375rem', color: '#4A3F3A', margin: 0,
}
const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 20px', backgroundColor: '#0B6E6A', color: '#FFFFFF', border: 'none', borderRadius: '8px',
  fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.9375rem', fontWeight: 500, cursor: 'pointer',
}
const ghostButtonStyle: React.CSSProperties = {
  background: 'none', border: '1px dashed #D4C8BC', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer',
  fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.8125rem', color: '#9B8E84',
}
const inputStyle: React.CSSProperties = {
  padding: '10px 12px', border: '1px solid #E8DDD4', borderRadius: '8px',
  fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.9375rem', color: '#1C1917', backgroundColor: '#FFFFFF', outline: 'none',
}
const backButtonStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', color: '#9B8E84',
  fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.9375rem', padding: 0, marginBottom: '16px',
}
