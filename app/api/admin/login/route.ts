import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createSuperAdminSession } from '@/lib/super-admin/session'

export async function POST(request: Request) {
  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  // Dynamically import bcryptjs (pure JS, no native bindings)
  const bcrypt = await import('bcryptjs')

  const { data: admin } = await supabaseAdmin
    .from('super_admins')
    .select('id, email, password_hash, display_name, is_active')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (!admin || !admin.is_active) {
    // Constant-time response even on not-found
    await bcrypt.compare('dummy', '$2b$12$invalidhashpadding000000000000000000000000000000000000000')
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, admin.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
  const userAgent = request.headers.get('user-agent') ?? null

  const token = await createSuperAdminSession(admin.id, ip, userAgent)

  const response = NextResponse.json({ ok: true })
  response.cookies.set('peninsula_sa_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 4 * 60 * 60, // 4 hours
  })

  return response
}
