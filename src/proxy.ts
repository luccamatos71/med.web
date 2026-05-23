import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default withAuth(
  function proxy(req: NextRequest) {
    // HTTPS redirect in production
    if (
      process.env.NODE_ENV === 'production' &&
      req.headers.get('x-forwarded-proto') === 'http'
    ) {
      const url = req.nextUrl.clone()
      url.protocol = 'https'
      return NextResponse.redirect(url)
    }
  },
  {
    pages: { signIn: '/login' },
  }
)

export const config = {
  matcher: [
    '/((?!login|api/auth|_next/static|_next/image|favicon\\.ico).*)',
  ],
}
