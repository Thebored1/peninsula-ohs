'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createHazardReport(formData: FormData): Promise<{ error?: string }> {
  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const description = (formData.get('description') as string | null)?.trim() ?? ''
  const location_details = (formData.get('location_details') as string | null)?.trim() || null
  const severity_perception = (formData.get('severity_perception') as string | null) ?? 'medium'

  // New fields
  const hazard_category = (formData.get('hazard_category') as string | null) || null
  const observed_date = (formData.get('observed_date') as string | null)?.trim() || null
  const immediate_risk_to_people = formData.get('immediate_risk_to_people') === 'true'
  const observed_by_raw = (formData.get('observed_by') as string | null)?.trim() || null
  const suggested_control = (formData.get('suggested_control') as string | null)?.trim() || null
  const evidence_file_url = (formData.get('evidence_file_url') as string | null) || null
  const evidence_file_name = (formData.get('evidence_file_name') as string | null) || null

  if (!title) return { error: 'Title is required.' }
  if (!description) return { error: 'Description is required.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be logged in to submit a hazard report.' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'User profile not found.' }

  // Build observed_at timestamp from date string if provided
  const observed_at = observed_date ? new Date(observed_date).toISOString() : null

  // Validate observed_by is a valid UUID in user_profiles
  let observed_by: string | null = null
  if (observed_by_raw) {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidPattern.test(observed_by_raw)) {
      observed_by = observed_by_raw
    }
  }

  const { data, error } = await supabase
    .from('hazard_reports')
    .insert({
      organisation_id: profile.organisation_id,
      title,
      description,
      location_details,
      severity_perception,
      reported_by: user.id,
      hazard_category,
      observed_at,
      immediate_risk_to_people,
      observed_by,
      suggested_control,
      evidence_file_url,
      evidence_file_name,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/hazards')
  redirect(`/hazards/${data.id}`)
}

export async function updateHazardStatus(
  id: string,
  status: string,
  notes?: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be logged in.' }

  const { error } = await supabase
    .from('hazard_reports')
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      ...(notes !== undefined && notes !== null ? { review_notes: notes } : {}),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/hazards/${id}`)
  revalidatePath('/hazards')
  return {}
}

export async function updateHazardReport(id: string, formData: FormData): Promise<{ error?: string }> {
  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const description = (formData.get('description') as string | null)?.trim() ?? ''
  const location_details = (formData.get('location_details') as string | null)?.trim() || null
  const severity_perception = (formData.get('severity_perception') as string | null) ?? 'medium'

  if (!title) return { error: 'Title is required.' }
  if (!description) return { error: 'Description is required.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('hazard_reports')
    .update({ title, description, location_details, severity_perception, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/hazards/${id}`)
  revalidatePath('/hazards')
  redirect(`/hazards/${id}`)
}

export async function promoteToRisk(hazardId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be logged in.' }

  // Fetch hazard report details
  const { data: hazard, error: fetchError } = await supabase
    .from('hazard_reports')
    .select('id, organisation_id, title, description, location_details, severity_perception, status, report_number, suggested_control')
    .eq('id', hazardId)
    .single()

  if (fetchError || !hazard) return { error: 'Hazard report not found.' }
  if (hazard.status === 'promoted_to_risk') return { error: 'This hazard has already been promoted.' }

  // Map severity_perception to a starting likelihood/consequence score
  const severityScoreMap: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 4,
    critical: 5,
  }
  const score = severityScoreMap[hazard.severity_perception] ?? 2

  // Build existing_controls_summary from suggested_control if present
  const existing_controls_summary = hazard.suggested_control
    ? `From hazard report: ${hazard.suggested_control}`
    : null

  // Create the risk record
  const { data: risk, error: riskError } = await supabase
    .from('risks')
    .insert({
      organisation_id: hazard.organisation_id,
      title: hazard.title,
      hazard_description: hazard.description,
      location_activity: hazard.location_details,
      likelihood_score: score,
      consequence_score: score,
      people_at_risk: [],
      source_type: 'hazard_report',
      source_id: hazardId,
      source_reference: hazard.report_number ?? hazardId,
      existing_controls_summary,
      status: 'active',
      review_frequency: 'quarterly',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (riskError) return { error: riskError.message }

  // Update hazard report to link risk and mark status
  const { error: updateError } = await supabase
    .from('hazard_reports')
    .update({
      status: 'promoted_to_risk',
      promoted_to_risk_id: risk.id,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', hazardId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/hazards/${hazardId}`)
  revalidatePath('/hazards')
  revalidatePath('/risks')
  redirect(`/risks/${risk.id}`)
}
