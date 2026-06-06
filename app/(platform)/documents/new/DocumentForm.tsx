'use client'

import { useState } from 'react'
import {
  Grid, Column, Tile, Button, Select, SelectItem, TextInput, TextArea,
  Form, FormGroup, InlineNotification, Toggle,
} from '@carbon/react'
import { createClient } from '@/lib/supabase/client'

const PROVINCES = [
  { code: 'ON', name: 'Ontario' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'AB', name: 'Alberta' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'NL', name: 'Newfoundland & Labrador' },
  { code: 'YT', name: 'Yukon' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
]

interface DocType { id: string; name: string }
interface DocStatus { id: string; name: string }
interface User { id: string; first_name: string; last_name: string }
interface Workflow { id: string; name: string; is_default: boolean }

interface Props {
  docTypes: DocType[]
  docStatuses: DocStatus[]
  users: User[]
  workflows: Workflow[]
  action: (formData: FormData) => Promise<{ error?: string }>
}

export function DocumentForm({ docTypes, docStatuses, users, workflows, action }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requiresAck, setRequiresAck] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.set('requires_acknowledgement', requiresAck ? 'true' : 'false')

    // FILE UPLOAD PATTERN
    const supabase = createClient()
    const fileInput = e.currentTarget.querySelector('input[data-upload="true"]') as HTMLInputElement
    const file = fileInput?.files?.[0]
    if (file) {
      const ext = file.name.split('.').pop() ?? 'bin'
      const uploadPath = crypto.randomUUID() + '.' + ext
      const { data: upload, error: uploadErr } = await supabase.storage.from('documents').upload(uploadPath, file, { upsert: true })
      if (uploadErr) { setError('File upload failed: ' + uploadErr.message); setLoading(false); return }
      if (upload) {
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(upload.path)
        formData.set('file_url', urlData.publicUrl)
        formData.set('file_name', file.name)
        formData.set('file_size_bytes', String(file.size))
        formData.set('file_mime_type', file.type)
      }
    }

    const result = await action(formData)
    if (result?.error) { setError(result.error); setLoading(false) }
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {error && (
        <div style={{ marginBottom: '1.5rem' }}>
          <InlineNotification kind="error" title="Error" subtitle={error} onCloseButtonClick={() => setError(null)} lowContrast />
        </div>
      )}
      <Form onSubmit={handleSubmit}>
        <Grid>

          {/* Document File */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Attach Document File</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#6f6f6f', marginBottom: '1rem' }}>
                  Attach the actual document file. Supported formats: PDF, Word, Excel, PowerPoint, plain text.
                </p>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.5rem' }}>
                  Upload File (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT)
                </p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  data-upload="true"
                  style={{ display: 'block', marginBottom: '1rem', fontSize: '0.875rem' }}
                />
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput
                        id="version_number"
                        name="version_number"
                        labelText="Version Number"
                        defaultValue="1.0"
                      />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Document Details */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Document Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="title" name="title" labelText="Title *" placeholder="Document title" required />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="document_type_id" name="document_type_id" labelText="Document Type">
                        <SelectItem value="" text="Select type…" />
                        {docTypes.map((t) => <SelectItem key={t.id} value={t.id} text={t.name} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="status_id" name="status_id" labelText="Status">
                        <SelectItem value="" text="Draft (default)" />
                        {docStatuses.map((s) => <SelectItem key={s.id} value={s.id} text={s.name} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="review_due_date" name="review_due_date" labelText="Review Due Date" type="date" />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <TextInput id="expiry_date" name="expiry_date" labelText="Expiry / Sunset Date" type="date" />
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={8} lg={16}>
                    <FormGroup legendText="">
                      <TextArea id="description" name="description" labelText="Description" rows={3} placeholder="Brief description of the document's purpose…" />
                    </FormGroup>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Ownership */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Ownership</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
                      <Select id="review_workflow_id" name="review_workflow_id" labelText="Review Workflow">
                        <SelectItem value="" text="None (no approval required)" />
                        {workflows.map((w) => (
                          <SelectItem key={w.id} value={w.id} text={w.name + (w.is_default ? ' (default)' : '')} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <FormGroup legendText="" style={{ marginBottom: '1.5rem' }}>
                      <Select id="owner_id" name="owner_id" labelText="Document Owner">
                        <SelectItem value="" text="Select owner…" />
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id} text={u.first_name + ' ' + u.last_name} />
                        ))}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <div style={{ paddingTop: '1.5rem' }}>
                      <Toggle
                        id="requires_acknowledgement"
                        labelText="Requires worker acknowledgement"
                        toggled={requiresAck}
                        onToggle={(checked: boolean) => setRequiresAck(checked)}
                        size="sm"
                      />
                    </div>
                  </Column>
                </Grid>
              </div>
            </Tile>
          </Column>

          {/* Province / Jurisdiction */}
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Province / Jurisdiction</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#6f6f6f', marginBottom: '1rem' }}>
                  Select which Canadian provinces this applies to. Leave blank to apply to all.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {PROVINCES.map((p) => (
                    <label key={p.code} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', color: '#161616' }}>
                      <input type="checkbox" name="applicable_provinces" value={p.code} style={{ cursor: 'pointer' }} />
                      <span><strong>{p.code}</strong> — {p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Tile>
          </Column>

          <Column sm={4} md={8} lg={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Button kind="primary" type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save Document'}</Button>
              <Button kind="ghost" href="/documents">Cancel</Button>
            </div>
          </Column>

        </Grid>
      </Form>
    </div>
  )
}
