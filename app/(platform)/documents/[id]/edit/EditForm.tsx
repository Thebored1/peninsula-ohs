'use client'

import { useState, useTransition } from 'react'
import {
  Grid, Column, Tile, Button, TextInput, TextArea, Select, SelectItem,
  Form, FormGroup, InlineNotification,
} from '@carbon/react'
import { updateDocument } from '@/app/actions/documents'

interface DocType { id: string; name: string }
interface DocStatus { id: string; name: string }

interface InitialData {
  title: string
  document_type_id: string | null
  status_id: string | null
  description: string | null
  review_due_date: string | null
  version: string | null
}

interface Props {
  id: string
  initialData: InitialData
  docTypes: DocType[]
  docStatuses: DocStatus[]
}

export function EditDocumentForm({ id, initialData, docTypes, docStatuses }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateDocument(id, formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {error && (
        <InlineNotification kind="error" title="Error" subtitle={error} onCloseButtonClick={() => setError(null)} style={{ marginBottom: '1.5rem', maxWidth: '100%' }} />
      )}
      <Form onSubmit={handleSubmit}>
        <Grid>
          <Column sm={4} md={8} lg={12}>
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Document Details</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <Grid condensed>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextInput id="title" name="title" labelText="Title *" defaultValue={initialData.title} required />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="document_type_id" name="document_type_id" labelText="Document Type" defaultValue={initialData.document_type_id ?? ''}>
                        <SelectItem value="" text="Select type…" />
                        {docTypes.map((t) => <SelectItem key={t.id} value={t.id} text={t.name} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <FormGroup legendText="">
                      <Select id="status_id" name="status_id" labelText="Status" defaultValue={initialData.status_id ?? ''}>
                        <SelectItem value="" text="Select status…" />
                        {docStatuses.map((s) => <SelectItem key={s.id} value={s.id} text={s.name} />)}
                      </Select>
                    </FormGroup>
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="version" name="version" labelText="Version" defaultValue={initialData.version ?? '1.0'} />
                  </Column>
                  <Column sm={4} md={4} lg={8} style={{ marginBottom: '1rem' }}>
                    <TextInput id="review_due_date" name="review_due_date" labelText="Review Due Date" type="date" defaultValue={initialData.review_due_date ?? ''} />
                  </Column>
                  <Column sm={4} md={8} lg={16} style={{ marginBottom: '1rem' }}>
                    <TextArea id="description" name="description" labelText="Description" defaultValue={initialData.description ?? ''} rows={3} />
                  </Column>
                </Grid>
              </div>
            </Tile>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save Changes'}</Button>
              <Button kind="ghost" href={`/documents/${id}`}>Cancel</Button>
            </div>
          </Column>
        </Grid>
      </Form>
    </div>
  )
}
