import type { Metadata } from "next"
import * as Sentry from "@sentry/nextjs"
import "./globals.css"

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  })
}

export const metadata: Metadata = {
  title: ".med",
  description: "Plataforma de estudos em medicina",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
