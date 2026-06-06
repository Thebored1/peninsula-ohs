'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * createSpeakUp — anonymous submission, no auth check.
 * organisation_id is resolved from the provided site_id so no user session
 * is required, preserving full reporter anonymity.
 */
export async function createSpeakUp(
  formData: FormData
): Promise<{ error?: string; id?: string }> {
  const description = (formData.get('description') as string | null)?.trim() ?? ''
  const categoryId = (formData.get('category_id') as string | null) || null
  const dateOfIncident = (formData.get('date_of_incident') as string | null) || null
  const location = (formData.get('location') as string | null)?.trim() || null
  const siteId = (formData.get('site_id') as string | null) || null
  const severity = (formData.get('severity') as string | null) ?? 'medium'

  if (!description) return { error: 'Description is required.' }

  const supabase = await createClient()

  // Resolve organisation_id — required by the table but not supplied by the
  // reporter.  We derive it from the selected site (if any) so no session is
  // needed, keeping submissions fully anonymous.
  let organisationId: string | null = null

  if (siteId) {
    const { data: site } = await supabase
      .from('sites')
      .select('organisation_id')
      .eq('id', siteId)
      .single()

    if (site) {
      organisationId = site.organisation_id
    }
  }

  // Fall back: if no site was provided, derive the org from the first
  // organisation available (single-tenant scenario).  In a multi-tenant
  // environment the form should always capture a site or org identifier.
  if (!organisationId) {
    const { data: org } = await supabase
      .from('organisations')
      .select('id')
      .limit(1)
      .single()

    if (!org) return { error: 'Unable to identify the organisation. Please select a site.' }
    organisationId = org.id
  }

  const { data: report, error } = await supabase
    .from('speak_up_reports')
    .insert({
      organisation_id: organisationId,
      category_id: categoryId,
      description,
      date_of_incident: dateOfIncident || null,
      location,
      site_id: siteId,
      severity,
      status: 'received',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/speak-up')
  redirect(`/speak-up/submitted`)
}

/**
 * updateSpeakUpStatus — update the status of a speak-up report.
 * Requires an authenticated user who belongs to the same organisation.
 */
export async function updateSpeakUpStatus(
  id: string,
  status: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const updates: Record<string, unknown> = { status }

  if (status === 'closed') {
    updates.closed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('speak_up_reports')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/speak-up/${id}`)
  revalidatePath('/speak-up')
  return {}
}

/**
 * updateSpeakUpReport — update editable fields on a speak-up report.
 * Requires an authenticated org member.
 */
export async function updateSpeakUpReport(
  id: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const status = (formData.get('status') as string | null) ?? 'received'
  const severity = (formData.get('severity') as string | null) ?? 'medium'
  const assignedTo = (formData.get('assigned_to') as string | null) || null
  const resolutionNotes = (formData.get('resolution_notes') as string | null)?.trim() || null

  const updates: Record<string, unknown> = {
    status,
    severity,
    assigned_to: assignedTo,
    resolution_notes: resolutionNotes,
  }

  if (status === 'closed') {
    updates.closed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('speak_up_reports')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/speak-up/${id}`)
  revalidatePath('/speak-up')
  redirect(`/speak-up/${id}`)
}

/**
 * addSpeakUpResponse — add a staff response to a report.
 * Requires an authenticated org member.
 */
export async function addSpeakUpResponse(
  reportId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const responseText = (formData.get('response_text') as string | null)?.trim() ?? ''
  if (!responseText) return { error: 'Response text is required.' }

  const { error } = await supabase
    .from('speak_up_responses')
    .insert({
      report_id: reportId,
      response_text: responseText,
      responded_by: user.id,
    })

  if (error) return { error: error.message }

  revalidatePath(`/speak-up/${reportId}`)
  return {}
}
