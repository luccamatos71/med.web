'use client'

import { useEffect, useRef, useState } from 'react'

interface SelectionFloaterProps {
  containerRef: React.RefObject<HTMLElement | null>
}

interface FloaterPosition {
  top: number
  left: number
}

export function SelectionFloater({ containerRef }: SelectionFloaterProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<FloaterPosition>({ top: 0, left: 0 })
  const [selectedText, setSelectedText] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function handleMouseUp() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const selection = window.getSelection()
        const text = selection?.toString().trim() ?? ''
        if (!text || !selection || selection.rangeCount === 0) {
          setVisible(false)
          return
        }
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setSelectedText(text)
        setPosition({
          top: rect.top - 40,
          left: rect.left + rect.width / 2 - 80,
        })
        setVisible(true)
      }, 150)
    }

    function handleMouseDown(e: MouseEvent) {
      // Hide floater unless clicking the floater button itself
      const target = e.target as HTMLElement
      if (target.closest('[data-selection-floater]')) return
      setVisible(false)
    }

    container.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      container.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousedown', handleMouseDown)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [containerRef])

  if (!visible) return null

  return (
    <button
      data-selection-floater="true"
      onClick={() => {
        console.log('Perguntar sobre isso:', selectedText)
        setVisible(false)
      }}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 100,
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
  )
}
