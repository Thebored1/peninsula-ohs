import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { validateSuperAdminSession } from '@/lib/super-admin/session'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const { pathname } = request.nextUrl
  const isPublicAsset = pathname.startsWith('/_next') || pathname.includes('.')

  if (isPublicAsset) return supabaseResponse

  // ── Super admin routes (/admin/*) ────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return supabaseResponse
    const saToken = request.cookies.get('exxio_sa_token')?.value
    if (!saToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    const admin = await validateSuperAdminSession(saToken)
    if (!admin) {
      const response = NextResponse.redirect(new URL('/admin/login', request.url))
      response.cookies.delete('exxio_sa_token')
      return response
    }
    return supabaseResponse
  }

  // ── Platform routes — Supabase auth ──────────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/auth')

  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
