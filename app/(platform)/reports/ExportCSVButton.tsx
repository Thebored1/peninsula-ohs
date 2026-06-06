'use client'

import { useState } from 'react'
import { Button } from '@carbon/react'
import { exportKPIData } from '@/app/actions/reports'

interface ExportCSVButtonProps {
  orgId: string
}

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

export default function ExportCSVButton({ orgId }: ExportCSVButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const result = await exportKPIData(orgId)
      if (result.error || !result.rows.length) {
        alert(result.error ?? 'No data to export')
        return
      }
      const csv = result.rows
        .map((row) => row.map(escapeCSV).join(','))
        .join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kpi-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button kind="secondary" size="md" onClick={handleExport} disabled={loading}>
      {loading ? 'Exporting...' : 'Export CSV'}
    </Button>
  )
}
