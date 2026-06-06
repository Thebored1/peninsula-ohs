import { createClient } from '@/lib/supabase/server'
import { Tile, Tag, Button } from '@carbon/react'
import { DataTableClient, type ColDef } from '@/components/table/DataTableClient'
import type { TagType } from '@/components/table/DataTableClient'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function alertSeverityType(severity: string): TagType {
  const map: Record<string, TagType> = {
    info: 'blue',
    warning: 'teal',
    high: 'red',
    critical: 'red',
  }
  return map[severity] ?? 'gray'
}

function alertStatusType(status: string): TagType {
  const map: Record<string, TagType> = {
    open: 'red',
    acknowledged: 'teal',
    resolved: 'green',
  }
  return map[status] ?? 'gray'
}

const shiftColumns: ColDef[] = [
  { key: 'worker_name', header: 'Worker' },
  {
    key: 'shift_date',
    header: 'Shift Date',
    cellConfig: { as: 'date' },
  },
  {
    key: 'hours_worked',
    header: 'Hours Worked',
  },
  {
    key: 'shift_type',
    header: 'Shift Type',
    cellConfig: {
      as: 'tag',
      map: {
        standard: 'blue',
        overtime: 'teal',
        on_call: 'gray',
        night: 'purple',
      },
      transform: true,
    },
  },
  {
    key: 'created_at',
    header: 'Logged At',
    cellConfig: { as: 'date' },
  },
  {
    key: 'view',
    header: '',
    cellConfig: { as: 'view_link', prefix: '/fatigue/' },
  },
]

export default async function FatiguePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user!.id)
    .single()

  const [{ data: shiftLogs }, { data: alerts }] = await Promise.all([
    supabase
      .from('shift_logs')
      .select(
        'id, shift_date, shift_start, shift_end, hours_worked, shift_type, created_at, user_profiles!worker_id(first_name, last_name)'
      )
      .eq('organisation_id', profile!.organisation_id)
      .order('shift_date', { ascending: false }),
    supabase
      .from('fatigue_alerts')
      .select(
        'id, alert_type, actual_value, threshold_value, severity, status, created_at, user_profiles!worker_id(first_name, last_name)'
      )
      .eq('organisation_id', profile!.organisation_id)
      .eq('status', 'open')
      .order('created_at', { ascending: false }),
  ])

  const shiftRows = (shiftLogs ?? []).map((r) => {
    const profRaw = r.user_profiles
    const prof = Array.isArray(profRaw)
      ? (profRaw[0] as { first_name: string; last_name: string } | undefined) ?? null
      : (profRaw as { first_name: string; last_name: string } | null)
    return {
      id: r.id,
      worker_name: prof ? `${prof.first_name} ${prof.last_name}` : '—',
      shift_date: r.shift_date ?? null,
      hours_worked:
        r.hours_worked != null ? `${Number(r.hours_worked).toFixed(1)} hrs` : '—',
      shift_type: r.shift_type ?? 'standard',
      created_at: r.created_at ?? null,
    }
  })

  const alertRows = (alerts ?? []).map((a) => {
    const profRaw = a.user_profiles
    const prof = Array.isArray(profRaw)
      ? (profRaw[0] as { first_name: string; last_name: string } | undefined) ?? null
      : (profRaw as { first_name: string; last_name: string } | null)
    return {
      worker: prof ? `${prof.first_name} ${prof.last_name}` : '—',
      alert_type: a.alert_type.replace(/_/g, ' '),
      actual_value: `${a.actual_value}`,
      threshold_value: `${a.threshold_value}`,
      severity: a.severity,
      status: a.status,
      raised: formatDate(a.created_at),
    }
  })

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '0.25rem',
            }}
          >
            Fatigue &amp; Shift Monitoring
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252' }}>
            {shiftRows.length} shift log{shiftRows.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <Button kind="primary" href="/fatigue/new" size="sm">
          Log Shift
        </Button>
      </div>

      {/* Open alerts section */}
      {alertRows.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: '#161616',
              marginBottom: '1rem',
            }}
          >
            Open Fatigue Alerts ({alertRows.length})
          </h2>
          <Tile style={{ padding: 0 }}>
            <div
              style={{
                overflowX: 'auto',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem',
                  color: '#161616',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid #e0e0e0', backgroundColor: '#f4f4f4' }}>
                    {['Worker', 'Alert Type', 'Actual', 'Threshold', 'Severity', 'Status', 'Raised'].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'left',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            color: '#161616',
                            letterSpacing: '0.32px',
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {alertRows.map((a, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: '1px solid #e0e0e0' }}
                    >
                      <td style={{ padding: '0.75rem 1rem' }}>{a.worker}</td>
                      <td style={{ padding: '0.75rem 1rem', textTransform: 'capitalize' }}>
                        {a.alert_type}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>{a.actual_value}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{a.threshold_value}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Tag type={alertSeverityType(a.severity)} size="sm">
                          {a.severity}
                        </Tag>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Tag type={alertStatusType(a.status)} size="sm">
                          {a.status}
                        </Tag>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#525252' }}>
                        {a.raised}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tile>
        </div>
      )}

      {/* Shift logs table */}
      <h2
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: '#161616',
          marginBottom: '1rem',
        }}
      >
        Shift Logs
      </h2>
      <Tile style={{ padding: 0 }}>
        {shiftRows.length === 0 ? (
          <div
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              color: '#6f6f6f',
              fontSize: '0.875rem',
            }}
          >
            No shift logs recorded yet
          </div>
        ) : (
          <DataTableClient
            id="fatigue-shifts-table"
            rows={shiftRows}
            columns={shiftColumns}
            searchPlaceholder="Search shift logs…"
          />
        )}
      </Tile>
    </div>
  )
}
