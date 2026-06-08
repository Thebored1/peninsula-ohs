'use client'

import { useState, useRef } from 'react'
import { Button, InlineLoading } from '@carbon/react'
import { Upload, Checkmark, TrashCan } from '@carbon/icons-react'

interface UploadResult {
  storagePath: string
  fileName: string
  fileSize: number
  mimeType: string
}

interface FileUploadFieldProps {
  module?: string
  recordId?: string
  onUpload: (result: UploadResult) => void
  onClear?: () => void
  accept?: string
  label?: string
  helperText?: string
  currentFileName?: string
}

export function FileUploadField({
  module = 'documents',
  recordId = 'draft',
  onUpload,
  onClear,
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png',
  label = 'Attach file',
  helperText = 'PDF, Word, Excel, images up to 50 MB',
  currentFileName,
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayName = uploaded?.fileName ?? currentFileName ?? null

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setUploading(true)

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('module', module)
      form.append('record_id', recordId)

      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Upload failed')
        return
      }

      setUploaded(json)
      onUpload(json)
    } catch {
      setError('Upload failed — check your connection and try again.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleClear() {
    setUploaded(null)
    setError(null)
    onClear?.()
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#161616', marginBottom: '0.375rem' }}>
        {label}
      </p>

      {displayName ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem 1rem', backgroundColor: '#f4f4f4', border: '1px solid #e0e0e0',
        }}>
          <Checkmark size={16} style={{ color: '#24a148', flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem', color: '#161616', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </span>
          <button
            type="button"
            onClick={handleClear}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.125rem', color: '#525252', display: 'flex' }}
            aria-label="Remove file"
          >
            <TrashCan size={16} />
          </button>
        </div>
      ) : uploading ? (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f4f4f4', border: '1px solid #e0e0e0' }}>
          <InlineLoading description="Uploading…" />
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="file-upload-input"
          />
          <Button
            kind="tertiary"
            size="sm"
            renderIcon={Upload}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            Choose file
          </Button>
        </div>
      )}

      {error && (
        <p style={{ fontSize: '0.75rem', color: '#da1e28', marginTop: '0.375rem' }}>{error}</p>
      )}
      {!displayName && !error && (
        <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.375rem' }}>{helperText}</p>
      )}
    </div>
  )
}
