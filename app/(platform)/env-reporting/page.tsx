import { createClient } from '@/lib/supabase/server'
import {
  Tile,
  Tag,
  Button,
  Grid,
  Column,
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
} from '@carbon/react'

type TagType = 'gray' | 'blue' | 'red' | 'green'

function freqTag(freq: string): TagType {
  const map: Record<string, TagType> = {
    weekly: 'blue',
    monthly: 'blue',
    quarterly: 'teal' as TagType,
    biannual: 'gray',
    annual: 'gray',
    ad_hoc: 'gray',
  }
  return map[freq] ?? 'gray'
}

function dueDateStyle(iso: string | null): React.CSSProperties {
  if (!iso) return {}
  const days = Math.floor((new Date(iso).getTime() - Date.now()) / 86400000)
  if (days < 0) return { color: '#da1e28', fontWeight: 600 }
  if (days <= 14) return { color: '#f1620a', fontWeight: 600 }
  return {}
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function EnvReportingPage() {
  const supabase = await createClient()

  const [{ data: requirements }, { data: submissions }] = await Promise.all([
    supabase
      .from('env_reporting_requirements')
      .select('id, name, regulatory_body, report_type, frequency, next_due_date, last_submitted_at, is_active')
      .eq('is_active', true)
      .order('next_due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('env_report_submissions')
      .select('id, title, submitted_date, regulatory_body, reference_number, reporting_period_start, reporting_period_end')
      .order('submitted_date', { ascending: false })
      .limit(20),
  ])

  const subRows = (submissions ?? []).map((s) => ({
    id: s.id,
    title: s.title ?? '—',
    submitted_date: s.submitted_date ?? null,
    regulatory_body: s.regulatory_body ?? '—',
    reference_number: s.reference_number ?? '—',
    period: s.reporting_period_start && s.reporting_period_end
      ? `${formatDate(s.reporting_period_start)} – ${formatDate(s.reporting_period_end)}`
      : '—',
  }))

  const subHeaders = [
    { key: 'title', header: 'Report' },
    { key: 'regulatory_body', header: 'Regulatory Body' },
    { key: 'submitted_date', header: 'Submitted' },
    { key: 'period', header: 'Reporting Period' },
    { key: 'reference_number', header: 'Reference #' },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
            Environmental Reporting
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            Regulatory reporting obligations and submissions
          </p>
        </div>
        <Button kind="primary" href="/env-reporting/new" style={{ justifyContent: 'center' }}>
          Log Submission
        </Button>
      </div>

      {/* Reporting requirements */}
      {(requirements ?? []).length > 0 && (
        <>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>
            Reporting Obligations
          </h2>
          <Grid condensed style={{ marginBottom: '2rem' }}>
            {requirements!.map((req) => (
              <Column key={req.id} sm={4} md={4} lg={4}>
                <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <Tag type={freqTag(req.frequency)} size="sm">{req.frequency.replace(/_/g, ' ')}</Tag>
                  </div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.25rem' }}>{req.name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#525252', marginBottom: '0.5rem' }}>{req.regulatory_body}</p>
                  {req.next_due_date && (
                    <p style={{ fontSize: '0.75rem', ...dueDateStyle(req.next_due_date) }}>
                      Due: {formatDate(req.next_due_date)}
                    </p>
                  )}
                  {req.last_submitted_at && (
                    <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.25rem' }}>
                      Last submitted: {formatDate(req.last_submitted_at)}
                    </p>
                  )}
                </Tile>
              </Column>
            ))}
          </Grid>
        </>
      )}

      {/* Submissions table */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>
        Recent Submissions
      </h2>
      <Tile style={{ padding: 0 }}>
        {subRows.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
            No submissions recorded
          </div>
        ) : (
          <DataTable rows={subRows} headers={subHeaders}>
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
                    <TableToolbarSearch id="envreport-search" onChange={onInputChange} placeholder="Search submissions…" />
                  </TableToolbarContent>
                </TableToolbar>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {tableHeaders.map((h: any) => <TableHeader key={h.key} {...getHeaderProps({ header: h })}>{h.header}</TableHeader>)}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {tableRows.map((row: any) => {
                      const original = subRows.find((r) => r.id === row.id)!
                      return (
                        <TableRow key={row.id} {...getRowProps({ row })}>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {row.cells.map((cell: any) => {
                            if (cell.info.header === 'submitted_date') {
                              return <TableCell key={cell.id}>{formatDate(original.submitted_date)}</TableCell>
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
