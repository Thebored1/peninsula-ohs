'use client'

interface DataPoint {
  label: string
  value: number
}

interface TrendChartProps {
  data: DataPoint[]
  title: string
  color?: string
}

const SVG_WIDTH = 480
const SVG_HEIGHT = 200
const PADDING = { top: 16, right: 16, bottom: 40, left: 44 }

function formatValue(v: number): string {
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(1)
}

export default function TrendChart({ data, title, color = '#0f62fe' }: TrendChartProps) {
  const chartW = SVG_WIDTH - PADDING.left - PADDING.right
  const chartH = SVG_HEIGHT - PADDING.top - PADDING.bottom

  const values = data.map((d) => d.value)
  const maxVal = Math.max(...values, 1)
  const minVal = 0

  const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW / 2

  function xPos(i: number): number {
    return data.length === 1 ? PADDING.left + chartW / 2 : PADDING.left + i * xStep
  }

  function yPos(v: number): number {
    return PADDING.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH
  }

  // Build SVG line path
  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)} ${yPos(d.value).toFixed(1)}`)
    .join(' ')

  // Build fill area path (close back along bottom)
  const areaPath =
    linePath +
    ` L ${xPos(data.length - 1).toFixed(1)} ${(PADDING.top + chartH).toFixed(1)}` +
    ` L ${xPos(0).toFixed(1)} ${(PADDING.top + chartH).toFixed(1)} Z`

  // Y-axis tick values
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    value: minVal + t * (maxVal - minVal),
    y: PADDING.top + chartH - t * chartH,
  }))

  if (data.length === 0) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1rem' }}>{title}</p>
        <p style={{ fontSize: '0.875rem', color: '#6f6f6f', textAlign: 'center', paddingTop: '1rem' }}>No data available</p>
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.75rem' }}>{title}</p>
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label={title}
        role="img"
      >
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={PADDING.left}
              y1={tick.y}
              x2={SVG_WIDTH - PADDING.right}
              y2={tick.y}
              stroke="#e0e0e0"
              strokeWidth={1}
            />
            <text
              x={PADDING.left - 6}
              y={tick.y + 4}
              textAnchor="end"
              fontSize={10}
              fill="#6f6f6f"
            >
              {formatValue(tick.value)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={color} fillOpacity={0.08} />

        {/* Line */}
        {data.length > 1 && (
          <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* Data points */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={xPos(i)} cy={yPos(d.value)} r={4} fill={color} />
            <title>{`${d.label}: ${formatValue(d.value)}`}</title>
          </g>
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={xPos(i)}
            y={SVG_HEIGHT - 8}
            textAnchor="middle"
            fontSize={10}
            fill="#6f6f6f"
          >
            {d.label}
          </text>
        ))}

        {/* X axis line */}
        <line
          x1={PADDING.left}
          y1={PADDING.top + chartH}
          x2={SVG_WIDTH - PADDING.right}
          y2={PADDING.top + chartH}
          stroke="#e0e0e0"
          strokeWidth={1}
        />
      </svg>
    </div>
  )
}
