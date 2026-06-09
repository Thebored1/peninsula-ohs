import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile, Tag, InlineNotification } from '@carbon/react'
import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
} from '@carbon/react'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', { day: 'numeric', month: 'short', year: 'numeric' })
}

const CHECK_TYPE_LABELS: Record<string, string> = {
  identity: 'Identity',
  criminal_standard: 'Criminal (Standard)',
  criminal_vulnerable_sector: 'Criminal (Vulnerable Sector)',
  drivers_abstract: "Driver's Abstract",
  employment_history: 'Employment History',
  education_credential: 'Education Credential',
  professional_licence: 'Professional Licence',
  reference_check: 'Reference Check',
  credit_check: 'Credit Check',
}

const REQUIREMENT_COLOURS: Record<string, 'green' | 'blue' | 'gray'> = {
  required: 'green',
  optional: 'blue',
  not_applicable: 'gray',
}

export default async function BgcSettingsPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const [
    { data: allProviders },
    { data: orgProviders },
    { data: roleRequirements },
    { data: reverificationSchedules },
    { data: consentTemplates },
    { data: referenceTemplates },
  ] = await Promise.all([
    supabase.from('bgc_providers').select('code, name, description, website_url, supported_checks, is_active').order('name'),
    supabase.from('bgc_organisation_providers')
      .select('id, provider_code, is_active, tested_at, test_passed, updated_at')
      .eq('organisation_id', orgId),
    supabase.from('bgc_role_requirements')
      .select('id, position_title, employment_type, check_type, requirement_level, is_sensitive_role, notes')
      .eq('organisation_id', orgId)
      .order('position_title'),
    supabase.from('bgc_reverification_schedules')
      .select('id, position_title, check_type, interval_months, is_active')
      .eq('organisation_id', orgId)
      .order('position_title'),
    supabase.from('bgc_consent_templates')
      .select('id, version, name, is_locked, is_active, created_at, applies_to_checks')
      .or(`organisation_id.eq.${orgId},organisation_id.is.null`)
      .eq('is_active', true)
      .order('created_at'),
    supabase.from('bgc_reference_templates')
      .select('id, name, role_scope, is_active, created_at')
      .or(`organisation_id.eq.${orgId},organisation_id.is.null`)
      .eq('is_active', true)
      .order('created_at'),
  ])

  const connectedCodes = new Set((orgProviders ?? []).map(op => op.provider_code))

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
          Background Check Settings
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#525252' }}>
          Configure providers, role requirements, and re-verification schedules
        </p>
      </div>

      {/* ── PROVIDERS ── */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>
        Background Check Providers
      </h2>
      <InlineNotification
        kind="info"
        title="Provider credentials"
        subtitle="To connect a provider, enter your API key and webhook secret in your environment variables (BGC_CERTN_API_KEY, BGC_CERTN_WEBHOOK_SECRET) and contact support to activate."
        style={{ marginBottom: '1rem', maxWidth: '100%' }}
        lowContrast
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {(allProviders ?? []).map(provider => {
          const orgProvider = (orgProviders ?? []).find(op => op.provider_code === provider.code)
          const isConnected = !!orgProvider?.is_active
          const testStatus = orgProvider?.test_passed === true ? 'passed' : orgProvider?.test_passed === false ? 'failed' : null
          return (
            <Tile key={provider.code} style={{ padding: '1.25rem', opacity: provider.code === 'stub' ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#161616' }}>{provider.name}</p>
                <Tag
                  type={isConnected ? 'green' : 'gray'}
                  size="sm"
                >
                  {isConnected ? 'Connected' : 'Not connected'}
                </Tag>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#525252', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                {provider.description}
              </p>
              {provider.supported_checks && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '0.75rem' }}>
                  {(provider.supported_checks as string[]).map(ct => (
                    <span
                      key={ct}
                      style={{
                        fontSize: '0.6875rem',
                        padding: '1px 6px',
                        background: '#f4f4f4',
                        border: '1px solid #e0e0e0',
                        borderRadius: 2,
                        color: '#525252',
                        fontFamily: 'monospace',
                      }}
                    >
                      {ct}
                    </span>
                  ))}
                </div>
              )}
              {testStatus && (
                <p style={{ fontSize: '0.75rem', color: testStatus === 'passed' ? '#24a148' : '#da1e28' }}>
                  Last test: {testStatus} · {formatDate(orgProvider?.tested_at ?? null)}
                </p>
              )}
              {provider.website_url && (
                <a
                  href={provider.website_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.8125rem', color: '#0f62fe', textDecoration: 'none' }}
                >
                  {provider.website_url.replace('https://', '')} ↗
                </a>
              )}
              {provider.code === 'stub' && (
                <p style={{ fontSize: '0.75rem', color: '#da1e28', marginTop: '0.5rem' }}>
                  Development only — do not use in production
                </p>
              )}
            </Tile>
          )
        })}
      </div>

      {/* ── ROLE REQUIREMENTS ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616' }}>
          Role-Based Check Requirements
        </h2>
      </div>
      <Tile style={{ padding: 0, marginBottom: '2rem' }}>
        {(roleRequirements ?? []).length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No role requirements configured. Requirements determine which checks are mandatory, optional, or not applicable for each position.
          </div>
        ) : (
          <TableContainer>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Position</TableHeader>
                  <TableHeader>Employment Type</TableHeader>
                  <TableHeader>Check Type</TableHeader>
                  <TableHeader>Requirement</TableHeader>
                  <TableHeader>Sensitive Role</TableHeader>
                  <TableHeader>Notes</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(roleRequirements ?? []).map(rr => (
                  <TableRow key={rr.id}>
                    <TableCell>{rr.position_title}</TableCell>
                    <TableCell>{rr.employment_type ?? '—'}</TableCell>
                    <TableCell>{CHECK_TYPE_LABELS[rr.check_type] ?? rr.check_type}</TableCell>
                    <TableCell>
                      <Tag type={REQUIREMENT_COLOURS[rr.requirement_level] ?? 'gray'} size="sm">
                        {rr.requirement_level.replace(/_/g, ' ')}
                      </Tag>
                    </TableCell>
                    <TableCell>{rr.is_sensitive_role ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{rr.notes ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Tile>

      {/* ── RE-VERIFICATION SCHEDULES ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616' }}>
          Re-Verification Schedules
        </h2>
      </div>
      <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '1rem' }}>
        Scheduled re-checks run automatically. A reminder is sent when a re-verification is due.
      </p>
      <Tile style={{ padding: 0, marginBottom: '2rem' }}>
        {(reverificationSchedules ?? []).length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No re-verification schedules set. Configure schedules to automatically trigger periodic background re-checks for ongoing employees.
          </div>
        ) : (
          <TableContainer>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Position</TableHeader>
                  <TableHeader>Check Type</TableHeader>
                  <TableHeader>Interval</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(reverificationSchedules ?? []).map(sched => (
                  <TableRow key={sched.id}>
                    <TableCell>{sched.position_title}</TableCell>
                    <TableCell>{CHECK_TYPE_LABELS[sched.check_type] ?? sched.check_type}</TableCell>
                    <TableCell>Every {sched.interval_months} month{sched.interval_months !== 1 ? 's' : ''}</TableCell>
                    <TableCell>
                      <Tag type={sched.is_active ? 'green' : 'gray'} size="sm">
                        {sched.is_active ? 'Active' : 'Paused'}
                      </Tag>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Tile>

      {/* ── CONSENT TEMPLATES ── */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>
        Consent Templates
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {(consentTemplates ?? []).length === 0 ? (
          <Tile style={{ padding: '2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem', gridColumn: '1 / -1' }}>
            No consent templates found.
          </Tile>
        ) : (
          (consentTemplates ?? []).map(tmpl => (
            <Tile key={tmpl.id} style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>{tmpl.name}</p>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <Tag type="gray" size="sm">v{tmpl.version}</Tag>
                  {tmpl.is_locked && <Tag type="red" size="sm">Locked</Tag>}
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.5rem' }}>
                Created {formatDate(tmpl.created_at)}
              </p>
              {tmpl.applies_to_checks && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(tmpl.applies_to_checks as string[]).map(ct => (
                    <span
                      key={ct}
                      style={{
                        fontSize: '0.6875rem',
                        padding: '1px 6px',
                        background: '#f4f4f4',
                        border: '1px solid #e0e0e0',
                        borderRadius: 2,
                        color: '#525252',
                        fontFamily: 'monospace',
                      }}
                    >
                      {ct}
                    </span>
                  ))}
                </div>
              )}
            </Tile>
          ))
        )}
      </div>

      {/* ── REFERENCE TEMPLATES ── */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>
        Reference Questionnaire Templates
      </h2>
      <Tile style={{ padding: 0 }}>
        {(referenceTemplates ?? []).length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No reference templates found.
          </div>
        ) : (
          <TableContainer>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Template Name</TableHeader>
                  <TableHeader>Role Scope</TableHeader>
                  <TableHeader>Created</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(referenceTemplates ?? []).map(tmpl => (
                  <TableRow key={tmpl.id}>
                    <TableCell>{tmpl.name}</TableCell>
                    <TableCell>{tmpl.role_scope ?? '—'}</TableCell>
                    <TableCell>{formatDate(tmpl.created_at)}</TableCell>
                    <TableCell>
                      <Tag type={tmpl.is_active ? 'green' : 'gray'} size="sm">
                        {tmpl.is_active ? 'Active' : 'Inactive'}
                      </Tag>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Tile>
    </div>
  )
}
