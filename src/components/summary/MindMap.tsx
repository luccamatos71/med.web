'use client'

import { useEffect, useRef } from 'react'

// Brand palette cycled by depth (teal family + amber/sage accents).
const COLORS = ['#0B6E6A', '#2EA39E', '#D97706', '#2E7D52', '#5DB8B2']

/**
 * Interactive mind map rendered from markdown via markmap.
 * markmap-lib/markmap-view are browser-only (d3), so they're imported lazily
 * inside the effect to keep SSR/build safe.
 */
export function MindMap({ markdown }: { markdown: string }) {
  const svgRef = useRef<SVGSVGElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mmRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { Transformer } = await import('markmap-lib')
      const { Markmap } = await import('markmap-view')
      if (cancelled || !svgRef.current) return

      const transformer = new Transformer()
      const { root } = transformer.transform(markdown?.trim() || '# Mapa mental')

      if (!mmRef.current) {
        mmRef.current = Markmap.create(
          svgRef.current,
          {
            duration: 300,
            paddingX: 16,
            spacingVertical: 8,
            spacingHorizontal: 80,
            color: (node: { state?: { depth?: number } }) =>
              COLORS[(node.state?.depth ?? 0) % COLORS.length],
          },
          root
        )
      } else {
        mmRef.current.setData(root)
      }
      mmRef.current.fit()
    })()

    return () => {
      cancelled = true
    }
  }, [markdown])

  useEffect(() => {
    return () => {
      if (mmRef.current) {
        mmRef.current.destroy?.()
        mmRef.current = null
      }
    }
  }, [])

  return (
    <svg
      ref={svgRef}
      style={{
        width: '100%',
        height: '72vh',
        fontFamily: 'var(--font-ui)',
      }}
    />
  )
}
