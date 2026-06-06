'use client'

import { useState, useTransition } from 'react'
import {
  TextInput, TextArea, Form, InlineNotification, Modal, Select, SelectItem, FormGroup,
} from '@carbon/react'
import { createPrequalAssessment } from '@/app/actions/contractors'

interface Props {
  contractorId: string
}

export function AssessmentPanel({ contractorId }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('contractor_id', contractorId)
    startTransition(async () => {
      const result = await createPrequalAssessment(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          fontSize: '0.875rem',
          color: '#0f62fe',
          background: 'none',
          border: '1px solid #0f62fe',
          borderRadius: '2px',
          padding: '0.25rem 0.625rem',
          cursor: 'pointer',
        }}
      >
        + New Assessment
      </button>

      <Modal
        open={open}
        modalHeading="Prequalification Assessment"
        primaryButtonText={isPending ? 'Saving…' : 'Record Assessment'}
        secondaryButtonText="Cancel"
        onRequestClose={() => setOpen(false)}
        onSecondarySubmit={() => setOpen(false)}
        onRequestSubmit={() => {
          const form = document.getElementById('assessment-form') as HTMLFormElement | null
          form?.requestSubmit()
        }}
        primaryButtonDisabled={isPending}
        size="sm"
      >
        {error && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={error}
            onCloseButtonClick={() => setError(null)}
            style={{ marginBottom: '1rem' }}
          />
        )}
        <Form id="assessment-form" onSubmit={handleSubmit}>
          <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
            <Select id="a_decision" name="decision" labelText="Decision *" defaultValue="" required>
              <SelectItem value="" text="Select decision…" />
              <SelectItem value="approved" text="Approved" />
              <SelectItem value="conditionally_approved" text="Conditionally Approved" />
              <SelectItem value="rejected" text="Rejected" />
            </Select>
          </FormGroup>
          <TextInput
            id="a_expiry_date"
            name="expiry_date"
            labelText="Expiry Date"
            type="date"
            style={{ marginBottom: '1rem' }}
          />
          <TextArea
            id="a_decision_notes"
            name="decision_notes"
            labelText="Decision Notes"
            rows={3}
            style={{ marginBottom: '1rem' }}
          />
          <TextArea
            id="a_conditions"
            name="conditions"
            labelText="Conditions (if conditionally approved)"
            rows={2}
          />
        </Form>
      </Modal>
    </>
  )
}
