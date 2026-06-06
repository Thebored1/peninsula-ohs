import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Grid, Column, Tile, InlineNotification } from '@carbon/react'
import { DocumentSettingsForm } from './DocumentSettingsForm'

export default async function DocumentSettingsPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data: org } = orgId
    ? await supabase
        .from('organisations')
        .select('id, name, required_signature_method')
        .eq('id', orgId)
        .single()
    : { data: null }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 400,
            color: '#161616',
            marginBottom: '0.25rem',
          }}
        >
          Document Settings
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#525252' }}>
          Configure e-signature and document behaviour for your organisation
        </p>
      </div>

      {!org ? (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle="Could not load organisation settings."
          lowContrast
        />
      ) : (
        <Grid condensed>
          <Column sm={4} md={8} lg={8}>
            <Tile style={{ padding: 0 }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  E-Signature Settings
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <DocumentSettingsForm
                  orgId={org.id}
                  currentMethod={org.required_signature_method ?? 'either'}
                />
              </div>
            </Tile>
          </Column>
        </Grid>
      )}
    </div>
  )
}
