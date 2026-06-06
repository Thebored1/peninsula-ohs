import { createClient } from './server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Returns the organisation_id for the current user.
 * When auth is disabled (dev mode), uses the service role key to bypass RLS
 * and returns the first available organisation.
 */
export async function getOrgId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organisation_id')
      .eq('id', user.id)
      .single()
    return profile?.organisation_id ?? null
  }

  // Dev bypass — no authenticated user.
  // Use service role key to bypass RLS and return the first org.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !supabaseUrl) return null

  const admin = createSupabaseClient(supabaseUrl, serviceKey)
  const { data: firstOrg } = await admin
    .from('organisations')
    .select('id')
    .limit(1)
    .single()
  return firstOrg?.id ?? null
}
