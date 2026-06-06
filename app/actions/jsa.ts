'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createJsa(formData: FormData): Promise<{ error?: string }> {
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

  const jobDescription = (formData.get('job_description') as string)?.trim() || null
  const location = (formData.get('location') as string)?.trim() || null
  const siteId = (formData.get('site_id') as string) || null
  const validFrom = (formData.get('valid_from') as string) || null
  const validUntil = (formData.get('valid_until') as string) || null

  const { data: jsa, error } = await supabase
    .from('jsas')
    .insert({
      organisation_id: profile.organisation_id,
      title,
      job_description: jobDescription,
      location,
      site_id: siteId,
      valid_from: validFrom,
      valid_until: validUntil,
      status: 'draft',
      revision_number: 1,
      prepared_by: user.id,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/jsa')
  redirect(`/jsa/${jsa.id}`)
}

export async function updateJsaStatus(
  id: string,
  status: string
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

  const validStatuses = ['draft', 'under_review', 'approved', 'archived']
  if (!validStatuses.includes(status)) return { error: 'Invalid status value' }

  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'approved') {
    updatePayload.approved_by = user.id
    updatePayload.approved_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('jsas')
    .update(updatePayload)
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id)

  if (error) return { error: error.message }

  revalidatePath(`/jsa/${id}`)
  revalidatePath('/jsa')
  return {}
}

export async function updateJsa(
  id: string,
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

  const { error } = await supabase
    .from('jsas')
    .update({
      title,
      job_description: (formData.get('job_description') as string)?.trim() || null,
      location: (formData.get('location') as string)?.trim() || null,
      site_id: (formData.get('site_id') as string) || null,
      valid_from: (formData.get('valid_from') as string) || null,
      valid_until: (formData.get('valid_until') as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id)

  if (error) return { error: error.message }

  revalidatePath(`/jsa/${id}`)
  revalidatePath('/jsa')
  redirect(`/jsa/${id}`)
}

export async function addJsaStep(
  jsaId: string,
  stepNumber: number,
  description: string
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!description?.trim()) return { error: 'Step description is required' }

  const { data, error } = await supabase
    .from('jsa_steps')
    .insert({
      jsa_id: jsaId,
      step_number: stepNumber,
      description: description.trim(),
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/jsa/${jsaId}`)
  return { id: data.id }
}

export async function addJsaHazard(
  stepId: string,
  jsaId: string,
  hazardDescription: string,
  hazardType: string | null,
  likelihood: number | null,
  consequence: number | null
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!hazardDescription?.trim()) return { error: 'Hazard description is required' }

  const { data, error } = await supabase
    .from('jsa_step_hazards')
    .insert({
      step_id: stepId,
      hazard_description: hazardDescription.trim(),
      hazard_type: hazardType || null,
      likelihood: likelihood ?? null,
      consequence: consequence ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/jsa/${jsaId}`)
  return { id: data.id }
}

export async function addJsaControl(
  hazardId: string,
  jsaId: string,
  controlDescription: string,
  controlHierarchy: string | null,
  responsiblePerson: string | null,
  residualLikelihood: number | null,
  residualConsequence: number | null
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!controlDescription?.trim()) return { error: 'Control description is required' }

  const { data, error } = await supabase
    .from('jsa_step_controls')
    .insert({
      hazard_id: hazardId,
      control_description: controlDescription.trim(),
      control_hierarchy: controlHierarchy || null,
      responsible_person: responsiblePerson?.trim() || null,
      residual_likelihood: residualLikelihood ?? null,
      residual_consequence: residualConsequence ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/jsa/${jsaId}`)
  return { id: data.id }
}

export async function addJsaWorker(
  jsaId: string,
  workerName: string,
  workerId: string | null
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!workerName?.trim()) return { error: 'Worker name is required' }

  const { data, error } = await supabase
    .from('jsa_workers')
    .insert({
      jsa_id: jsaId,
      worker_name: workerName.trim(),
      worker_id: workerId || null,
      signature_obtained: false,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/jsa/${jsaId}`)
  return { id: data.id }
}

export async function deleteJsa(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const { error } = await supabase
    .from('jsas')
    .delete()
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id)

  if (error) return { error: error.message }

  revalidatePath('/jsa')
  redirect('/jsa')
}
