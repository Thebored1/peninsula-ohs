'use client'

import { useState, useTransition } from 'react'
import {
  Button, TextInput, Form, InlineNotification, Modal,
} from '@carbon/react'
import { addContractorWorker } from '@/app/actions/contractors'

interface Props {
  contractorId: string
}

export function AddWorkerPanel({ contractorId }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('contractor_id', contractorId)
    startTransition(async () => {
      const result = await addContractorWorker(formData)
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
        + Add Worker
      </button>

      <Modal
        open={open}
        modalHeading="Add Contractor Worker"
        primaryButtonText={isPending ? 'Saving…' : 'Add Worker'}
        secondaryButtonText="Cancel"
        onRequestClose={() => setOpen(false)}
        onSecondarySubmit={() => setOpen(false)}
        onRequestSubmit={() => {
          const form = document.getElementById('add-worker-form') as HTMLFormElement | null
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
        <Form id="add-worker-form" onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <TextInput id="w_first_name" name="first_name" labelText="First Name *" required />
            <TextInput id="w_last_name" name="last_name" labelText="Last Name *" required />
          </div>
          <TextInput id="w_email" name="email" labelText="Email" type="email" style={{ marginBottom: '1rem' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <TextInput id="w_phone" name="phone" labelText="Phone" />
            <TextInput id="w_role" name="role" labelText="Role / Trade" />
          </div>
        </Form>
      </Modal>
    </>
  )
}
