'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ---------------------------------------------------------------------------
// createWellbeing
// Creates a new wellbeing resource for the authenticated user's organisation.
// ---------------------------------------------------------------------------
export async function createWellbeing(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const resourceType = (formData.get('resource_type') as string)?.trim()
  if (!resourceType) return { error: 'Resource type is required' }

  const validTypes = ['eap', 'helpline', 'internal_support', 'article', 'policy', 'app'] as const
  type ResourceType = (typeof validTypes)[number]
  if (!validTypes.includes(resourceType as ResourceType)) {
    return { error: 'Invalid resource type' }
  }

  const description = (formData.get('description') as string)?.trim() || null
  const contactName = (formData.get('contact_name') as string)?.trim() || null
  const contactPhone = (formData.get('contact_phone') as string)?.trim() || null
  const contactEmail = (formData.get('contact_email') as string)?.trim() || null
  const websiteUrl = (formData.get('website_url') as string)?.trim() || null
  const isExternal = formData.get('is_external') !== 'false'
  const isActive = formData.get('is_active') !== 'false'

  const { error } = await supabase.from('wellbeing_resources').insert({
    organisation_id: profile.organisation_id,
    title,
    description,
    resource_type: resourceType as ResourceType,
    contact_name: contactName,
    contact_phone: contactPhone,
    contact_email: contactEmail,
    website_url: websiteUrl,
    is_external: isExternal,
    is_active: isActive,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/wellbeing')
  redirect('/wellbeing')
}

// ---------------------------------------------------------------------------
// updateWellbeingStatus
// Updates the is_active status of a wellbeing resource by id.
// Also used to toggle program status (active / completed / cancelled).
// ---------------------------------------------------------------------------
export async function updateWellbeingStatus(
  id: string,
  status: string
): Promise<{ error?: string }> {
  if (!id) return { error: 'ID is required' }
  if (!status) return { error: 'Status is required' }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  // Try wellbeing_programs first (text status column)
  const validProgramStatuses = ['active', 'completed', 'cancelled']
  if (validProgramStatuses.includes(status)) {
    const { data: program, error: fetchError } = await supabase
      .from('wellbeing_programs')
      .select('id')
      .eq('id', id)
      .eq('organisation_id', profile.organisation_id)
      .single()

    if (!fetchError && program) {
      const { error } = await supabase
        .from('wellbeing_programs')
        .update({ status })
        .eq('id', id)
        .eq('organisation_id', profile.organisation_id)

      if (error) return { error: error.message }

      revalidatePath('/wellbeing')
      return {}
    }
  }

  // Fall back to wellbeing_resources (boolean is_active)
  const isActive = status === 'active' || status === 'true'
  const { error } = await supabase
    .from('wellbeing_resources')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id)

  if (error) return { error: error.message }

  revalidatePath('/wellbeing')
  return {}
}

// ---------------------------------------------------------------------------
// createWellbeingCheckIn
// Submits an anonymous check-in for the authenticated user's organisation.
// No worker_id is stored — responses are anonymous by design.
// ---------------------------------------------------------------------------
export async function createWellbeingCheckIn(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const parseScore = (key: string): number | null => {
    const raw = formData.get(key)
    if (!raw) return null
    const n = parseInt(raw as string, 10)
    return n >= 1 && n <= 5 ? n : null
  }

  const checkInDate = (formData.get('check_in_date') as string) || undefined
  const moodScore = parseScore('mood_score')
  const stressLevel = parseScore('stress_level')
  const energyLevel = parseScore('energy_level')
  const workloadRating = parseScore('workload_rating')
  const freeText = (formData.get('free_text') as string)?.trim() || null
  const supportRequested = formData.get('support_requested') === 'true'
  const siteId = (formData.get('site_id') as string) || null
  const departmentId = (formData.get('department_id') as string) || null

  const { error } = await supabase.from('wellbeing_check_ins').insert({
    organisation_id: profile.organisation_id,
    ...(checkInDate ? { check_in_date: checkInDate } : {}),
    mood_score: moodScore,
    stress_level: stressLevel,
    energy_level: energyLevel,
    workload_rating: workloadRating,
    free_text: freeText,
    support_requested: supportRequested,
    site_id: siteId,
    department_id: departmentId,
  })

  if (error) return { error: error.message }

  revalidatePath('/wellbeing')
  redirect('/wellbeing')
}

// ---------------------------------------------------------------------------
// createWellbeingProgram
// Creates a new wellbeing program for the authenticated user's organisation.
// ---------------------------------------------------------------------------
export async function createWellbeingProgram(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const description = (formData.get('description') as string)?.trim() || null
  const startDate = (formData.get('start_date') as string) || null
  const endDate = (formData.get('end_date') as string) || null
  const programType = (formData.get('program_type') as string)?.trim() || null

  const validProgramTypes = ['eap', 'fitness', 'mindfulness', 'social', 'training', 'nutrition']
  if (programType && !validProgramTypes.includes(programType)) {
    return { error: 'Invalid program type' }
  }

  const { error } = await supabase.from('wellbeing_programs').insert({
    organisation_id: profile.organisation_id,
    title,
    description,
    start_date: startDate,
    end_date: endDate,
    program_type: programType,
    status: 'active',
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/wellbeing')
  redirect('/wellbeing')
}
