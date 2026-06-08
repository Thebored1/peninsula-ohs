import { type NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { validateSuperAdminSession, logSuperAdminAction } from '@/lib/super-admin/session'

export async function POST(request: NextRequest) {
  // 1. Validate super admin session
  const token = request.cookies.get('peninsula_sa_token')?.value
  const admin = token ? await validateSuperAdminSession(token) : null
  if (!admin) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { orgId?: string; orgName?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { orgId, orgName } = body
  if (!orgId) return NextResponse.json({ error: 'orgId is required' }, { status: 400 })

  // 2. Find an active admin user for this org
  const { data: adminUser } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email')
    .eq('organisation_id', orgId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!adminUser) {
    return NextResponse.json({ error: 'No active users found for this organisation' }, { status: 404 })
  }

  // 3. Generate a magic link (bypasses email — we use the action_link directly)
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: adminUser.email,
    options: { redirectTo: '/dashboard' },
  })

  if (linkError || !linkData) {
    return NextResponse.json({ error: linkError?.message ?? 'Failed to generate session' }, { status: 500 })
  }

  // 4. Log the impersonation
  const ip = request.headers.get('x-forwarded-for') ?? null
  const ua = request.headers.get('user-agent') ?? null
  await logSuperAdminAction(admin.id, 'impersonate', orgId, orgName ?? null, ip, ua)

  // 5. Set impersonation metadata cookie and return the magic link URL
  //    The client will navigate to the action_link which completes the sign-in
  const response = NextResponse.json({
    ok: true,
    actionLink: linkData.properties.action_link,
  })

  response.cookies.set('peninsula_impersonating', JSON.stringify({
    orgId,
    orgName: orgName ?? 'Unknown',
  }), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 3600,
  })

  return response
}
