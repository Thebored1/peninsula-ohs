'use client'

import React, { useState, useRef, useTransition } from 'react'
import { Button, TextInput, Checkbox, InlineNotification } from '@carbon/react'
import { createClient } from '@/lib/supabase/client'

interface SignatureCaptureProps {
  documentId: string
  versionId: string | null
  signatureMethod: 'draw' | 'type' | 'either'
  onComplete: () => void
}

export function SignatureCapture({
  documentId,
  versionId,
  signatureMethod,
  onComplete,
}: SignatureCaptureProps) {
  const defaultTab = signatureMethod === 'type' ? 'type' : 'draw'
  const [activeTab, setActiveTab] = useState<'draw' | 'type'>(defaultTab)
  const [isEmpty, setIsEmpty] = useState(true)
  const [signerName, setSignerName] = useState('')
  const [ackChecked, setAckChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  function getCanvasPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    isDrawing.current = true
    lastPos.current = getCanvasPos(e)
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getCanvasPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#161616'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
    lastPos.current = pos
    if (isEmpty) setIsEmpty(false)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    isDrawing.current = false
    ;(e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId)
  }

  function handleClear() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
  }

  const canSubmit =
    activeTab === 'draw'
      ? !isEmpty
      : signerName.trim().length > 0 && ackChecked

  async function handleSign() {
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      let signatureImageUrl: string | null = null
      let resolvedSignerName: string | null = null

      if (activeTab === 'draw') {
        const canvas = canvasRef.current!
        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), 'image/png')
        )
        const fileName = crypto.randomUUID() + '.png'
        const { data: upload } = await supabase.storage
          .from('signatures')
          .upload(fileName, blob, { contentType: 'image/png' })
        if (upload) {
          const { data: urlData } = supabase.storage
            .from('signatures')
            .getPublicUrl(upload.path)
          signatureImageUrl = urlData.publicUrl
        }
      } else {
        resolvedSignerName = signerName.trim()
      }

      const { acknowledgeDocument } = await import('@/app/actions/documents')
      const fd = new FormData()
      fd.set('document_id', documentId)
      if (versionId) fd.set('version_id', versionId)
      fd.set('method', 'digital_sign')
      if (resolvedSignerName) fd.set('signer_name', resolvedSignerName)
      if (signatureImageUrl) fd.set('signature_image_url', signatureImageUrl)
      const result = await acknowledgeDocument(fd)
      if (result?.error) {
        setError(result.error)
        return
      }
      onComplete()
    })
  }

  const tabButtonStyle = (tab: 'draw' | 'type'): React.CSSProperties => ({
    padding: '0.5rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: activeTab === tab ? 600 : 400,
    color: activeTab === tab ? '#161616' : '#525252',
    background: 'none',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid #0f62fe' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'border-color 0.1s, color 0.1s',
  })

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e0e0e0', padding: '1.5rem', maxWidth: '480px' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 400, color: '#161616', marginBottom: '1.25rem' }}>
        Sign this Document
      </h2>

      {/* Tab selector */}
      {signatureMethod !== 'draw' && signatureMethod !== 'type' && (
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', marginBottom: '1.25rem' }}>
          <button style={tabButtonStyle('draw')} onClick={() => setActiveTab('draw')}>
            Draw Signature
          </button>
          <button style={tabButtonStyle('type')} onClick={() => setActiveTab('type')}>
            Type Name
          </button>
        </div>
      )}

      {/* Draw tab */}
      {activeTab === 'draw' && (
        <div>
          <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '0.75rem' }}>
            Draw your signature in the box below
          </p>
          <canvas
            ref={canvasRef}
            width={400}
            height={150}
            style={{ border: '1px solid #e0e0e0', cursor: 'crosshair', touchAction: 'none', display: 'block' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
          <div style={{ marginTop: '0.5rem' }}>
            <Button kind="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Type tab */}
      {activeTab === 'type' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextInput
            id="signer_name"
            labelText="Full Name"
            placeholder="Type your full name to sign"
            required
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
          />
          <Checkbox
            id="ack_confirm"
            labelText="I confirm I have read and understood this document"
            checked={ackChecked}
            onChange={(_e: React.ChangeEvent<HTMLInputElement>, { checked }: { checked: boolean }) =>
              setAckChecked(checked)
            }
          />
        </div>
      )}

      {/* Error notification */}
      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
          style={{ marginTop: '1rem', maxWidth: '100%' }}
        />
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
        <Button kind="ghost" onClick={onComplete} disabled={isPending}>
          Cancel
        </Button>
        <Button
          kind="primary"
          onClick={handleSign}
          disabled={!canSubmit || isPending}
        >
          {isPending ? 'Signing…' : 'Sign & Acknowledge'}
        </Button>
      </div>
    </div>
  )
}
