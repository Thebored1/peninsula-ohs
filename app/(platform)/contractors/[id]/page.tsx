import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid, Column, Tile, Tag, Breadcrumb, BreadcrumbItem,
  Table, TableHead, TableRow, TableHeader, TableBody, TableCell, TableContainer,
} from '@carbon/react'
import { updateContractorStatus } from '@/app/actions/contractors'
import { AddWorkerPanel } from './AddWorkerPanel'
import { AssessmentPanel } from './AssessmentPanel'
import { SignInPanel } from './SignInPanel'

type TagType = 'gray' | 'blue' | 'teal' | 'purple' | 'cyan' | 'magenta' | 'red' | 'green' | 'warm-gray' | 'high-contrast'

function prequalTag(status: string): TagType {
  const map: Record<string, TagType> = {
    pending: 'gray',
    approved: 'green',
    conditionally_approved: 'teal',
    suspended: 'red',
    expired: 'warm-gray',
  }
  return map[status] ?? 'gray'
}

function inductionTag(status: string): TagType {
  const map: Record<string, TagType> = {
    not_inducted: 'gray',
    inducted: 'green',
    expired: 'red',
  }
  return map[status] ?? 'gray'
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
        {label}
      </p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{children}</div>
    </div>
  )
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ContractorDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: contractor } = await supabase
    .from('contractor_companies')
    .select('id, company_name, abn, primary_contact_name, primary_contact_email, primary_contact_phone, address, prequalification_status, prequalification_expiry, notes, is_active, created_at')
    .eq('id', id)
    .single()

  if (!contractor) notFound()

  const [{ data: workers }, { data: assessments }, { data: accessLog }, { data: sites }] = await Promise.all([
    supabase
      .from('contractor_workers')
      .select('id, first_name, last_name, email, phone, role, induction_status, inducted_at, is_active')
      .eq('contractor_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('prequalification_assessments')
      .select('id, assessment_date, decision, decision_notes, conditions, expiry_date, overall_score, assessed_by')
      .eq('contractor_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('contractor_site_access_log')
      .select('id, sign_in_at, sign_out_at, purpose, site_id, contractor_worker_id, contractor_workers(first_name, last_name), sites(name)')
      .eq('contractor_workers.contractor_id', id)
      .order('sign_in_at', { ascending: false })
      .limit(50),
    supabase
      .from('sites')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
  ])

  async function handleStatusUpdate(formData: FormData) {
    'use server'
    const status = formData.get('status') as string
    const expiry = formData.get('expiry_date') as string | null
    await updateContractorStatus(id, status, expiry)
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/contractors">Contractors</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{contractor.company_name}</BreadcrumbItem>
      </Breadcrumb>

      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.5rem' }}>
            {contractor.company_name}
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Tag type={prequalTag(contractor.prequalification_status)} size="md">
              {contractor.prequalification_status?.replace(/_/g, ' ')}
            </Tag>
            {!contractor.is_active && <Tag type="gray" size="md">Inactive</Tag>}
          </div>
        </div>

        {/* Quick status update */}
        <form action={handleStatusUpdate} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div>
            <label htmlFor="status" style={{ display: 'block', fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.25rem' }}>
              Update Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={contractor.prequalification_status}
              style={{ fontSize: '0.875rem', padding: '0.4rem 0.5rem', border: '1px solid #e0e0e0', background: '#fff', color: '#161616', minWidth: '180px' }}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="conditionally_approved">Conditionally Approved</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div>
            <label htmlFor="expiry_date" style={{ display: 'block', fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.25rem' }}>
              Expiry Date
            </label>
            <input
              type="date"
              id="expiry_date"
              name="expiry_date"
              defaultValue={contractor.prequalification_expiry ?? ''}
              style={{ fontSize: '0.875rem', padding: '0.4rem 0.5rem', border: '1px solid #e0e0e0', color: '#161616' }}
            />
          </div>
          <button
            type="submit"
            style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', background: '#0f62fe', color: '#fff', border: 'none', borderRadius: '2px', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Save Status
          </button>
        </form>
      </div>

      <Grid condensed>
        {/* Left: company info */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Company Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="ABN">{contractor.abn ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Prequal Expiry">{formatDate(contractor.prequalification_expiry)}</DetailRow>
                </Column>
                <Column sm={4} md={8} lg={16}>
                  <DetailRow label="Address">{contractor.address ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Contact Name">{contractor.primary_contact_name ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Contact Email">{contractor.primary_contact_email ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Contact Phone">{contractor.primary_contact_phone ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Registered">{formatDate(contractor.created_at)}</DetailRow>
                </Column>
              </Grid>
              {contractor.notes && (
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f4f4f4', borderRadius: '2px' }}>
                  <p style={{ fontSize: '0.875rem', color: '#525252', lineHeight: 1.6 }}>{contractor.notes}</p>
                </div>
              )}
            </div>
          </Tile>

          {/* Prequalification Assessments */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Prequalification Assessments</h2>
              <AssessmentPanel contractorId={id} />
            </div>
            {!assessments || assessments.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No assessments recorded
              </div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Date</TableHeader>
                      <TableHeader>Decision</TableHeader>
                      <TableHeader>Score</TableHeader>
                      <TableHeader>Expiry</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assessments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{formatDate(a.assessment_date)}</TableCell>
                        <TableCell>
                          <Tag
                            type={a.decision === 'approved' ? 'green' : a.decision === 'rejected' ? 'red' : 'teal'}
                            size="sm"
                          >
                            {a.decision?.replace(/_/g, ' ')}
                          </Tag>
                        </TableCell>
                        <TableCell>{a.overall_score ?? '—'}</TableCell>
                        <TableCell>{formatDate(a.expiry_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Tile>
        </Column>

        {/* Right: workers & site access */}
        <Column sm={4} md={8} lg={8}>
          {/* Workers */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Workers</h2>
              <AddWorkerPanel contractorId={id} />
            </div>
            {!workers || workers.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No workers registered
              </div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Name</TableHeader>
                      <TableHeader>Role</TableHeader>
                      <TableHeader>Induction</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {workers.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell>
                          <div style={{ fontWeight: 500 }}>{w.first_name} {w.last_name}</div>
                          {w.email && <div style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>{w.email}</div>}
                        </TableCell>
                        <TableCell>{w.role ?? '—'}</TableCell>
                        <TableCell>
                          <Tag type={inductionTag(w.induction_status ?? 'not_inducted')} size="sm">
                            {(w.induction_status ?? 'not inducted').replace(/_/g, ' ')}
                          </Tag>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Tile>

          {/* Site Access Log */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Recent Site Access</h2>
              {workers && workers.length > 0 && (
                <SignInPanel contractorId={id} workers={workers.filter(w => w.is_active)} sites={sites ?? []} />
              )}
            </div>
            {!accessLog || accessLog.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No site access recorded
              </div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Worker</TableHeader>
                      <TableHeader>Sign In</TableHeader>
                      <TableHeader>Sign Out</TableHeader>
                      <TableHeader>Purpose</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {accessLog.map((log) => {
                      const workerRaw = log.contractor_workers
                      const worker = Array.isArray(workerRaw) ? workerRaw[0] : workerRaw
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            {worker ? `${worker.first_name} ${worker.last_name}` : '—'}
                          </TableCell>
                          <TableCell>{formatDateTime(log.sign_in_at)}</TableCell>
                          <TableCell>{formatDateTime(log.sign_out_at)}</TableCell>
                          <TableCell>{log.purpose ?? '—'}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Tile>
        </Column>
      </Grid>
    </div>
  )
}
