import { sign } from 'jsonwebtoken'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
              cache: 'no-store',
            }
          )
          if (!res.ok) return null
          const data = await res.json() as { user_id: string; email: string }
          return { id: data.user_id, email: data.email }
        } catch {
          return null
        }
      },
    }),
  ],

  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.accessToken = sign(
          { sub: user.id, email: user.email },
          process.env.NEXTAUTH_SECRET!,
          { algorithm: 'HS256', expiresIn: '30d' }
        )
      }
      return token
    },
    async session({ session, token }) {
      session.userId = token.userId as string
      session.accessToken = token.accessToken as string
      return session
    },
  },

  pages: { signIn: '/login' },
}
