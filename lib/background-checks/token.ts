import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function generateConsentToken(packageId: string, expiresInHours = 72): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + expiresInHours * 3_600_000).toISOString()

  const admin = getAdminClient()
  const { error } = await admin.from('bgc_consent_tokens').insert({
    package_id: packageId,
    token_hash:  tokenHash,
    expires_at:  expiresAt,
  })
  if (error) throw new Error(`Failed to store consent token: ${error.message}`)

  return token
}

export async function verifyConsentToken(token: string): Promise<string | null> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const admin = getAdminClient()

  const { data } = await admin
    .from('bgc_consent_tokens')
    .select('package_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .single()

  if (!data) return null
  if (data.used_at) return null
  if (new Date(data.expires_at) < new Date()) return null

  return data.package_id as string
}

export async function markConsentTokenUsed(token: string, usedIp: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const admin = getAdminClient()
  await admin
    .from('bgc_consent_tokens')
    .update({ used_at: new Date().toISOString(), used_ip: usedIp })
    .eq('token_hash', tokenHash)
}

export async function generateReferenceToken(requestId: string, expiresInDays = 14): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString()

  const admin = getAdminClient()
  await admin
    .from('bgc_reference_requests')
    .update({ token_hash: tokenHash, expires_at: expiresAt, status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', requestId)

  return token
}

export async function verifyReferenceToken(token: string): Promise<string | null> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const admin = getAdminClient()

  const { data } = await admin
    .from('bgc_reference_requests')
    .select('id, expires_at, status')
    .eq('token_hash', tokenHash)
    .single()

  if (!data) return null
  if (data.status === 'completed' || data.status === 'declined') return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  return data.id as string
}
