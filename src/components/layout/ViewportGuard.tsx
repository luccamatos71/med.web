'use client'

import { useEffect, useState } from 'react'

export function ViewportGuard({ children }: { children: React.ReactNode }) {
  const [isLandscapeReady, setIsLandscapeReady] = useState(true)

  useEffect(() => {
    function syncViewport() {
      setIsLandscapeReady(window.innerWidth >= 1024)
    }

    syncViewport()
    window.addEventListener('resize', syncViewport)
    window.addEventListener('orientationchange', syncViewport)

    return () => {
      window.removeEventListener('resize', syncViewport)
      window.removeEventListener('orientationchange', syncViewport)
    }
  }, [])

  if (!isLandscapeReady) {
    return (
      <div
        style={{
          minHeight: 'var(--app-vh)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: 'var(--base-canvas)',
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: '100%',
            backgroundColor: 'var(--base-surface)',
            border: '1px solid var(--base-edge)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-whisper)',
            padding: 24,
          }}
        >
          <h1
            style={{
              margin: '0 0 8px',
              fontFamily: 'var(--font-cormorant)',
              fontSize: '2rem',
              fontWeight: 400,
              color: 'var(--base-ink)',
            }}
          >
            Ana Space
          </h1>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              color: 'var(--base-ink-soft)',
            }}
          >
            Para estudar com o melhor conforto, abra em iPad na horizontal.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
