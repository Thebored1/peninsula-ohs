import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile, Breadcrumb, BreadcrumbItem } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import Link from 'next/link'

export default async function ReferenceChecksPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const [
    { count: pendingCount },
    { count: completedCount },
    { data: requests },
  ] = await Promise.all([
    supabase.from('bgc_reference_requests').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).in('status', ['sent','opened']),
    supabase.from('bgc_reference_requests').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('status', 'completed'),
    supabase
      .from('bgc_reference_requests')
      .select('id, referee_name, referee_email, status, sent_at, completed_at, package_id, bgc_packages(package_number, candidate_first_name, candidate_last_name)')
      .eq('organisation_id', orgId)
      .order('sent_at', { ascending: false })
      .limit(50),
  ])

  const rows = (requests ?? []).map(r => {
    const pkg = (r.bgc_packages as unknown as Array<{ package_number: string; candidate_first_name: string; candidate_last_name: string }> | null)?.[0] ?? null
    return {
      id: r.id,
      referee_name: r.referee_name,
      referee_email: r.referee_email,
      candidate_name: pkg ? `${pkg.candidate_first_name} ${pkg.candidate_last_name}`.trim() : '—',
      package_number: pkg?.package_number ?? '—',
      status: r.status,
      sent_at: r.sent_at,
      completed_at: r.completed_at,
    }
  })

  const columns: ColDef[] = [
    { key: 'referee_name', header: 'Referee' },
    { key: 'referee_email', header: 'Email' },
    { key: 'candidate_name', header: 'Candidate' },
    { key: 'package_number', header: 'Package' },
    { key: 'status', header: 'Status', cellConfig: {
      as: 'tag',
      map: { pending: 'gray', sent: 'blue', opened: 'teal', completed: 'green', declined: 'red', no_response: 'gray' },
      transform: true,
    }},
    { key: 'sent_at', header: 'Sent', cellConfig: { as: 'date' } },
    { key: 'completed_at', header: 'Completed', cellConfig: { as: 'date' } },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1rem' }}>
        <BreadcrumbItem href="/background-checks">Background Checks</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Reference Checks</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Reference Checks</h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            Track reference questionnaires sent to candidate-provided referees
          </p>
        </div>
        <Link href="/background-checks/reference-checks/templates"
          style={{ backgroundColor: '#0f62fe', color: '#fff', padding: '10px 16px', borderRadius: 2, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
          Questionnaire Templates
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <Tile style={{ padding: '1.25rem', backgroundColor: '#edf5ff' }}>
          <p style={{ fontSize: '2rem', fontWeight: 300, color: '#0f62fe', marginBottom: '0.25rem', lineHeight: 1 }}>{pendingCount ?? 0}</p>
          <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.375rem' }}>Awaiting Response</p>
        </Tile>
        <Tile style={{ padding: '1.25rem', backgroundColor: '#defbe6' }}>
          <p style={{ fontSize: '2rem', fontWeight: 300, color: '#24a148', marginBottom: '0.25rem', lineHeight: 1 }}>{completedCount ?? 0}</p>
          <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.375rem' }}>Completed</p>
        </Tile>
      </div>

      <Tile style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>All Reference Requests</h2>
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No reference requests sent yet. Reference requests are sent from individual package pages.
          </div>
        ) : (
          <DataTableClient id="reference-table" rows={rows} columns={columns} searchPlaceholder="Search references…" />
        )}
      </Tile>
    </div>
  )
}
