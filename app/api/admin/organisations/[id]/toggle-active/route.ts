import { type NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { validateSuperAdminSession, logSuperAdminAction } from '@/lib/super-admin/session'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get('peninsula_sa_token')?.value
  const admin = token ? await validateSuperAdminSession(token) : null
  if (!admin) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params

  const { data: org } = await supabaseAdmin
    .from('organisations')
    .select('id, name, is_active')
    .eq('id', id)
    .maybeSingle()

  if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('organisations')
    .update({ is_active: !org.is_active })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ip = request.headers.get('x-forwarded-for') ?? null
  const ua = request.headers.get('user-agent') ?? null
  await logSuperAdminAction(
    admin.id,
    org.is_active ? 'suspend_org' : 'activate_org',
    id,
    org.name,
    ip,
    ua,
  )

  return NextResponse.json({ ok: true, isActive: !org.is_active })
}
