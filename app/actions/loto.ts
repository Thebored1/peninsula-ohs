'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ---------------------------------------------------------------------------
// createLoto
// Creates a new LOTO procedure record. procedure_number is auto-generated
// by the database trigger (generate_loto_procedure_number).
// ---------------------------------------------------------------------------
export async function createLoto(formData: FormData): Promise<{ error?: string }> {
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

  const description       = (formData.get('description') as string)?.trim() || null
  const assetDescription  = (formData.get('asset_description') as string)?.trim() || null
  const siteId            = (formData.get('site_id') as string) || null
  const nextReviewDate    = (formData.get('next_review_date') as string) || null

  const { data: procedure, error } = await supabase
    .from('loto_procedures')
    .insert({
      organisation_id:  profile.organisation_id,
      title,
      description,
      asset_description: assetDescription,
      site_id:          siteId || null,
      status:           'draft',
      revision_number:  1,
      next_review_date: nextReviewDate || null,
      created_by:       user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/loto')
  redirect(`/loto/${procedure.id}`)
}

// ---------------------------------------------------------------------------
// updateLotoStatus
// Transitions a LOTO procedure to a new status.
// Valid transitions: draft → approved, approved → archived, approved → draft
// Sets approved_by / approved_at when moving to 'approved'.
// ---------------------------------------------------------------------------
export async function updateLotoStatus(
  id: string,
  status: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const validStatuses = ['draft', 'approved', 'archived']
  if (!validStatuses.includes(status)) {
    return { error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}` }
  }

  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'approved') {
    patch.approved_by = user.id
    patch.approved_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('loto_procedures')
    .update(patch)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/loto/${id}`)
  revalidatePath('/loto')
  return {}
}

// ---------------------------------------------------------------------------
// createLotoIsolationPoint
// Adds an isolation step to an existing LOTO procedure.
// ---------------------------------------------------------------------------
export async function createLotoIsolationPoint(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const procedureId          = formData.get('procedure_id') as string
  const locationDescription  = (formData.get('location_description') as string)?.trim()
  const isolationMethod      = (formData.get('isolation_method') as string)?.trim()
  const energyTypeId         = (formData.get('energy_type_id') as string) || null
  const lockDeviceType       = (formData.get('lock_device_type') as string)?.trim() || null
  const verificationMethod   = (formData.get('verification_method') as string)?.trim() || null
  const notes                = (formData.get('notes') as string)?.trim() || null

  if (!procedureId)         return { error: 'Procedure ID is required' }
  if (!locationDescription) return { error: 'Location description is required' }
  if (!isolationMethod)     return { error: 'Isolation method is required' }

  // Determine next sequence number for this procedure
  const { data: existing } = await supabase
    .from('loto_isolation_points')
    .select('sequence_number')
    .eq('procedure_id', procedureId)
    .order('sequence_number', { ascending: false })
    .limit(1)

  const nextSequence = (existing?.[0]?.sequence_number ?? 0) + 1

  const { error } = await supabase.from('loto_isolation_points').insert({
    procedure_id:         procedureId,
    sequence_number:      nextSequence,
    energy_type_id:       energyTypeId || null,
    location_description: locationDescription,
    isolation_method:     isolationMethod,
    lock_device_type:     lockDeviceType,
    verification_method:  verificationMethod,
    notes,
  })

  if (error) return { error: error.message }

  revalidatePath(`/loto/${procedureId}`)
  return {}
}

// ---------------------------------------------------------------------------
// createLotoAuthorization
// Creates an authorization (work order) against an approved procedure.
// ---------------------------------------------------------------------------
export async function createLotoAuthorization(
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

  const procedureId      = formData.get('procedure_id') as string
  const jobDescription   = (formData.get('job_description') as string)?.trim()
  const workStartAt      = (formData.get('work_start_at') as string) || null
  const workEndAt        = (formData.get('work_end_at') as string) || null

  if (!procedureId)    return { error: 'Procedure ID is required' }
  if (!jobDescription) return { error: 'Job description is required' }

  const { error } = await supabase.from('loto_authorizations').insert({
    procedure_id:    procedureId,
    organisation_id: profile.organisation_id,
    job_description: jobDescription,
    status:          'active',
    authorized_by:   user.id,
    authorized_at:   new Date().toISOString(),
    work_start_at:   workStartAt || null,
    work_end_at:     workEndAt || null,
    created_by:      user.id,
  })

  if (error) return { error: error.message }

  revalidatePath(`/loto/${procedureId}`)
  return {}
}

// ---------------------------------------------------------------------------
// updateLotoAuthorizationStatus
// Transitions an authorization to 'completed' or 'cancelled'.
// ---------------------------------------------------------------------------
export async function updateLotoAuthorizationStatus(
  authorizationId: string,
  procedureId: string,
  status: 'completed' | 'cancelled'
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const patch: Record<string, unknown> = { status }
  if (status === 'completed') {
    patch.work_end_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('loto_authorizations')
    .update(patch)
    .eq('id', authorizationId)

  if (error) return { error: error.message }

  revalidatePath(`/loto/${procedureId}`)
  revalidatePath('/loto')
  return {}
}
