import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Grid, Column, Tile, Tag } from '@carbon/react'
import { NewButton } from '@/components/ui/NewButton'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const TYPE_COLORS: Record<string, 'blue' | 'teal' | 'purple' | 'magenta' | 'cyan' | 'green' | 'gray'> = {
  incident: 'blue',
  risk: 'magenta',
  action: 'teal',
  inspection: 'cyan',
  audit: 'purple',
  chemical: 'green',
  asset: 'gray',
  environmental: 'teal',
  custom: 'gray',
}

export default async function ReportBuilderPage() {
  const supabase = await createClient()

  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p style={{ color: '#6f6f6f' }}>No organisation found.</p></div>

  const { data: reports } = await supabase
    .from('report_definitions')
    .select('id, name, description, report_type, is_active, created_at')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
                Report Builder
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#525252' }}>
                Create and manage custom report definitions
              </p>
            </div>
            <NewButton href="/reports/builder/new" label="New Report" />
          </div>
        </Column>

        <Column sm={4} md={8} lg={16}>
          {(reports ?? []).length === 0 ? (
            <Tile style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1rem', color: '#525252', marginBottom: '0.5rem' }}>No reports defined yet</p>
              <p style={{ fontSize: '0.875rem', color: '#6f6f6f', marginBottom: '1.5rem' }}>
                Create your first report to start analysing your OHS data.
              </p>
              <NewButton href="/reports/builder/new" label="Create Report" />
            </Tile>
          ) : (
            <Grid condensed>
              {reports!.map((report) => (
                <Column key={report.id} sm={4} md={4} lg={4}>
                  <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      {report.report_type && (
                        <Tag
                          type={TYPE_COLORS[report.report_type] ?? 'gray'}
                          size="sm"
                        >
                          {report.report_type}
                        </Tag>
                      )}
                      {!report.is_active && (
                        <Tag type="gray" size="sm">Inactive</Tag>
                      )}
                    </div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.25rem' }}>
                      {report.name}
                    </p>
                    {report.description && (
                      <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.5rem' }}>
                        {report.description}
                      </p>
                    )}
                    <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                      Created {formatDate(report.created_at)}
                    </p>
                  </Tile>
                </Column>
              ))}
            </Grid>
          )}
        </Column>
      </Grid>
    </div>
  )
}
