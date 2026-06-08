import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingWizard from './OnboardingWizard'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile) redirect('/register')

  // If org already has a site, onboarding is complete
  const { count: siteCount } = await supabase
    .from('sites')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', profile.organisation_id)

  if ((siteCount ?? 0) > 0) redirect('/dashboard')

  // Load roles for invite step
  const { data: roles } = await supabase
    .from('roles')
    .select('id, name')
    .or('is_system_role.eq.true,organisation_id.eq.' + profile.organisation_id)
    .order('name')

  return <OnboardingWizard roles={roles ?? []} />
}
