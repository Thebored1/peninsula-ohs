'use client'

import { useState } from 'react'

interface CertificateButtonProps {
  workerName: string
  courseName: string
  completedDate: string
  expiryDate: string | null
  recordNumber: string
  orgName: string
}

export function CertificateButton(props: CertificateButtonProps) {
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const W = 297, H = 210

      // Border
      doc.setDrawColor(15, 98, 254) // #0f62fe
      doc.setLineWidth(3)
      doc.rect(10, 10, W - 20, H - 20)
      doc.setLineWidth(1)
      doc.rect(14, 14, W - 28, H - 28)

      // Organisation name
      doc.setFontSize(12); doc.setTextColor(82, 82, 82)
      doc.text(props.orgName, W / 2, 35, { align: 'center' })

      // Certificate title
      doc.setFontSize(28); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 98, 254)
      doc.text('CERTIFICATE OF COMPLETION', W / 2, 60, { align: 'center' })

      // "This is to certify that"
      doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.setTextColor(82, 82, 82)
      doc.text('This is to certify that', W / 2, 80, { align: 'center' })

      // Worker name
      doc.setFontSize(24); doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 22, 22)
      doc.text(props.workerName, W / 2, 96, { align: 'center' })

      // Underline
      const nameWidth = doc.getTextWidth(props.workerName)
      doc.setDrawColor(22, 22, 22); doc.setLineWidth(0.5)
      doc.line(W / 2 - nameWidth / 2, 99, W / 2 + nameWidth / 2, 99)

      // "has successfully completed"
      doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.setTextColor(82, 82, 82)
      doc.text('has successfully completed', W / 2, 112, { align: 'center' })

      // Course name
      doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 22, 22)
      doc.text(props.courseName, W / 2, 126, { align: 'center' })

      // Dates
      doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(82, 82, 82)
      doc.text(`Completed: ${props.completedDate}`, W / 2 - 40, 148, { align: 'right' })
      if (props.expiryDate) {
        doc.text(`Valid Until: ${props.expiryDate}`, W / 2 + 40, 148, { align: 'left' })
      }

      // Record number
      doc.setFontSize(9); doc.setTextColor(111, 111, 111)
      doc.text(`Record: ${props.recordNumber}`, W / 2, H - 22, { align: 'center' })

      doc.save(`certificate-${props.recordNumber}.pdf`)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={generating}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.625rem 1rem',
        backgroundColor: '#0f62fe',
        color: '#fff',
        border: 'none',
        cursor: generating ? 'wait' : 'pointer',
        fontSize: '0.875rem',
        fontWeight: 400,
      }}
    >
      {generating ? 'Generating…' : 'Download Certificate'}
    </button>
  )
}
