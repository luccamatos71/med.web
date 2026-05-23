'use client'

import { useEffect, useState } from 'react'

function ViewportMessage() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#F9F5F0',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontFamily: 'system-ui, sans-serif',
          fontSize: '1rem',
          color: '#4A3F3A',
          maxWidth: '320px',
          lineHeight: '1.6',
        }}
      >
        O .med é otimizado para iPad e telas ≥1024px. Por favor, use em um dispositivo maior.
      </p>
    </div>
  )
}

export function ViewportGuard({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [isTooSmall, setIsTooSmall] = useState(false)

  useEffect(() => {
    const check = () => setIsTooSmall(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    setIsReady(true)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!isReady) return null
  if (isTooSmall) return <ViewportMessage />
  return <>{children}</>
}
