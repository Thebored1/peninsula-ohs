'use client'

import { useState } from 'react'
import {
  Grid, Column, Tile, Button, Select, SelectItem, TextInput, TextArea,
  InlineNotification, FormGroup,
} from '@carbon/react'

interface AuditType { id: string; name: string }
interface Template {
  id: string; name: string; standard_reference: string | null
  audit_types: { name: string } | { name: string }[] | null
}
interface User { id: string; first_name: string; last_name: string }

interface Props {
  auditTypes: AuditType[]
  templates: Template[]
  users: User[]
  action: (formData: FormData) => Promise<{ error?: string }>
}

export function AuditForm({ auditTypes, templates, users, action }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await action(new FormData(e.currentTarget))
    if (result?.error) { setError(result.error); setLoading(false) }
  }

  function tplTypeName(t: Template): string | null {
    const raw = t.audit_types
    const obj = Array.isArray(raw) ? raw[0] : raw
    return (obj as { name: string } | null)?.name ?? null
  }

  return (
    <form onSubmit={handleSubmit}>
      <Grid>
        <Column sm={4} md={8} lg={12}>
          {error && (
            <div style={{ marginBottom: '1rem' }}>
              <InlineNotification kind="error" title="Error" subtitle={error} lowContrast />
            </div>
          )}
          <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '1.5rem' }}>
              Audit Details
            </h2>
            <FormGroup legendText="">
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <TextInput id="title" name="title" labelText="Audit Title" placeholder="e.g. Q2 Site Safety Audit" required />
                  </div>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <Select id="audit_type_id" name="audit_type_id" labelText="Audit Type" required>
                      <SelectItem value="" text="Select a type…" />
                      {auditTypes.map(t => <SelectItem key={t.id} value={t.id} text={t.name} />)}
                    </Select>
                  </div>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <Select
                      id="template_id"
                      name="template_id"
                      labelText="Template (optional)"
                      onChange={e => setSelectedTemplate(templates.find(t => t.id === e.target.value) ?? null)}
                    >
                      <SelectItem value="" text="No template (ad-hoc)" />
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id} text={tplTypeName(t) ? `${t.name} (${tplTypeName(t)})` : t.name} />
                      ))}
                    </Select>
                  </div>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <Select id="lead_auditor_id" name="lead_auditor_id" labelText="Lead Auditor">
                      <SelectItem value="" text="Assign later" />
                      {users.map(u => <SelectItem key={u.id} value={u.id} text={`${u.first_name} ${u.last_name}`} />)}
                    </Select>
                  </div>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <TextInput id="standard_reference" name="standard_reference" labelText="Standard / Regulation Reference"
                      defaultValue={selectedTemplate?.standard_reference ?? ''}
                      placeholder="e.g. ISO 45001:2018" />
                  </div>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <TextInput id="planned_start_date" name="planned_start_date" labelText="Planned Start Date" type="date" />
                  </div>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <TextInput id="planned_end_date" name="planned_end_date" labelText="Planned End Date" type="date" />
                  </div>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <div style={{ marginBottom: '1rem' }}>
                    <TextInput id="report_due_date" name="report_due_date" labelText="Report Due Date" type="date" />
                  </div>
                </Column>
                <Column sm={4} md={8} lg={16}>
                  <div style={{ marginBottom: '1rem' }}>
                    <TextArea id="scope" name="scope" labelText="Scope" rows={2}
                      placeholder="What areas, processes, or systems are being audited?" />
                  </div>
                </Column>
                <Column sm={4} md={8} lg={16}>
                  <TextArea id="objectives" name="objectives" labelText="Objectives (optional)" rows={2}
                    placeholder="What the audit aims to achieve…" />
                </Column>
              </Grid>
            </FormGroup>
          </Tile>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button type="submit" kind="primary" disabled={loading}>{loading ? 'Creating…' : 'Schedule Audit'}</Button>
            <Button kind="secondary" href="/audits">Cancel</Button>
          </div>
        </Column>
      </Grid>
    </form>
  )
}
