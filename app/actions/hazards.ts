'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createHazardReport(formData: FormData): Promise<{ error?: string }> {
  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const description = (formData.get('description') as string | null)?.trim() ?? ''
  const location_details = (formData.get('location_details') as string | null)?.trim() || null
  const severity_perception = (formData.get('severity_perception') as string | null) ?? 'medium'

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

  const { data, error } = await supabase
    .from('hazard_reports')
    .insert({
      organisation_id: profile.organisation_id,
      title,
      description,
      location_details,
      severity_perception,
      reported_by: user.id,
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

export async function promoteToRisk(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be logged in.' }

  const { error } = await supabase
    .from('hazard_reports')
    .update({
      status: 'promoted_to_risk',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/hazards/${id}`)
  revalidatePath('/hazards')
  return {}
}
