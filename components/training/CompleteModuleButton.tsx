'use client'
import { useState, useTransition } from 'react'
import { completeModule } from '@/app/actions/training'

interface Props { moduleId: string; courseId: string; isCompleted: boolean }

export function CompleteModuleButton({ moduleId, courseId, isCompleted }: Props) {
  const [done, setDone] = useState(isCompleted)
  const [isPending, startTransition] = useTransition()

  function handleComplete() {
    startTransition(async () => {
      const result = await completeModule(moduleId)
      if (!result?.error) setDone(true)
    })
  }

  if (done) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(36,161,72,0.1)', border: '1px solid #24a148', borderRadius: '2px' }}>
        <span style={{ color: '#24a148', fontSize: '1rem' }}>✓</span>
        <span style={{ color: '#24a148', fontSize: '0.875rem', fontWeight: 600 }}>Completed</span>
      </div>
    )
  }

  return (
    <button
      onClick={handleComplete}
      disabled={isPending}
      style={{ padding: '0.625rem 1.25rem', background: '#0f62fe', color: '#fff', border: 'none', cursor: isPending ? 'wait' : 'pointer', fontSize: '0.875rem' }}
    >
      {isPending ? 'Saving…' : 'Mark as Complete'}
    </button>
  )
}
