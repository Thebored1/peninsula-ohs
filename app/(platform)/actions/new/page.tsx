import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ActionForm from './ActionForm'

export default async function NewActionPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name')
    .eq('organisation_id', profile.organisation_id)
    .eq('is_active', true)
    .order('first_name', { ascending: true })

  return <ActionForm users={users ?? []} />
}
