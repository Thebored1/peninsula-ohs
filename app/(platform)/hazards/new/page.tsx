import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import HazardForm from './HazardForm'

export default async function NewHazardPage() {
  const orgId = await getOrgId()
  let workers: { id: string; first_name: string; last_name: string }[] = []

  if (orgId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name')
      .eq('organisation_id', orgId)
      .eq('is_active', true)
      .order('first_name', { ascending: true })
    workers = data ?? []
  }

  return <HazardForm workers={workers} />
}
