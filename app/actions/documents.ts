'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createDocument(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const title = formData.get('title') as string
  if (!title?.trim()) return { error: 'Title is required' }

  const documentTypeId = formData.get('document_type_id') as string | null
  const statusId = formData.get('status_id') as string | null
  const description = formData.get('description') as string | null
  const reviewDueDate = formData.get('review_due_date') as string | null

  // Get the draft status if no status provided
  let resolvedStatusId = statusId || null
  if (!resolvedStatusId) {
    const { data: draftStatus } = await supabase
      .from('document_statuses')
      .select('id')
      .eq('code', 'draft')
      .maybeSingle()
    resolvedStatusId = draftStatus?.id ?? null
  }

  const { data: doc, error } = await supabase
    .from('documents')
    .insert({
      organisation_id: profile.organisation_id,
      title: title.trim(),
      document_type_id: documentTypeId || null,
      status_id: resolvedStatusId,
      description: description?.trim() || null,
      review_due_date: reviewDueDate || null,
      version: '1.0',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/documents')
  redirect(`/documents/${doc.id}`)
}

export async function updateDocument(id: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  if (!title?.trim()) return { error: 'Title is required' }

  const { error } = await supabase
    .from('documents')
    .update({
      title: title.trim(),
      document_type_id: (formData.get('document_type_id') as string | null) || null,
      status_id: (formData.get('status_id') as string | null) || null,
      description: (formData.get('description') as string | null)?.trim() || null,
      review_due_date: (formData.get('review_due_date') as string | null) || null,
      version: (formData.get('version') as string | null)?.trim() || '1.0',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/documents/${id}`)
  revalidatePath('/documents')
  redirect(`/documents/${id}`)
}
