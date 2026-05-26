'use client'

import { useEffect, useRef, useState } from 'react'

interface SelectionFloaterProps {
  containerRef: React.RefObject<HTMLElement | null>
  onAskAbout?: (text: string) => void
  onSaveDoubt?: (text: string) => void
}

interface FloaterPosition {
  top: number
  left: number
}

export function SelectionFloater({ containerRef, onAskAbout, onSaveDoubt }: SelectionFloaterProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<FloaterPosition>({ top: 0, left: 0 })
  const [selectedText, setSelectedText] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function updateFromSelection() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const selection = window.getSelection()
        const text = selection?.toString().trim() ?? ''
        if (!text || !selection || selection.rangeCount === 0) {
          setVisible(false)
          return
        }

        const range = selection.getRangeAt(0)
        const commonNode = range.commonAncestorContainer
        const liveContainer = containerRef.current
        if (!liveContainer || !liveContainer.contains(commonNode)) {
          setVisible(false)
          return
        }

        const rect = range.getBoundingClientRect()
        if (rect.width === 0 && rect.height === 0) {
          setVisible(false)
          return
        }

        const centeredLeft = rect.left + rect.width / 2
        setSelectedText(text)
        setPosition({
          top: Math.max(8, rect.top - 52),
          left: Math.max(24, Math.min(window.innerWidth - 24, centeredLeft)),
        })
        setVisible(true)
      }, 150)
    }

    function hideIfOutside(e: Event) {
      // Hide floater unless clicking the floater button itself
      const target = e.target
      if (target instanceof Element && target.closest('[data-selection-floater]')) return
      setVisible(false)
    }

    container.addEventListener('mouseup', updateFromSelection)
    container.addEventListener('touchend', updateFromSelection)
    document.addEventListener('selectionchange', updateFromSelection)
    document.addEventListener('mousedown', hideIfOutside)
    document.addEventListener('touchstart', hideIfOutside, { passive: true })

    return () => {
      container.removeEventListener('mouseup', updateFromSelection)
      container.removeEventListener('touchend', updateFromSelection)
      document.removeEventListener('selectionchange', updateFromSelection)
      document.removeEventListener('mousedown', hideIfOutside)
      document.removeEventListener('touchstart', hideIfOutside)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [containerRef])

  if (!visible) return null

  return (
    <div
      data-selection-floater="true"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        gap: 6,
      }}
    >
      <button
        onClick={() => {
          onAskAbout?.(selectedText)
          setVisible(false)
        }}
        style={{
          background: 'var(--teal-strong)',
          color: 'white',
          fontFamily: 'var(--font-ui)',
          fontSize: '0.8125rem',
          padding: '6px 12px',
          borderRadius: 'var(--radius-m)',
          border: 'none',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(28,25,23,0.15)',
        }}
      >
        Perguntar sobre isso
      </button>
      <button
        onClick={() => {
          onSaveDoubt?.(selectedText)
          setVisible(false)
        }}
        style={{
          background: '#fff',
          color: 'var(--teal-strong)',
          fontFamily: 'var(--font-ui)',
          fontSize: '0.8125rem',
          padding: '6px 12px',
          borderRadius: 'var(--radius-m)',
          border: '1px solid var(--base-edge)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(28,25,23,0.15)',
        }}
      >
        Salvar como dúvida
      </button>
    </div>
  )
}
