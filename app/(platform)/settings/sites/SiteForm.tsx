'use client'

import { useState, useRef } from 'react'
import {
  Button, Select, SelectItem, TextInput, FormGroup, InlineNotification, InlineLoading,
} from '@carbon/react'

interface Props {
  action: (formData: FormData) => Promise<{ error?: string }>
}

export function SiteForm({ action }: Props) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)
    const result = await action(new FormData(e.currentTarget))
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      formRef.current?.reset()
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <InlineNotification kind="error" title="Error" subtitle={error} onCloseButtonClick={() => setError(null)} lowContrast />
        </div>
      )}
      {success && (
        <div style={{ marginBottom: '1rem' }}>
          <InlineNotification kind="success" title="Added" subtitle="Site created." onCloseButtonClick={() => setSuccess(false)} lowContrast />
        </div>
      )}
      <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
        <TextInput id="site-name" name="name" labelText="Site Name *" required />
      </FormGroup>
      <FormGroup legendText="" style={{ marginBottom: '1rem' }}>
        <TextInput id="site-code" name="code" labelText="Code" placeholder="e.g. SYD-WH" />
      </FormGroup>
      <FormGroup legendText="" style={{ marginBottom: '1.5rem' }}>
        <Select id="site-type" name="site_type" labelText="Site Type">
          <SelectItem value="" text="Not specified" />
          <SelectItem value="warehouse" text="Warehouse" />
          <SelectItem value="office" text="Office" />
          <SelectItem value="factory" text="Factory" />
          <SelectItem value="construction" text="Construction" />
          <SelectItem value="mine" text="Mine / Quarry" />
          <SelectItem value="farm" text="Farm" />
        </Select>
      </FormGroup>
      {loading
        ? <InlineLoading description="Adding…" />
        : <Button kind="primary" type="submit" size="sm">Add Site</Button>}
    </form>
  )
}
