import { createClient } from './server'
import { supabaseAdmin } from './admin'

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

  // Dev bypass — no authenticated user; return first org via service role.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null

  const { data: firstOrg } = await supabaseAdmin
    .from('organisations')
    .select('id')
    .limit(1)
    .single()
  return firstOrg?.id ?? null
}
