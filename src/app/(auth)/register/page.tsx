'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.detail === 'Email already registered' ? 'Email já cadastrado.' : 'Erro ao criar conta.')
      return
    }

    router.push('/login')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E8DDD4',
    borderRadius: '8px',
    fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
    fontSize: '0.9375rem',
    color: '#1C1917',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'var(--app-vh)', backgroundColor: '#F9F5F0', padding: 'max(24px, var(--safe-top)) max(24px, var(--safe-right)) max(24px, var(--safe-bottom)) max(24px, var(--safe-left))' }}>
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '48px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 12px rgba(28,25,23,0.10)' }}>
        <h1 style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', fontSize: '2.25rem', fontWeight: 400, color: '#1C1917', margin: '0 0 8px 0' }}>
          Ana Space
        </h1>
        <p style={{ fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)', fontSize: '0.875rem', color: '#9B8E84', margin: '0 0 32px 0' }}>
          Crie sua conta
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="email" style={{ display: 'block', fontSize: '0.8125rem', color: '#4A3F3A', marginBottom: '6px', fontWeight: 500 }}>
              Email
            </label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" style={inputStyle} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="password" style={{ display: 'block', fontSize: '0.8125rem', color: '#4A3F3A', marginBottom: '6px', fontWeight: 500 }}>
              Senha
            </label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" style={inputStyle} />
          </div>

          {error && <p style={{ fontSize: '0.8125rem', color: '#9B2226', marginBottom: '16px' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px', backgroundColor: loading ? '#D4C8BC' : '#0B6E6A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.9375rem', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Criando...' : 'Criar conta'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: '#9B8E84' }}>
          Já tem conta?{' '}
          <a href="/login" style={{ color: '#0B6E6A', textDecoration: 'none', fontWeight: 500 }}>Entrar</a>
        </p>
      </div>
    </div>
  )
}
