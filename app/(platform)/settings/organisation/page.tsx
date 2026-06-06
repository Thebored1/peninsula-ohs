import { createClient } from '@/lib/supabase/server'
import { Grid, Column, Tile, Button, InlineNotification } from '@carbon/react'
import { OrgForm } from './OrgForm'
import { updateOrganisation } from '@/app/actions/settings'

export default async function OrganisationSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let orgId: string | null = null
  if (user) {
    const { data: profile } = await supabase.from('user_profiles').select('organisation_id').eq('id', user.id).single()
    orgId = profile?.organisation_id ?? null
  } else {
    const { data: firstOrg } = await supabase.from('organisations').select('id').limit(1).single()
    orgId = firstOrg?.id ?? null
  }

  const { data: org } = orgId
    ? await supabase
        .from('organisations')
        .select('id, name, industry, timezone, contact_email, contact_phone, subscription_plan, created_at')
        .eq('id', orgId)
        .single()
    : { data: null }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
          Organisation
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#525252' }}>General settings for your organisation</p>
      </div>

      {!org ? (
        <InlineNotification kind="error" title="Error" subtitle="Could not load organisation data." lowContrast />
      ) : (
        <Grid condensed>
          <Column sm={4} md={8} lg={8}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Organisation Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <OrgForm org={org} action={updateOrganisation} />
              </div>
            </Tile>
          </Column>
          <Column sm={4} md={4} lg={4}>
            <Tile style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                Subscription Plan
              </p>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>
                {org.subscription_plan ? org.subscription_plan.charAt(0).toUpperCase() + org.subscription_plan.slice(1) : 'Trial'}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                Organisation ID
              </p>
              <p style={{ fontSize: '0.75rem', color: '#525252', fontFamily: 'monospace' }}>
                {org.id}
              </p>
            </Tile>
          </Column>
        </Grid>
      )}
    </div>
  )
}
