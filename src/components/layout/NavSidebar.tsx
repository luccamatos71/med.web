'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LayoutDashboard, BookOpen, HelpCircle, Layers3, Repeat2, Sparkles, GraduationCap, CalendarDays, LogOut } from 'lucide-react'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/assistente', icon: Sparkles, label: 'Assistente' },
  { href: '/subjects', icon: BookOpen, label: 'Materias' },
  { href: '/duvidas', icon: HelpCircle, label: 'Duvidas' },
  { href: '/flashcards', icon: Layers3, label: 'Flashcards' },
  { href: '/review', icon: Repeat2, label: 'Revisao' },
  { href: '/prova', icon: GraduationCap, label: 'Prova' },
  { href: '/cronograma', icon: CalendarDays, label: 'Cronograma' },
]

export function NavSidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '64px',
        height: 'var(--app-vh)',
        backgroundColor: '#0B4F4B',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 'max(16px, var(--safe-top))',
        paddingBottom: 'max(16px, var(--safe-bottom))',
      }}
    >
      {navItems.map(({ href, icon: Icon, label }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            title={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              minHeight: '44px',
              borderLeft: active ? '3px solid #5DB8B2' : '3px solid transparent',
              color: active ? '#5DB8B2' : 'rgba(255,255,255,0.45)',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            <Icon size={22} strokeWidth={1.25} />
          </Link>
        )
      })}

      <div style={{ flex: 1 }} />

      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        aria-label="Sair"
        title="Sair"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          minHeight: '44px',
          borderLeft: '3px solid transparent',
          borderTop: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          color: 'rgba(255,255,255,0.45)',
          background: 'none',
          cursor: 'pointer',
          transition: 'color 0.15s',
        }}
      >
        <LogOut size={22} strokeWidth={1.25} />
      </button>
    </nav>
  )
}
