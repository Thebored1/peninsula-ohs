import { createClient } from '@/lib/supabase/server'
import {
  Tile,
  Tag,
  Button,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Breadcrumb,
  BreadcrumbItem,
} from '@carbon/react'

type TagType = 'gray' | 'blue' | 'teal' | 'purple' | 'cyan' | 'magenta' | 'red' | 'green'

function recurrenceTag(type: string): TagType {
  const map: Record<string, TagType> = {
    once: 'gray',
    daily: 'blue',
    weekly: 'teal',
    monthly: 'purple',
    custom: 'cyan',
  }
  return map[type] ?? 'gray'
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function isOverdue(nextDueAt: string | null) {
  if (!nextDueAt) return false
  return new Date(nextDueAt) < new Date()
}

export default async function InspectionSchedulesPage() {
  const supabase = await createClient()

  const { data: schedules } = await supabase
    .from('inspection_schedules')
    .select(`
      id, name, recurrence_type, next_due_at, last_completed_at, is_active, created_at,
      inspection_templates(name),
      sites(name)
    `)
    .order('name')

  const rows = (schedules ?? []).map(s => {
    const tplRaw = s.inspection_templates
    const siteRaw = s.sites
    const tpl = Array.isArray(tplRaw) ? tplRaw[0] ?? null : tplRaw
    const site = Array.isArray(siteRaw) ? siteRaw[0] ?? null : siteRaw
    const overdue = s.is_active && isOverdue(s.next_due_at)
    return {
      id: s.id,
      name: s.name,
      template_name: (tpl as { name: string } | null)?.name ?? '—',
      site_name: (site as { name: string } | null)?.name ?? '—',
      recurrence_type: s.recurrence_type,
      next_due_at: formatDate(s.next_due_at),
      last_completed_at: formatDate(s.last_completed_at),
      is_active: s.is_active,
      overdue,
    }
  })

  const headers = [
    { key: 'name', header: 'Schedule Name' },
    { key: 'template_name', header: 'Template' },
    { key: 'site_name', header: 'Site' },
    { key: 'recurrence_type', header: 'Recurrence' },
    { key: 'next_due_at', header: 'Next Due' },
    { key: 'last_completed_at', header: 'Last Completed' },
    { key: 'is_active', header: 'Status' },
    { key: 'view', header: '' },
  ]

  const active = rows.filter(r => r.is_active).length
  const overdue = rows.filter(r => r.overdue).length

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/inspections">Inspections</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Schedules</BreadcrumbItem>
      </Breadcrumb>

      <div
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Inspection Schedules
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {rows.length} schedule{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button kind="primary" href="/inspections/schedules/new" style={{ justifyContent: 'center' }}>
          New Schedule
        </Button>
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {active > 0 && <Tag type="green" size="sm">{active} Active</Tag>}
          {overdue > 0 && <Tag type="red" size="sm">{overdue} Overdue</Tag>}
        </div>
      )}

      <Tile style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              color: '#6f6f6f',
              fontSize: '0.875rem',
            }}
          >
            No schedules configured.{' '}
            <a
              href="/inspections/schedules/new"
              style={{ color: '#0f62fe', textDecoration: 'none' }}
            >
              Create a schedule
            </a>{' '}
            to automate recurring inspections.
          </div>
        ) : (
          <DataTable rows={rows} headers={headers}>
            {({
              rows: tableRows,
              headers: tableHeaders,
              getTableProps,
              getHeaderProps,
              getRowProps,
              onInputChange,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }: any) => (
              <TableContainer>
                <TableToolbar>
                  <TableToolbarContent>
                    <TableToolbarSearch
                      id="schedules-search"
                      onChange={onInputChange}
                      placeholder="Search schedules…"
                    />
                  </TableToolbarContent>
                </TableToolbar>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {tableHeaders.map((h: any) => (
                        <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                          {h.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {tableRows.map((row: any) => {
                      const orig = rows.find(r => r.id === row.id)!
                      return (
                        <TableRow key={row.id} {...getRowProps({ row })}>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {row.cells.map((cell: any) => {
                            if (cell.info.header === 'name') {
                              return (
                                <TableCell key={cell.id}>
                                  {cell.value as string}
                                  {orig.overdue && (
                                    <Tag type="red" size="sm" style={{ marginLeft: '0.5rem' }}>
                                      Overdue
                                    </Tag>
                                  )}
                                </TableCell>
                              )
                            }
                            if (cell.info.header === 'recurrence_type') {
                              return (
                                <TableCell key={cell.id}>
                                  <Tag type={recurrenceTag(cell.value as string)} size="sm">
                                    {(cell.value as string)?.replace(/_/g, ' ')}
                                  </Tag>
                                </TableCell>
                              )
                            }
                            if (cell.info.header === 'is_active') {
                              return (
                                <TableCell key={cell.id}>
                                  <Tag type={cell.value ? 'green' : 'gray'} size="sm">
                                    {cell.value ? 'Active' : 'Paused'}
                                  </Tag>
                                </TableCell>
                              )
                            }
                            if (cell.info.header === 'view') {
                              return (
                                <TableCell key={cell.id}>
                                  <a
                                    href={`/inspections/schedules/${row.id}`}
                                    style={{
                                      fontSize: '0.875rem',
                                      color: '#0f62fe',
                                      textDecoration: 'none',
                                    }}
                                  >
                                    View
                                  </a>
                                </TableCell>
                              )
                            }
                            return <TableCell key={cell.id}>{cell.value as string}</TableCell>
                          })}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        )}
      </Tile>
    </div>
  )
}
