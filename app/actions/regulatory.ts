'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * createRegulatory — creates a new regulatory_standards record.
 * Alias: addRegulatory (same implementation, exported separately for flexibility).
 */
export async function createRegulatory(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const standardCode = (formData.get('standard_code') as string)?.trim()
  const title = (formData.get('title') as string)?.trim()

  if (!standardCode) return { error: 'Standard code is required' }
  if (!title) return { error: 'Title is required' }

  const regulatoryBodyId = (formData.get('regulatory_body_id') as string) || null
  const version = (formData.get('version') as string)?.trim() || null
  const effectiveDate = (formData.get('effective_date') as string) || null
  const status = (formData.get('status') as string) || 'current'
  const jurisdiction = (formData.get('jurisdiction') as string)?.trim() || null
  const description = (formData.get('description') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  const { data: standard, error } = await supabase
    .from('regulatory_standards')
    .insert({
      organisation_id: profile.organisation_id,
      regulatory_body_id: regulatoryBodyId,
      standard_code: standardCode,
      title,
      version,
      effective_date: effectiveDate,
      status,
      jurisdiction,
      description,
      notes,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/regulatory')
  redirect(`/regulatory/${standard.id}`)
}

/**
 * addRegulatory — alias for createRegulatory.
 * Creates a regulatory_standards entry without a number prefix.
 */
export async function addRegulatory(formData: FormData): Promise<{ error?: string }> {
  return createRegulatory(formData)
}

/**
 * updateRegulatoryStatus — updates the status of a regulatory_standards record.
 */
export async function updateRegulatoryStatus(
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

  const validStatuses = ['current', 'superseded', 'withdrawn']
  if (!validStatuses.includes(status)) {
    return { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }
  }

  const { error } = await supabase
    .from('regulatory_standards')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id)

  if (error) return { error: error.message }

  revalidatePath(`/regulatory/${id}`)
  revalidatePath('/regulatory')
  return {}
}

/**
 * updateRegulatory — updates all fields of a regulatory_standards record.
 */
export async function updateRegulatory(
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

  const standardCode = (formData.get('standard_code') as string)?.trim()
  const title = (formData.get('title') as string)?.trim()

  if (!standardCode) return { error: 'Standard code is required' }
  if (!title) return { error: 'Title is required' }

  const { error } = await supabase
    .from('regulatory_standards')
    .update({
      regulatory_body_id: (formData.get('regulatory_body_id') as string) || null,
      standard_code: standardCode,
      title,
      version: (formData.get('version') as string)?.trim() || null,
      effective_date: (formData.get('effective_date') as string) || null,
      status: (formData.get('status') as string) || 'current',
      jurisdiction: (formData.get('jurisdiction') as string)?.trim() || null,
      description: (formData.get('description') as string)?.trim() || null,
      notes: (formData.get('notes') as string)?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id)

  if (error) return { error: error.message }

  revalidatePath(`/regulatory/${id}`)
  revalidatePath('/regulatory')
  redirect(`/regulatory/${id}`)
}

/**
 * createRequirement — adds a clause/requirement to an existing standard.
 */
export async function createRequirement(
  standardId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const clauseReference = (formData.get('clause_reference') as string)?.trim()
  const title = (formData.get('title') as string)?.trim()

  if (!clauseReference) return { error: 'Clause reference is required' }
  if (!title) return { error: 'Title is required' }

  const requirementType = (formData.get('requirement_type') as string) || 'shall'
  const description = (formData.get('description') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null
  const isApplicable = formData.get('is_applicable') !== 'false'

  const { error } = await supabase
    .from('regulatory_requirements')
    .insert({
      standard_id: standardId,
      clause_reference: clauseReference,
      title,
      description,
      requirement_type: requirementType,
      is_applicable: isApplicable,
      notes,
    })

  if (error) return { error: error.message }

  revalidatePath(`/regulatory/${standardId}`)
  return {}
}

/**
 * deleteRegulatory — removes a regulatory_standards record (and cascades to requirements).
 */
export async function deleteRegulatory(id: string): Promise<{ error?: string }> {
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
    .from('regulatory_standards')
    .delete()
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id)

  if (error) return { error: error.message }

  revalidatePath('/regulatory')
  redirect('/regulatory')
}
