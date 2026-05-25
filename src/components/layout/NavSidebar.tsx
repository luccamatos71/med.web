'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LayoutDashboard, BookOpen, HelpCircle, LogOut } from 'lucide-react'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/subjects', icon: BookOpen, label: 'Matérias' },
  { href: '/duvidas', icon: HelpCircle, label: 'Dúvidas' },
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
        height: '100vh',
        backgroundColor: '#0B4F4B',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '16px',
        paddingBottom: '16px',
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

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Logout */}
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
