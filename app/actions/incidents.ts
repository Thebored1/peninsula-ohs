'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createIncident(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const orgId = profile.organisation_id

  // Validate required fields
  const title = formData.get('title') as string
  const incidentTypeId = formData.get('incident_type_id') as string
  const incidentDate = formData.get('incident_date') as string

  if (!title?.trim()) return { error: 'Title is required' }
  if (!incidentTypeId) return { error: 'Incident type is required' }
  if (!incidentDate) return { error: 'Incident date is required' }

  // Get a site for the org (required NOT NULL)
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('organisation_id', orgId)
    .limit(1)
    .maybeSingle()

  if (!site) {
    return { error: 'No site configured. Please set up a site in Administration > Sites first.' }
  }

  const severityLevelId = formData.get('severity_level_id') as string | null
  const description = formData.get('description') as string
  const incidentTime = formData.get('incident_time') as string | null
  const exactLocation = formData.get('exact_location') as string | null
  const immediateActionsTaken = formData.get('immediate_actions_taken') as string | null
  const wasInjuryInvolved = formData.get('was_injury_involved') === 'true'
  const regulatoryReportable = formData.get('regulatory_reportable') === 'true'

  const { data: incident, error } = await supabase
    .from('incidents')
    .insert({
      organisation_id: orgId,
      site_id: site.id,
      incident_type_id: incidentTypeId,
      severity_level_id: severityLevelId || null,
      title: title.trim(),
      description: description?.trim() || '',
      incident_date: incidentDate,
      incident_time: incidentTime || null,
      exact_location: exactLocation?.trim() || null,
      immediate_actions_taken: immediateActionsTaken?.trim() || null,
      was_injury_involved: wasInjuryInvolved,
      regulatory_reportable: regulatoryReportable,
      status: 'submitted',
      submitted_by: user.id,
      submitted_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/incidents')
  redirect(`/incidents/${incident.id}`)
}

export async function updateIncidentStatus(
  id: string,
  status: string,
  notes?: string
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

  // Get current status for history
  const { data: current } = await supabase
    .from('incidents')
    .select('status')
    .eq('id', id)
    .single()

  const { error: updateError } = await supabase
    .from('incidents')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) return { error: updateError.message }

  // Insert status history
  await supabase.from('incident_status_history').insert({
    incident_id: id,
    organisation_id: profile.organisation_id,
    from_status: current?.status ?? null,
    to_status: status,
    changed_by: user.id,
    notes: notes ?? null,
  })

  revalidatePath(`/incidents/${id}`)
  revalidatePath('/incidents')
  return {}
}

export async function closeIncident(
  id: string,
  notes: string
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

  // Get current status for history
  const { data: current } = await supabase
    .from('incidents')
    .select('status')
    .eq('id', id)
    .single()

  const { error: updateError } = await supabase
    .from('incidents')
    .update({
      status: 'closed',
      closure_notes: notes,
      closed_at: new Date().toISOString(),
      closed_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) return { error: updateError.message }

  // Insert status history
  await supabase.from('incident_status_history').insert({
    incident_id: id,
    organisation_id: profile.organisation_id,
    from_status: current?.status ?? null,
    to_status: 'closed',
    changed_by: user.id,
    notes: notes || null,
  })

  revalidatePath(`/incidents/${id}`)
  revalidatePath('/incidents')
  return {}
}

export async function updateIncident(id: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const incidentTypeId = formData.get('incident_type_id') as string
  const incidentDate = formData.get('incident_date') as string

  if (!title?.trim()) return { error: 'Title is required' }
  if (!incidentTypeId) return { error: 'Incident type is required' }
  if (!incidentDate) return { error: 'Incident date is required' }

  const { error } = await supabase
    .from('incidents')
    .update({
      incident_type_id: incidentTypeId,
      severity_level_id: (formData.get('severity_level_id') as string) || null,
      title: title.trim(),
      description: (formData.get('description') as string)?.trim() || '',
      incident_date: incidentDate,
      incident_time: (formData.get('incident_time') as string) || null,
      exact_location: (formData.get('exact_location') as string)?.trim() || null,
      immediate_actions_taken: (formData.get('immediate_actions_taken') as string)?.trim() || null,
      was_injury_involved: formData.get('was_injury_involved') === 'true',
      regulatory_reportable: formData.get('regulatory_reportable') === 'true',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/incidents/${id}`)
  revalidatePath('/incidents')
  redirect(`/incidents/${id}`)
}

export async function deleteIncident(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('incidents')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/incidents')
  redirect('/incidents')
}
