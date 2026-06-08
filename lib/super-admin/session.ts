import { supabaseAdmin } from '@/lib/supabase/admin'

const SESSION_TTL_HOURS = 4

interface SuperAdmin {
  id: string
  email: string
  display_name: string
  is_active: boolean
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function randomToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function createSuperAdminSession(
  adminId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<string> {
  const token = randomToken()
  const tokenHash = await hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString()

  const { error } = await supabaseAdmin.from('super_admin_sessions').insert({
    super_admin_id: adminId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    ip_address: ip,
    user_agent: userAgent,
  })

  if (error) throw new Error(`Failed to create session: ${error.message}`)

  // Update last_login_at
  await supabaseAdmin
    .from('super_admins')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', adminId)

  return token
}

export async function validateSuperAdminSession(token: string): Promise<SuperAdmin | null> {
  const tokenHash = await hashToken(token)

  const { data: session } = await supabaseAdmin
    .from('super_admin_sessions')
    .select('super_admin_id, expires_at')
    .eq('token_hash', tokenHash)
    .single()

  if (!session) return null
  if (new Date(session.expires_at) < new Date()) {
    // Clean up expired session
    await supabaseAdmin.from('super_admin_sessions').delete().eq('token_hash', tokenHash)
    return null
  }

  const { data: admin } = await supabaseAdmin
    .from('super_admins')
    .select('id, email, display_name, is_active')
    .eq('id', session.super_admin_id)
    .single()

  if (!admin || !admin.is_active) return null
  return admin
}

export async function deleteSuperAdminSession(token: string): Promise<void> {
  const tokenHash = await hashToken(token)
  await supabaseAdmin.from('super_admin_sessions').delete().eq('token_hash', tokenHash)
}

export async function logSuperAdminAction(
  superAdminId: string,
  action: string,
  targetOrgId: string | null,
  targetOrgName: string | null,
  ip: string | null,
  userAgent: string | null,
): Promise<void> {
  await supabaseAdmin.from('super_admin_audit_log').insert({
    super_admin_id: superAdminId,
    action,
    target_org_id: targetOrgId,
    target_org_name: targetOrgName,
    ip_address: ip,
    user_agent: userAgent,
  })
}
