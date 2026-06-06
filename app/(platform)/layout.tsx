import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/shell/AppShell'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  // AUTH TEMPORARILY DISABLED — re-enable before going to production
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) redirect('/login')
  // const { data: profile } = await supabase.from('user_profiles').select('id').eq('id', user.id).maybeSingle()
  // if (!profile) redirect('/register')

  return (
    <AppShell userEmail="dev@local">
      {children}
    </AppShell>
  )
}
