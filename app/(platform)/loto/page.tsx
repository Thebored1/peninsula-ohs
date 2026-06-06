import { createClient } from '@/lib/supabase/server'
import { Tile, Tag, Button } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import Link from 'next/link'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default async function LotoPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user!.id)
    .single()

  const { data: procedures } = await supabase
    .from('loto_procedures')
    .select('id, procedure_number, title, asset_description, status, created_at')
    .eq('organisation_id', profile!.organisation_id)
    .order('created_at', { ascending: false })

  const rows = (procedures ?? []).map(p => ({
    id: p.id,
    procedure_number: p.procedure_number ?? '—',
    title: p.title,
    asset_description: p.asset_description ?? '—',
    status: p.status,
    created_at: formatDate(p.created_at),
  }))

  const statusTagMap: Record<string, 'gray' | 'blue' | 'green' | 'red' | 'purple' | 'teal' | 'cyan' | 'magenta'> = {
    draft:    'gray',
    approved: 'green',
    archived: 'purple',
  }

  const columns: ColDef[] = [
    {
      key: 'procedure_number',
      header: 'Procedure #',
      cellConfig: { as: 'text_link', prefix: '/loto/' },
    },
    { key: 'title', header: 'Title' },
    { key: 'asset_description', header: 'Asset / Equipment' },
    {
      key: 'status',
      header: 'Status',
      cellConfig: { as: 'tag', map: statusTagMap, default: 'gray', transform: true },
    },
    { key: 'created_at', header: 'Created' },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/loto/' } },
  ]

  const draftCount    = rows.filter(r => r.status === 'draft').length
  const approvedCount = rows.filter(r => r.status === 'approved').length
  const archivedCount = rows.filter(r => r.status === 'archived').length

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            LOTO Procedures
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} procedure{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/loto/new">
          <Button kind="primary" size="md">New Procedure</Button>
        </Link>
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {approvedCount > 0 && <Tag type="green" size="sm">{approvedCount} Approved</Tag>}
          {draftCount > 0 && <Tag type="gray" size="sm">{draftCount} Draft</Tag>}
          {archivedCount > 0 && <Tag type="purple" size="sm">{archivedCount} Archived</Tag>}
        </div>
      )}

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No LOTO procedures recorded.{' '}
            <a href="/loto/new" style={{ color: '#0f62fe', textDecoration: 'none' }}>Create the first procedure</a>.
          </div>
        ) : (
          <DataTableClient
            id="loto-search"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search procedures…"
          />
        )}
      </Tile>
    </div>
  )
}
