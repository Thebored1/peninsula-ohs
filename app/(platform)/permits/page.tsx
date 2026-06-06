import { createClient } from '@/lib/supabase/server'
import {
  Tile, Tag, Button,
} from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function isExpiringSoon(validUntil: string | null) {
  if (!validUntil) return false
  const diff = new Date(validUntil).getTime() - Date.now()
  return diff > 0 && diff < 4 * 60 * 60 * 1000
}

export default async function PermitsPage() {
  const supabase = await createClient()

  const { data: permits } = await supabase
    .from('permits')
    .select(`
      id, permit_number, title, valid_from, valid_until, created_at,
      permit_types(name),
      permit_statuses(name, colour_code, code, is_active_work)
    `)
    .order('created_at', { ascending: false })

  const rows = (permits ?? []).map(p => {
    const typeRaw = p.permit_types
    const statusRaw = p.permit_statuses
    const type = Array.isArray(typeRaw) ? typeRaw[0] ?? null : typeRaw
    const status = Array.isArray(statusRaw) ? statusRaw[0] ?? null : statusRaw
    const statusObj = status as { name: string; colour_code: string; code: string; is_active_work: boolean } | null
    const expiringSoon = isExpiringSoon(p.valid_until) && (statusObj?.is_active_work ?? false)
    return {
      id: p.id,
      permit_number: p.permit_number ?? '—',
      title: p.title,
      type_name: (type as { name: string } | null)?.name ?? '—',
      status_name: statusObj?.name ?? '—',
      status_colour: statusObj?.colour_code ?? '#6b7280',
      status_code: statusObj?.code ?? '',
      valid_from: formatDateTime(p.valid_from),
      valid_until: formatDateTime(p.valid_until),
      expiringSoon,
    }
  })

  const columns: ColDef[] = [
    { key: 'permit_number', header: 'Permit #', cellConfig: { as: 'monospace_flag', flagField: 'expiringSoon', flagLabel: 'Expiring', flagType: 'red' } },
    { key: 'title', header: 'Title' },
    { key: 'type_name', header: 'Type' },
    { key: 'status_name', header: 'Status', cellConfig: { as: 'dot_text', colourField: 'status_colour' } },
    { key: 'valid_from', header: 'Valid From' },
    { key: 'valid_until', header: 'Valid Until' },
    { key: 'view', header: '', cellConfig: { as: 'view_link', prefix: '/permits/' } },
  ]

  const active = rows.filter(r => ['issued', 'active'].includes(r.status_code)).length
  const pending = rows.filter(r => ['draft', 'submitted', 'under_review'].includes(r.status_code)).length
  const expiringSoonCount = rows.filter(r => r.expiringSoon).length

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Permits to Work
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} permit{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button kind="primary" href="/permits/new" style={{ justifyContent: 'center' }}>
          Apply for Permit
        </Button>
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {active > 0 && <Tag type="green" size="sm">{active} Active</Tag>}
          {pending > 0 && <Tag type="blue" size="sm">{pending} Pending</Tag>}
          {expiringSoonCount > 0 && <Tag type="red" size="sm">{expiringSoonCount} Expiring Soon</Tag>}
        </div>
      )}

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No permits to work recorded.{' '}
            <a href="/permits/new" style={{ color: '#0f62fe', textDecoration: 'none' }}>Apply for a permit</a>.
          </div>
        ) : (
          <DataTableClient id="permits-search" rows={rows} columns={columns} searchPlaceholder="Search permits…" />
        )}
      </Tile>
    </div>
  )
}
