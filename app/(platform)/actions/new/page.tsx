import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import ActionForm from './ActionForm'

export default async function NewActionPage() {
  const orgId = await getOrgId()
  if (!orgId) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: '#6f6f6f' }}>No organisation found.</p>
      </div>
    )
  }

  const supabase = await createClient()

  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name')
    .eq('organisation_id', orgId)
    .eq('is_active', true)
    .order('first_name', { ascending: true })

  return <ActionForm users={users ?? []} />
}
