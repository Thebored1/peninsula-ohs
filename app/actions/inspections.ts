'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createInspection(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const templateId = formData.get('template_id') as string
  const notes = formData.get('notes') as string | null

  if (!templateId) return { error: 'Template is required' }

  const { data: template } = await supabase
    .from('inspection_templates')
    .select('id, inspection_type_id, version')
    .eq('id', templateId)
    .single()

  if (!template) return { error: 'Template not found' }

  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('organisation_id', profile.organisation_id)
    .limit(1)
    .maybeSingle()

  if (!site) return { error: 'No site configured. Please set up a site in Settings > Sites first.' }

  const { data: inspection, error } = await supabase
    .from('inspections')
    .insert({
      organisation_id: profile.organisation_id,
      site_id: site.id,
      template_id: templateId,
      inspection_type_id: template.inspection_type_id,
      template_version: template.version,
      conducted_by: user.id,
      status: 'draft',
      started_at: new Date().toISOString(),
      notes: notes?.trim() || null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/inspections')
  redirect(`/inspections/${inspection.id}`)
}

type ResponseInput = {
  question_id: string
  response_value: string | null
  response_numeric: number | null
  is_na: boolean
  notes: string | null
}

export async function saveResponses(
  inspectionId: string,
  responses: ResponseInput[]
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

  const upserts = responses.map(r => ({
    inspection_id: inspectionId,
    question_id: r.question_id,
    organisation_id: profile.organisation_id,
    response_value: r.response_value,
    response_numeric: r.response_numeric,
    is_na: r.is_na,
    notes: r.notes,
    created_by: user.id,
  }))

  const { error } = await supabase
    .from('inspection_responses')
    .upsert(upserts, { onConflict: 'inspection_id,question_id' })

  if (error) return { error: error.message }

  // Advance status from draft → in_progress once responses are being saved
  await supabase
    .from('inspections')
    .update({ status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', inspectionId)
    .eq('status', 'draft')

  revalidatePath(`/inspections/${inspectionId}`)
  return {}
}

export async function submitInspection(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('inspections')
    .update({
      status: 'submitted',
      submitted_at: now,
      submitted_by: user.id,
      completed_at: now,
      updated_at: now,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/inspections/${id}`)
  revalidatePath('/inspections')
  return {}
}

export async function cancelInspection(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('inspections')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/inspections/${id}`)
  revalidatePath('/inspections')
  return {}
}

export async function deleteInspection(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('inspections')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/inspections')
  redirect('/inspections')
}
