import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/shell/AppShell'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id, first_name, last_name, email')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/register')

  // Hard-block: redirect to onboarding until setup is complete
  const { data: org } = await supabase
    .from('organisations')
    .select('onboarding_completed_at')
    .eq('id', profile.organisation_id)
    .single()

  if (!org?.onboarding_completed_at) redirect('/onboarding')

  // Detect active impersonation session (set by super admin panel)
  const cookieStore = await cookies()
  const impersonatingCookie = cookieStore.get('exxio_impersonating')?.value
  let impersonating: { orgName: string } | null = null
  if (impersonatingCookie) {
    try {
      impersonating = JSON.parse(impersonatingCookie)
    } catch {
      // malformed cookie — ignore
    }
  }

  return (
    <AppShell
      userEmail={profile.email ?? user.email ?? ''}
      impersonating={impersonating}
    >
      {children}
    </AppShell>
  )
}
