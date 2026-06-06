'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createAction(formData: FormData): Promise<{ error?: string }> {
  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const description = (formData.get('description') as string | null)?.trim() ?? ''
  const action_type = (formData.get('action_type') as string | null) ?? ''
  const due_date = (formData.get('due_date') as string | null)?.trim() ?? ''
  const priority = (formData.get('priority') as string | null) ?? 'medium'
  const assigned_to = (formData.get('assigned_to') as string | null)?.trim() || null
  const source_reference = (formData.get('source_reference') as string | null)?.trim() || null
  const verification_required = formData.get('verification_required') === 'true'

  if (!title) return { error: 'Title is required.' }
  if (!description) return { error: 'Description is required.' }
  if (!action_type) return { error: 'Action type is required.' }
  if (!due_date) return { error: 'Due date is required.' }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Authentication required.' }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) return { error: 'User profile not found.' }

  const { data: action, error: insertError } = await supabase
    .from('actions')
    .insert({
      organisation_id: profile.organisation_id,
      title,
      description,
      action_type,
      priority,
      due_date,
      assigned_to: assigned_to ?? undefined,
      assigned_by: assigned_to ? user.id : undefined,
      assigned_at: assigned_to ? new Date().toISOString() : undefined,
      verification_required,
      source_reference: source_reference ?? undefined,
      source_type: 'standalone',
      status: 'open',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (insertError || !action) return { error: insertError?.message ?? 'Failed to create action.' }

  revalidatePath('/actions')
  redirect(`/actions/${action.id}`)
}

export async function updateAction(id: string, formData: FormData): Promise<{ error?: string }> {
  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const description = (formData.get('description') as string | null)?.trim() ?? ''
  const action_type = (formData.get('action_type') as string | null) ?? ''
  const due_date = (formData.get('due_date') as string | null)?.trim() ?? ''
  const priority = (formData.get('priority') as string | null) ?? 'medium'

  if (!title) return { error: 'Title is required.' }
  if (!description) return { error: 'Description is required.' }
  if (!action_type) return { error: 'Action type is required.' }
  if (!due_date) return { error: 'Due date is required.' }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Authentication required.' }

  const { error } = await supabase
    .from('actions')
    .update({
      title,
      description,
      action_type,
      priority,
      due_date,
      assigned_to: (formData.get('assigned_to') as string | null)?.trim() || null,
      verification_required: formData.get('verification_required') === 'true',
      source_reference: (formData.get('source_reference') as string | null)?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/actions/${id}`)
  revalidatePath('/actions')
  redirect(`/actions/${id}`)
}

export async function updateActionStatus(
  id: string,
  status: string,
  notes?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Authentication required.' }

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'completed') {
    updates.completed_at = new Date().toISOString()
    updates.completed_by = user.id
    if (notes) updates.completion_notes = notes
  }

  const { error } = await supabase
    .from('actions')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/actions/${id}`)
  revalidatePath('/actions')
  return {}
}

export async function completeAction(
  id: string,
  notes: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Authentication required.' }

  // Determine if verification is required
  const { data: action, error: fetchError } = await supabase
    .from('actions')
    .select('verification_required')
    .eq('id', id)
    .single()

  if (fetchError || !action) return { error: 'Action not found.' }

  const newStatus = action.verification_required ? 'verification_pending' : 'completed'

  const { error } = await supabase
    .from('actions')
    .update({
      status: newStatus,
      completion_notes: notes,
      completed_at: new Date().toISOString(),
      completed_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/actions/${id}`)
  revalidatePath('/actions')
  return {}
}

export async function verifyAction(
  id: string,
  notes: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Authentication required.' }

  const { error } = await supabase
    .from('actions')
    .update({
      status: 'verified',
      verified_at: new Date().toISOString(),
      verified_by: user.id,
      verification_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/actions/${id}`)
  revalidatePath('/actions')
  return {}
}
