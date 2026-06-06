'use client'

import {
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
  Tag,
} from '@carbon/react'

export type TagType =
  | 'gray' | 'blue' | 'teal' | 'purple' | 'cyan' | 'magenta' | 'red' | 'green'

export type CellConfig =
  // Carbon Tag — type from value→tag map
  | { as: 'tag'; map: Record<string, TagType>; default?: TagType; transform?: boolean }
  // Coloured dot + plain text (e.g. incident severity)
  | { as: 'dot_text'; colourField: string }
  // Coloured dot + Tag, tag type derived from a boolean field (e.g. is_operational)
  | { as: 'dot_tag'; colourField: string; isOpField?: string }
  // "View" link — href = prefix + row.id
  | { as: 'view_link'; prefix: string }
  // Cell value as link text — href = prefix + row.id
  | { as: 'text_link'; prefix: string }
  // Cell value as link text — href = prefix + row[idField] (different ID field)
  | { as: 'field_link'; prefix: string; idField: string }
  // Due date with red/orange overdue colouring (value = ISO date string or null)
  | { as: 'due_date' }
  // AU-formatted date (no overdue colouring)
  | { as: 'date' }
  // AUD currency
  | { as: 'currency' }
  // Boolean → Tag
  | { as: 'bool_tag'; trueType: TagType; trueLabel: string; falseType: TagType; falseLabel: string }
  // Number — highlighted in colour if > 0
  | { as: 'number_alert'; color: string }
  // Monospace span
  | { as: 'monospace' }
  // Monospace + conditional Tag (e.g. inspection overdue, permit expiring)
  | { as: 'monospace_flag'; flagField: string; flagLabel: string; flagType: TagType }
  // Replace underscores with spaces
  | { as: 'transform' }
  // Risk level pill (colour derived from low/medium/high/critical)
  | { as: 'risk_pill' }
  // Coloured dot + label text (e.g. actions priority)
  | { as: 'priority_dot'; colorField: string }

export interface ColDef {
  key: string
  header: string
  cellConfig?: CellConfig
}

export type TableRow = { id: string } & Record<string, unknown>

interface Props {
  id: string
  rows: TableRow[]
  columns: ColDef[]
  searchPlaceholder?: string
}

function renderCell(
  _headerKey: string,
  value: unknown,
  row: TableRow,
  config: CellConfig | undefined
): React.ReactNode {
  if (!config) {
    return value == null ? '—' : String(value)
  }

  switch (config.as) {
    case 'tag': {
      const str = String(value ?? '')
      if (!str) return '—'
      const type = config.map[str] ?? config.default ?? 'gray'
      const label = config.transform ? str.replace(/_/g, ' ') : str
      return <Tag type={type} size="sm">{label}</Tag>
    }

    case 'dot_text': {
      const colour = String(row[config.colourField] ?? '#c6c6c6')
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colour, flexShrink: 0 }} />
          <span>{String(value ?? '—')}</span>
        </div>
      )
    }

    case 'dot_tag': {
      const colour = String(row[config.colourField] ?? '#c6c6c6')
      const isOp = config.isOpField ? Boolean(row[config.isOpField]) : true
      const tagType: TagType = isOp ? 'green' : 'red'
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colour, flexShrink: 0 }} />
          <Tag type={tagType} size="sm">{String(value ?? '—')}</Tag>
        </div>
      )
    }

    case 'view_link':
      return (
        <a
          href={`${config.prefix}${String(row.id ?? '')}`}
          style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}
        >
          View
        </a>
      )

    case 'text_link':
      return (
        <a
          href={`${config.prefix}${String(row.id ?? '')}`}
          style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}
        >
          {String(value ?? '—')}
        </a>
      )

    case 'field_link': {
      const idVal = row[config.idField]
      if (!idVal) return String(value ?? '—')
      return (
        <a
          href={`${config.prefix}${String(idVal)}`}
          style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}
        >
          {String(value ?? '—')}
        </a>
      )
    }

    case 'due_date': {
      if (!value) return '—'
      const date = new Date(String(value))
      const days = Math.floor((date.getTime() - Date.now()) / 86400000)
      const style: React.CSSProperties =
        days < 0 ? { color: '#da1e28', fontWeight: 600 } :
        days <= 14 ? { color: '#f1620a', fontWeight: 600 } : {}
      return (
        <span style={style}>
          {date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    }

    case 'date':
      if (!value) return '—'
      return new Date(String(value)).toLocaleDateString('en-AU', {
        day: 'numeric', month: 'short', year: 'numeric',
      })

    case 'currency':
      if (value == null) return '—'
      return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(value))

    case 'bool_tag': {
      const bool = Boolean(value)
      return (
        <Tag type={bool ? config.trueType : config.falseType} size="sm">
          {bool ? config.trueLabel : config.falseLabel}
        </Tag>
      )
    }

    case 'number_alert': {
      const num = Number(value ?? 0)
      if (num > 0) return <span style={{ color: config.color, fontWeight: 600 }}>{num}</span>
      return String(num)
    }

    case 'monospace':
      return (
        <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
          {String(value ?? '—')}
        </span>
      )

    case 'monospace_flag': {
      const showFlag = Boolean(row[config.flagField])
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{String(value ?? '—')}</span>
          {showFlag && <Tag type={config.flagType} size="sm">{config.flagLabel}</Tag>}
        </div>
      )
    }

    case 'transform':
      return String(value ?? '—').replace(/_/g, ' ')

    case 'risk_pill': {
      const level = String(value ?? '').toLowerCase()
      const styles: Record<string, { bg: string; color: string }> = {
        low:      { bg: 'rgba(36,161,72,0.15)',   color: '#24a148' },
        medium:   { bg: 'rgba(241,194,27,0.15)',  color: '#b08800' },
        high:     { bg: 'rgba(249,115,22,0.15)',  color: '#c95000' },
        critical: { bg: 'rgba(218,30,40,0.15)',   color: '#da1e28' },
      }
      const { bg, color } = styles[level] ?? { bg: '#f4f4f4', color: '#525252' }
      return (
        <span style={{
          display: 'inline-block',
          padding: '0.125rem 0.5rem',
          borderRadius: '2px',
          backgroundColor: bg,
          color,
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'capitalize',
        }}>
          {String(value ?? '—')}
        </span>
      )
    }

    case 'priority_dot': {
      const colour = String(row[config.colorField] ?? '#525252')
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colour, flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem' }}>{String(value ?? '—')}</span>
        </div>
      )
    }

    default:
      return value == null ? '—' : String(value)
  }
}

export function DataTableClient({
  id,
  rows,
  columns,
  searchPlaceholder = 'Search…',
}: Props) {
  const headers = columns.map(({ key, header }) => ({ key, header }))
  const configMap: Record<string, CellConfig | undefined> = {}
  for (const col of columns) configMap[col.key] = col.cellConfig

  return (
    <DataTable rows={rows} headers={headers}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps, onInputChange }: any) => (
        <TableContainer>
          <TableToolbar>
            <TableToolbarContent>
              <TableToolbarSearch id={id} onChange={onInputChange} placeholder={searchPlaceholder} />
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
                const original = (rows.find((r) => r.id === row.id) ?? { id: '' }) as TableRow
                return (
                  <TableRow key={row.id} {...getRowProps({ row })}>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {row.cells.map((cell: any) => (
                      <TableCell key={cell.id}>
                        {renderCell(
                          cell.info.header,
                          cell.value,
                          original,
                          configMap[cell.info.header],
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DataTable>
  )
}
