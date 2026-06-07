import type { Metadata, Viewport } from "next"
import * as Sentry from "@sentry/nextjs"
import { Cormorant_Garamond, Lora, DM_Sans } from 'next/font/google'
import { NavSidebar } from '@/components/layout/NavSidebar'
import { ViewportGuard } from '@/components/layout/ViewportGuard'
import { SessionProvider } from '@/components/providers/SessionProvider'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import "./globals.css"

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  })
}

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Ana Space",
  description: "Plataforma de estudos em medicina",
  applicationName: 'Ana Space',
  appleWebApp: {
    capable: true,
    title: 'Ana Space',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F9F5F0',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${lora.variable} ${dmSans.variable}`}>
      <body style={{ margin: 0 }}>
        <SessionProvider>
          <ViewportGuard>
            <div style={{ display: 'flex', minHeight: 'var(--app-vh)' }}>
              <NavSidebar />
              <main style={{ marginLeft: '64px', flex: 1, minHeight: 'var(--app-vh)', backgroundColor: '#F9F5F0' }}>
                {children}
              </main>
            </div>
          </ViewportGuard>
        </SessionProvider>
      </body>
    </html>
  )
}
