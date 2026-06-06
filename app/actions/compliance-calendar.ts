'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ---------------------------------------------------------------------------
// createComplianceObligation
// Creates a new compliance obligation (master record).
// On success, redirects to the detail page.
// ---------------------------------------------------------------------------
export async function createComplianceCalendar(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const description         = (formData.get('description') as string | null)?.trim() || null
  const obligationTypeId    = (formData.get('obligation_type_id') as string | null) || null
  const regulatoryBody      = (formData.get('regulatory_body') as string | null)?.trim() || null
  const standardReference   = (formData.get('standard_reference') as string | null)?.trim() || null
  const siteId              = (formData.get('site_id') as string | null) || null
  const frequency           = (formData.get('frequency') as string | null) || 'annual'
  const nextDueDate         = (formData.get('next_due_date') as string | null) || null
  const ownerId             = (formData.get('owner_id') as string | null) || null
  const isCriticalRaw       = formData.get('is_critical')
  const isCritical          = isCriticalRaw === 'true' || isCriticalRaw === 'on'

  const validFrequencies = [
    'one_time', 'daily', 'weekly', 'monthly',
    'quarterly', 'semi_annual', 'annual', 'biennial',
  ] as const
  type Frequency = typeof validFrequencies[number]

  if (frequency && !validFrequencies.includes(frequency as Frequency)) {
    return { error: 'Invalid frequency value' }
  }

  const { data: obligation, error } = await supabase
    .from('compliance_obligations')
    .insert({
      organisation_id:    profile.organisation_id,
      title,
      description,
      obligation_type_id: obligationTypeId,
      regulatory_body:    regulatoryBody,
      standard_reference: standardReference,
      site_id:            siteId,
      frequency:          frequency as Frequency,
      next_due_date:      nextDueDate,
      owner_id:           ownerId,
      status:             'active',
      is_critical:        isCritical,
      created_by:         user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/compliance-calendar')
  redirect(`/compliance-calendar/${obligation.id}`)
}

// ---------------------------------------------------------------------------
// updateComplianceCalendarStatus
// Updates the status of a compliance obligation.
// ---------------------------------------------------------------------------
export async function updateComplianceCalendarStatus(
  id: string,
  status: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const validStatuses = ['active', 'inactive', 'superseded'] as const
  type ObligationStatus = typeof validStatuses[number]

  if (!validStatuses.includes(status as ObligationStatus)) {
    return { error: `Invalid status "${status}". Must be one of: ${validStatuses.join(', ')}` }
  }

  const { error } = await supabase
    .from('compliance_obligations')
    .update({
      status:     status as ObligationStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/compliance-calendar/${id}`)
  revalidatePath('/compliance-calendar')
  return {}
}

// ---------------------------------------------------------------------------
// createComplianceTask
// Creates a single compliance task linked to an obligation.
// On success, redirects to the task detail page.
// ---------------------------------------------------------------------------
export async function createComplianceTask(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const obligationId = (formData.get('obligation_id') as string | null)
  if (!obligationId) return { error: 'Obligation is required' }

  const title       = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const dueDate     = (formData.get('due_date') as string | null)
  if (!dueDate) return { error: 'Due date is required' }

  const description  = (formData.get('description') as string | null)?.trim() || null
  const assignedTo   = (formData.get('assigned_to') as string | null) || null
  const evidenceNotes = (formData.get('evidence_notes') as string | null)?.trim() || null

  const { data: task, error } = await supabase
    .from('compliance_tasks')
    .insert({
      organisation_id: profile.organisation_id,
      obligation_id:   obligationId,
      title,
      description,
      due_date:        dueDate,
      assigned_to:     assignedTo,
      status:          'pending',
      evidence_notes:  evidenceNotes,
      created_by:      user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/compliance-calendar/${obligationId}`)
  revalidatePath('/compliance-calendar')
  redirect(`/compliance-calendar/tasks/${task.id}`)
}

// ---------------------------------------------------------------------------
// updateComplianceTaskStatus
// Updates the status of a compliance task, recording completion metadata
// when the new status is 'completed'.
// ---------------------------------------------------------------------------
export async function updateComplianceTaskStatus(
  id: string,
  status: string,
  evidenceNotes?: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const validStatuses = ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'] as const
  type TaskStatus = typeof validStatuses[number]

  if (!validStatuses.includes(status as TaskStatus)) {
    return { error: `Invalid status "${status}". Must be one of: ${validStatuses.join(', ')}` }
  }

  const updatePayload: Record<string, unknown> = {
    status:     status as TaskStatus,
    updated_at: new Date().toISOString(),
  }

  if (status === 'completed') {
    updatePayload.completed_at = new Date().toISOString()
    updatePayload.completed_by = user.id
    if (evidenceNotes?.trim()) {
      updatePayload.evidence_notes = evidenceNotes.trim()
    }
  }

  const { error } = await supabase
    .from('compliance_tasks')
    .update(updatePayload)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/compliance-calendar')
  return {}
}
