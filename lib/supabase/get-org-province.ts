import { createClient } from './server'
import { getOrgId } from './get-org-id'

export async function getOrgProvince(): Promise<string | null> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return null

  const { data } = await supabase
    .from('organisations')
    .select('province')
    .eq('id', orgId)
    .single()

  return data?.province ?? null
}
