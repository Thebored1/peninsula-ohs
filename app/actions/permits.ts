'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getStatusId(supabase: Awaited<ReturnType<typeof createClient>>, code: string) {
  const { data } = await supabase
    .from('permit_statuses')
    .select('id')
    .eq('code', code)
    .single()
  return data?.id ?? null
}

export async function createPermit(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const permitTypeId = formData.get('permit_type_id') as string
  const title = formData.get('title') as string
  const workDescription = formData.get('work_description') as string
  const exactLocation = formData.get('exact_location') as string | null
  const validFrom = formData.get('valid_from') as string | null
  const validUntil = formData.get('valid_until') as string | null
  const responsiblePersonId = formData.get('responsible_person_id') as string | null

  if (!permitTypeId) return { error: 'Permit type is required' }
  if (!title?.trim()) return { error: 'Title is required' }
  if (!workDescription?.trim()) return { error: 'Work description is required' }

  const draftStatusId = await getStatusId(supabase, 'draft')
  if (!draftStatusId) return { error: 'Status configuration missing — run DB seed.' }

  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('organisation_id', profile.organisation_id)
    .limit(1)
    .maybeSingle()

  const isolationRequirements = formData.get('isolation_requirements') as string | null
  const preWorkChecklistCompleted = formData.get('pre_work_checklist_completed') === 'true'

  const { data: permit, error } = await supabase
    .from('permits')
    .insert({
      organisation_id: profile.organisation_id,
      site_id: site?.id ?? null,
      permit_type_id: permitTypeId,
      status_id: draftStatusId,
      title: title.trim(),
      work_description: workDescription.trim(),
      exact_location: exactLocation?.trim() || null,
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      applicant_id: user.id,
      responsible_person_id: responsiblePersonId || null,
      created_by: user.id,
      isolation_requirements: isolationRequirements?.trim() || null,
      pre_work_checklist_completed: preWorkChecklistCompleted,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const permitId = permit.id

  // Insert hazards
  const hazardsRaw = formData.get('hazards') as string | null
  if (hazardsRaw) {
    try {
      const hazards = JSON.parse(hazardsRaw) as Array<{ description: string; riskLevel: string }>
      const validHazards = hazards.filter(h => h.description?.trim())
      if (validHazards.length > 0) {
        await supabase.from('permit_hazards').insert(
          validHazards.map(h => ({
            permit_id: permitId,
            organisation_id: profile.organisation_id,
            hazard_description: h.description.trim(),
            created_by: user.id,
          }))
        )
      }
    } catch { /* ignore parse errors */ }
  }

  // Insert control measures
  const controlsRaw = formData.get('controls') as string | null
  if (controlsRaw) {
    try {
      const controls = JSON.parse(controlsRaw) as Array<{ description: string; type: string }>
      const validControls = controls.filter(c => c.description?.trim())
      if (validControls.length > 0) {
        // Map form control types to DB constraint values
        const typeMap: Record<string, string> = {
          elimination: 'eliminate', substitution: 'substitute',
          engineering: 'engineer', administrative: 'admin', ppe: 'ppe',
        }
        await supabase.from('permit_control_measures').insert(
          validControls.map(c => ({
            permit_id: permitId,
            organisation_id: profile.organisation_id,
            control_type: typeMap[c.type] ?? 'admin',
            description: c.description.trim(),
            is_verified: false,
          }))
        )
      }
    } catch { /* ignore parse errors */ }
  }

  // Insert workers
  const workersRaw = formData.get('workers') as string | null
  if (workersRaw) {
    try {
      const workers = JSON.parse(workersRaw) as Array<{ workerId: string; workerName: string; role: string }>
      const validWorkers = workers.filter(w => w.workerName?.trim())
      if (validWorkers.length > 0) {
        await supabase.from('permit_workers').insert(
          validWorkers.map(w => ({
            permit_id: permitId,
            organisation_id: profile.organisation_id,
            full_name: w.workerName.trim(),
            role_on_job: w.role?.trim() || null,
            induction_verified: false,
          }))
        )
      }
    } catch { /* ignore parse errors */ }
  }

  // Insert default approval chain: Supervisor Review → HSE Officer Approval
  await supabase.from('permit_approvals').insert([
    {
      permit_id: permitId,
      organisation_id: profile.organisation_id,
      order_index: 0,
      step_name: 'Supervisor Review',
      decision: 'pending',
    },
    {
      permit_id: permitId,
      organisation_id: profile.organisation_id,
      order_index: 1,
      step_name: 'HSE Officer Approval',
      decision: 'pending',
    },
  ])

  revalidatePath('/permits')
  redirect(`/permits/${permitId}`)
}

export async function updatePermitStatus(
  id: string,
  statusCode: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const statusId = await getStatusId(supabase, statusCode)
  if (!statusId) return { error: `Unknown status: ${statusCode}` }

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { status_id: statusId, updated_at: now }
  if (statusCode === 'active') patch.actual_start = now
  if (statusCode === 'work_completed') patch.work_completed_at = now, patch.work_completed_by = user.id
  if (statusCode === 'site_cleared') patch.site_cleared_at = now, patch.site_cleared_by = user.id
  if (statusCode === 'closed') patch.closure_notes = 'Closed via system'

  const { error } = await supabase
    .from('permits')
    .update(patch)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/permits/${id}`)
  revalidatePath('/permits')
  return {}
}

export async function closePermit(id: string, notes: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const statusId = await getStatusId(supabase, 'closed')
  if (!statusId) return { error: 'Status configuration missing' }

  const { error } = await supabase
    .from('permits')
    .update({
      status_id: statusId,
      closure_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/permits/${id}`)
  revalidatePath('/permits')
  return {}
}

export async function cancelPermit(id: string): Promise<{ error?: string }> {
  return updatePermitStatus(id, 'cancelled')
}

export async function approvePermitStep(
  permitId: string,
  approvalId: string,
  notes: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('permit_approvals')
    .update({
      decision: 'approved',
      decision_notes: notes || null,
      decided_at: now,
      approver_id: user.id,
    })
    .eq('id', approvalId)

  if (error) return { error: error.message }

  // Check if all steps approved → advance to 'approved'
  const { data: allSteps } = await supabase
    .from('permit_approvals')
    .select('decision')
    .eq('permit_id', permitId)

  const allApproved = allSteps?.every(s => s.decision === 'approved')
  if (allApproved) await updatePermitStatus(permitId, 'approved')

  revalidatePath(`/permits/${permitId}`)
  return {}
}

export async function rejectPermitStep(
  permitId: string,
  approvalId: string,
  notes: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('permit_approvals')
    .update({
      decision: 'rejected',
      decision_notes: notes || null,
      decided_at: new Date().toISOString(),
      approver_id: user.id,
    })
    .eq('id', approvalId)

  if (error) return { error: error.message }

  await updatePermitStatus(permitId, 'rejected')
  revalidatePath(`/permits/${permitId}`)
  return {}
}

export async function addPermitWorker(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const permitId = formData.get('permit_id') as string
  const fullName = formData.get('full_name') as string
  const employer = formData.get('employer') as string | null
  const roleOnJob = formData.get('role_on_job') as string | null

  if (!fullName?.trim()) return { error: 'Name is required' }

  const { error } = await supabase.from('permit_workers').insert({
    permit_id: permitId,
    organisation_id: profile.organisation_id,
    full_name: fullName.trim(),
    employer: employer?.trim() || null,
    role_on_job: roleOnJob?.trim() || null,
    induction_verified: false,
  })

  if (error) return { error: error.message }

  revalidatePath(`/permits/${permitId}`)
  return {}
}

export async function addPermitHazard(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const permitId = formData.get('permit_id') as string
  const hazardDescription = formData.get('hazard_description') as string
  const potentialHarm = formData.get('potential_harm') as string | null

  if (!hazardDescription?.trim()) return { error: 'Hazard description is required' }

  const { error } = await supabase.from('permit_hazards').insert({
    permit_id: permitId,
    organisation_id: profile.organisation_id,
    hazard_description: hazardDescription.trim(),
    potential_harm: potentialHarm?.trim() || null,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath(`/permits/${permitId}`)
  return {}
}

export async function addPermitControl(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const permitId = formData.get('permit_id') as string
  const controlType = formData.get('control_type') as string
  const description = formData.get('description') as string

  if (!description?.trim()) return { error: 'Description is required' }

  const { error } = await supabase.from('permit_control_measures').insert({
    permit_id: permitId,
    organisation_id: profile.organisation_id,
    control_type: controlType || 'admin',
    description: description.trim(),
    is_verified: false,
  })

  if (error) return { error: error.message }

  revalidatePath(`/permits/${permitId}`)
  return {}
}

export async function addPermitPPE(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const permitId = formData.get('permit_id') as string
  const ppeTypeId = formData.get('ppe_type_id') as string
  const specification = formData.get('specification') as string | null

  if (!ppeTypeId) return { error: 'PPE type is required' }

  const { error } = await supabase.from('permit_ppe_requirements').insert({
    permit_id: permitId,
    organisation_id: profile.organisation_id,
    ppe_type_id: ppeTypeId,
    specification: specification?.trim() || null,
    is_mandatory: true,
  })

  if (error) return { error: error.message }

  revalidatePath(`/permits/${permitId}`)
  return {}
}

export async function addPermitCondition(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const permitId = formData.get('permit_id') as string
  const conditionText = formData.get('condition_text') as string

  if (!conditionText?.trim()) return { error: 'Condition text is required' }

  const { error } = await supabase.from('permit_conditions').insert({
    permit_id: permitId,
    organisation_id: profile.organisation_id,
    condition_text: conditionText.trim(),
    is_met: false,
  })

  if (error) return { error: error.message }

  revalidatePath(`/permits/${permitId}`)
  return {}
}

export async function addPermitApprovalStep(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const permitId = formData.get('permit_id') as string
  const stepName = formData.get('step_name') as string
  const approverId = formData.get('approver_id') as string | null

  if (!stepName?.trim()) return { error: 'Step name is required' }

  // Get highest existing order_index
  const { data: existing } = await supabase
    .from('permit_approvals')
    .select('order_index')
    .eq('permit_id', permitId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.order_index ?? -1) + 1

  const { error } = await supabase.from('permit_approvals').insert({
    permit_id: permitId,
    organisation_id: profile.organisation_id,
    order_index: nextOrder,
    step_name: stepName.trim(),
    approver_id: approverId || null,
    decision: 'pending',
  })

  if (error) return { error: error.message }

  revalidatePath(`/permits/${permitId}`)
  return {}
}

/**
 * Simple permit-level approve — marks the next pending approval step as approved
 * on behalf of the current user, then advances the permit to 'approved' if all steps done.
 */
export async function approvePermit(permitId: string, comments?: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: pending } = await supabase
    .from('permit_approvals')
    .select('id')
    .eq('permit_id', permitId)
    .eq('decision', 'pending')
    .order('order_index')
    .limit(1)
    .maybeSingle()

  if (!pending) return { error: 'No pending approval steps found' }

  return approvePermitStep(permitId, pending.id, comments ?? '')
}

export async function deletePermit(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('permits')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/permits')
  redirect('/permits')
}
