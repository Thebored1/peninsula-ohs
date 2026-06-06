'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createRisk(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'User profile not found' }

  // Validate required fields
  const title = formData.get('title')?.toString().trim()
  const hazard_description = formData.get('hazard_description')?.toString().trim()
  const category_id = formData.get('category_id')?.toString().trim()
  const likelihood_str = formData.get('likelihood_score')?.toString()
  const consequence_str = formData.get('consequence_score')?.toString()

  if (!title) return { error: 'Title is required' }
  if (!hazard_description) return { error: 'Hazard description is required' }
  if (!category_id) return { error: 'Category is required' }
  if (!likelihood_str) return { error: 'Likelihood score is required' }
  if (!consequence_str) return { error: 'Consequence score is required' }

  const likelihood_score = parseInt(likelihood_str, 10)
  const consequence_score = parseInt(consequence_str, 10)

  if (isNaN(likelihood_score) || likelihood_score < 1 || likelihood_score > 5) {
    return { error: 'Invalid likelihood score' }
  }
  if (isNaN(consequence_score) || consequence_score < 1 || consequence_score > 5) {
    return { error: 'Invalid consequence score' }
  }

  // Optional fields
  const location_activity = formData.get('location_activity')?.toString().trim() || null
  const people_at_risk_raw = formData.get('people_at_risk')?.toString().trim()
  const people_at_risk = people_at_risk_raw
    ? people_at_risk_raw.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  const existing_controls_summary = formData.get('existing_controls_summary')?.toString().trim() || null
  const review_frequency = formData.get('review_frequency')?.toString() || 'quarterly'
  const notes = formData.get('notes')?.toString().trim() || null

  const { data: risk, error: insertError } = await supabase
    .from('risks')
    .insert({
      organisation_id: profile.organisation_id,
      category_id,
      title,
      hazard_description,
      location_activity,
      people_at_risk,
      likelihood_score,
      consequence_score,
      existing_controls_summary,
      review_frequency,
      notes,
      status: 'active',
      source_type: 'standalone',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (insertError) return { error: insertError.message }

  revalidatePath('/risks')
  redirect(`/risks/${risk.id}`)
}

export async function updateRisk(id: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title')?.toString().trim()
  const hazard_description = formData.get('hazard_description')?.toString().trim()
  const category_id = formData.get('category_id')?.toString().trim()
  const likelihood_str = formData.get('likelihood_score')?.toString()
  const consequence_str = formData.get('consequence_score')?.toString()

  if (!title) return { error: 'Title is required' }
  if (!hazard_description) return { error: 'Hazard description is required' }
  if (!category_id) return { error: 'Category is required' }
  if (!likelihood_str) return { error: 'Likelihood score is required' }
  if (!consequence_str) return { error: 'Consequence score is required' }

  const likelihood_score = parseInt(likelihood_str, 10)
  const consequence_score = parseInt(consequence_str, 10)
  if (isNaN(likelihood_score) || likelihood_score < 1 || likelihood_score > 5) return { error: 'Invalid likelihood score' }
  if (isNaN(consequence_score) || consequence_score < 1 || consequence_score > 5) return { error: 'Invalid consequence score' }

  const people_at_risk_raw = formData.get('people_at_risk')?.toString().trim()
  const people_at_risk = people_at_risk_raw ? people_at_risk_raw.split(',').map((s) => s.trim()).filter(Boolean) : []

  const { error } = await supabase
    .from('risks')
    .update({
      category_id,
      title,
      hazard_description,
      location_activity: formData.get('location_activity')?.toString().trim() || null,
      people_at_risk,
      likelihood_score,
      consequence_score,
      existing_controls_summary: formData.get('existing_controls_summary')?.toString().trim() || null,
      review_frequency: formData.get('review_frequency')?.toString() || 'quarterly',
      notes: formData.get('notes')?.toString().trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/risks/${id}`)
  revalidatePath('/risks')
  redirect(`/risks/${id}`)
}

export async function updateRiskStatus(id: string, status: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('risks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/risks/${id}`)
  revalidatePath('/risks')
  return {}
}

export async function reviewRisk(
  id: string,
  data: {
    likelihood_score: number
    consequence_score: number
    residual_likelihood_score?: number
    residual_consequence_score?: number
    review_notes?: string
  }
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

  // Fetch current risk values for review record
  const { data: existing, error: fetchError } = await supabase
    .from('risks')
    .select('likelihood_score, consequence_score, residual_likelihood_score, residual_consequence_score, review_frequency, organisation_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) return { error: 'Risk not found' }

  const now = new Date()
  const nextReviewDate = new Date(now)
  switch (existing.review_frequency) {
    case 'monthly':
      nextReviewDate.setMonth(nextReviewDate.getMonth() + 1)
      break
    case 'biannual':
      nextReviewDate.setMonth(nextReviewDate.getMonth() + 6)
      break
    case 'annually':
      nextReviewDate.setFullYear(nextReviewDate.getFullYear() + 1)
      break
    default: // quarterly
      nextReviewDate.setDate(nextReviewDate.getDate() + 90)
  }

  const updates: Record<string, unknown> = {
    likelihood_score: data.likelihood_score,
    consequence_score: data.consequence_score,
    last_reviewed_at: now.toISOString(),
    last_reviewed_by: user.id,
    next_review_date: nextReviewDate.toISOString().split('T')[0],
    updated_at: now.toISOString(),
  }

  if (data.residual_likelihood_score != null) {
    updates.residual_likelihood_score = data.residual_likelihood_score
  }
  if (data.residual_consequence_score != null) {
    updates.residual_consequence_score = data.residual_consequence_score
  }

  const { error: updateError } = await supabase
    .from('risks')
    .update(updates)
    .eq('id', id)

  if (updateError) return { error: updateError.message }

  // Insert review record
  const { error: reviewError } = await supabase
    .from('risk_reviews')
    .insert({
      risk_id: id,
      organisation_id: existing.organisation_id,
      reviewer_id: user.id,
      prev_likelihood: existing.likelihood_score,
      prev_consequence: existing.consequence_score,
      prev_residual_likelihood: existing.residual_likelihood_score ?? null,
      prev_residual_consequence: existing.residual_consequence_score ?? null,
      new_likelihood: data.likelihood_score,
      new_consequence: data.consequence_score,
      new_residual_likelihood: data.residual_likelihood_score ?? null,
      new_residual_consequence: data.residual_consequence_score ?? null,
      review_notes: data.review_notes ?? null,
      status: 'completed',
      completed_at: now.toISOString(),
      completed_by: user.id,
      created_by: user.id,
    })

  if (reviewError) return { error: reviewError.message }

  revalidatePath(`/risks/${id}`)
  revalidatePath('/risks')
  return {}
}
