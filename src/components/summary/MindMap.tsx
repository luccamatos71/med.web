'use client'

import { useEffect, useRef } from 'react'

// Vibrant brand-aligned palette; each main branch gets its own colour.
const COLORS = ['#0B6E6A', '#2E7D52', '#5B4B8A', '#9B2226', '#B8862E', '#2EA39E']

/**
 * Interactive mind map rendered from markdown via markmap.
 * markmap-lib/markmap-view are browser-only (d3), imported lazily to keep
 * SSR/build safe.
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
            duration: 350,
            paddingX: 20,
            spacingVertical: 14,
            spacingHorizontal: 100,
            fitRatio: 0.92,
            maxWidth: 260,
            initialExpandLevel: -1,
            // Colour by the top-level branch so each branch keeps one colour.
            color: (node: { state?: { path?: string; depth?: number } }) => {
              const segs = (node.state?.path ?? '0').split('.')
              const branchKey = segs.slice(0, 2).join('.')
              let hash = 0
              for (let i = 0; i < branchKey.length; i += 1) hash = (hash * 31 + branchKey.charCodeAt(i)) | 0
              return COLORS[Math.abs(hash) % COLORS.length]
            },
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
        height: '74vh',
        fontFamily: 'var(--font-ui)',
        fontSize: 15,
        backgroundColor: 'var(--base-surface)',
      }}
    />
  )
}
