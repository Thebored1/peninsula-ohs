import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Breadcrumb, BreadcrumbItem, Tile } from '@carbon/react'
import { NewButton } from '@/components/ui/NewButton'
import { SignOutButton } from './SignOutButton'

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function durationLabel(signIn: string, signOut: string | null): string {
  if (!signOut) return 'On site'
  const diffMs = new Date(signOut).getTime() - new Date(signIn).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`
}

export default async function AccessLogPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const { data: logs } = await supabase
    .from('contractor_site_access_log')
    .select(`
      id, sign_in_at, sign_out_at, purpose,
      contractor_workers(id, first_name, last_name, contractor_id,
        contractor_companies(company_name)
      ),
      sites(name)
    `)
    .eq('organisation_id', orgId)
    .order('sign_in_at', { ascending: false })
    .limit(200)

  const onSiteCount = (logs ?? []).filter((l) => !l.sign_out_at).length

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/contractors">Contractors</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Site Access Log</BreadcrumbItem>
      </Breadcrumb>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Site Access Log
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            Contractor worker sign-in and sign-out records
          </p>
        </div>
        <NewButton href="/contractors/sign-in" label="Sign In Contractor" />
      </div>

      {/* Stat tile — currently on site */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Tile
          style={{
            display: 'inline-block',
            padding: '1rem 1.5rem',
            minWidth: '180px',
            borderLeft: `4px solid ${onSiteCount > 0 ? '#24a148' : '#e0e0e0'}`,
          }}
        >
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Currently On Site
          </p>
          <p
            style={{
              fontSize: '2rem',
              fontWeight: 300,
              color: onSiteCount > 0 ? '#24a148' : '#161616',
              lineHeight: 1,
            }}
          >
            {onSiteCount}
          </p>
        </Tile>
      </div>

      <Tile style={{ padding: 0 }}>
        {!logs || logs.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No site access entries recorded
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e0e0e0', background: '#f4f4f4' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#161616' }}>Worker</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#161616' }}>Company</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#161616' }}>Site</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#161616' }}>Sign In</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#161616' }}>Sign Out</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#161616' }}>Duration</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#161616' }}>Purpose</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#161616' }}></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const workerRaw = log.contractor_workers
                  const worker = Array.isArray(workerRaw) ? workerRaw[0] : workerRaw
                  const companyRaw = worker?.contractor_companies
                  const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw
                  const siteRaw = log.sites
                  const site = Array.isArray(siteRaw) ? siteRaw[0] : siteRaw
                  const isOnSite = !log.sign_out_at

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid #e0e0e0',
                        backgroundColor: isOnSite ? '#defbe6' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '0.75rem 1rem', color: '#161616' }}>
                        {worker ? `${worker.first_name} ${worker.last_name}` : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#161616' }}>
                        {company ? (
                          <a
                            href={`/contractors/${worker?.contractor_id}`}
                            style={{ color: '#0f62fe', textDecoration: 'none' }}
                          >
                            {company.company_name}
                          </a>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#161616' }}>
                        {site?.name ?? '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#161616' }}>
                        {formatDateTime(log.sign_in_at)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#161616' }}>
                        {isOnSite ? (
                          <span style={{ color: '#24a148', fontWeight: 600 }}>On site</span>
                        ) : formatDateTime(log.sign_out_at)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#525252' }}>
                        {durationLabel(log.sign_in_at, log.sign_out_at)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#525252' }}>
                        {log.purpose ?? '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isOnSite && <SignOutButton accessLogId={log.id} />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tile>
    </div>
  )
}
