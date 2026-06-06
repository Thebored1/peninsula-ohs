'use client'

import { useState, useTransition } from 'react'
import { Tile, Select, SelectItem, Button, InlineNotification } from '@carbon/react'
import { assignInduction } from '@/app/actions/training'

interface Worker { id: string; first_name: string; last_name: string }
interface Props { programId: string; workers: Worker[] }

export function AssignInductionPanel({ programId, workers }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [workerId, setWorkerId] = useState('')

  function handleAssign() {
    if (!workerId) { setError('Please select a worker'); return }
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await assignInduction(workerId, programId)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setWorkerId('')
      }
    })
  }

  return (
    <Tile style={{ padding: 0, marginBottom: '1rem' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Assign to Worker</h2>
      </div>
      <div style={{ padding: '1.5rem' }}>
        {error && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={error}
            onCloseButtonClick={() => setError(null)}
            style={{ marginBottom: '1rem' }}
          />
        )}
        {success && (
          <InlineNotification
            kind="success"
            title="Assigned"
            subtitle="Induction assigned successfully"
            onCloseButtonClick={() => setSuccess(false)}
            style={{ marginBottom: '1rem' }}
          />
        )}
        <div style={{ marginBottom: '1rem' }}>
          <Select
            id="assign_worker_id"
            labelText="Select Worker"
            value={workerId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWorkerId(e.target.value)}
          >
            <SelectItem value="" text="Choose worker…" />
            {workers.map((w) => (
              <SelectItem key={w.id} value={w.id} text={`${w.last_name}, ${w.first_name}`} />
            ))}
          </Select>
        </div>
        <Button size="sm" disabled={isPending || !workerId} onClick={handleAssign}>
          {isPending ? 'Assigning…' : 'Assign Induction'}
        </Button>
      </div>
    </Tile>
  )
}
