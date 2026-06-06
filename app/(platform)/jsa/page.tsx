import { createClient } from '@/lib/supabase/server'
import { Tile, Button, Tag } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

type StatusTagType = 'gray' | 'blue' | 'teal' | 'purple' | 'red' | 'green' | 'cyan'

function statusTagType(status: string): StatusTagType {
  const map: Record<string, StatusTagType> = {
    draft: 'gray',
    under_review: 'blue',
    approved: 'green',
    archived: 'gray',
  }
  return map[status] ?? 'gray'
}

export default async function JsaPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user!.id)
    .single()

  const { data: jsas } = await supabase
    .from('jsas')
    .select('id, jsa_number, title, location, status, created_at')
    .eq('organisation_id', profile!.organisation_id)
    .order('created_at', { ascending: false })

  const rows = (jsas ?? []).map(j => ({
    id: j.id,
    jsa_number: j.jsa_number ?? '—',
    title: j.title,
    location: j.location ?? '—',
    status: j.status ?? 'draft',
    created_at: formatDate(j.created_at),
  }))

  const columns: ColDef[] = [
    { key: 'jsa_number', header: 'JSA #', cellConfig: { as: 'monospace' } },
    { key: 'title', header: 'Title', cellConfig: { as: 'text_link', prefix: '/jsa/' } },
    { key: 'location', header: 'Location' },
    {
      key: 'status',
      header: 'Status',
      cellConfig: {
        as: 'tag',
        map: {
          draft: 'gray',
          under_review: 'blue',
          approved: 'green',
          archived: 'gray',
        },
        transform: true,
      },
    },
    { key: 'created_at', header: 'Created' },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/jsa/' } },
  ]

  const draft = rows.filter(r => r.status === 'draft').length
  const approved = rows.filter(r => r.status === 'approved').length
  const underReview = rows.filter(r => r.status === 'under_review').length

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            JSA / JHA Builder
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} job safety analysis{rows.length !== 1 ? 'es' : ''} recorded
          </p>
        </div>
        <Button kind="primary" href="/jsa/new" style={{ justifyContent: 'center' }}>
          New JSA
        </Button>
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {draft > 0 && <Tag type="gray" size="sm">{draft} Draft</Tag>}
          {underReview > 0 && <Tag type="blue" size="sm">{underReview} Under Review</Tag>}
          {approved > 0 && <Tag type="green" size="sm">{approved} Approved</Tag>}
        </div>
      )}

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No job safety analyses recorded.{' '}
            <a href="/jsa/new" style={{ color: '#0f62fe', textDecoration: 'none' }}>Create the first JSA</a>.
          </div>
        ) : (
          <DataTableClient
            id="jsa-search"
            rows={rows}
            columns={columns}
            searchPlaceholder="Search JSAs…"
          />
        )}
      </Tile>
    </div>
  )
}
