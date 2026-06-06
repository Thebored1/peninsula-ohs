import { createClient } from './server'

/**
 * Returns the organisation_id for the current user.
 * When auth is disabled (dev mode), falls back to the first org in the database.
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

  // Dev bypass — no authenticated user, use first available org
  const { data: firstOrg } = await supabase
    .from('organisations')
    .select('id')
    .limit(1)
    .single()
  return firstOrg?.id ?? null
}
