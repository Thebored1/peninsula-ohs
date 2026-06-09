import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Theme } from '@carbon/react'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/register')

  return (
    <Theme theme="white">
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f4f4f4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '2rem 1rem',
      }}>
        <div style={{ width: '100%', maxWidth: '640px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '40px', height: '40px', backgroundColor: '#0f62fe', borderRadius: '2px',
              margin: '0 auto 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#161616' }}>
              Set up Lumis
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#525252', marginTop: '0.25rem' }}>
              Let's get your workspace ready
            </p>
          </div>
          {children}
        </div>
      </div>
    </Theme>
  )
}
