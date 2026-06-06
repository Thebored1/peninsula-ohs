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
  const fileUrl = formData.get('file_url') as string | null
  const fileName = formData.get('file_name') as string | null
  const fileSizeRaw = formData.get('file_size_bytes') as string | null
  const fileMimeType = formData.get('file_mime_type') as string | null
  const versionNumber = (formData.get('version_number') as string | null)?.trim() || '1.0'
  const ownerId = (formData.get('owner_id') as string | null) || null
  const requiresAck = formData.get('requires_acknowledgement') === 'true'
  const expiryDate = (formData.get('expiry_date') as string | null) || null

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
      version: versionNumber,
      created_by: user.id,
      file_url: fileUrl || null,
      file_name: fileName || null,
      file_size_bytes: fileSizeRaw ? parseInt(fileSizeRaw, 10) : null,
      file_mime_type: fileMimeType || null,
      version_number: versionNumber,
      owner_id: ownerId,
      requires_acknowledgement: requiresAck,
      expiry_date: expiryDate,
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

  const versionNumber = (formData.get('version_number') as string | null)?.trim() || '1.0'
  const ownerId = (formData.get('owner_id') as string | null) || null
  const requiresAck = formData.get('requires_acknowledgement') === 'true'
  const expiryDate = (formData.get('expiry_date') as string | null) || null
  const fileUrl = formData.get('file_url') as string | null
  const fileName = formData.get('file_name') as string | null
  const fileSizeRaw = formData.get('file_size_bytes') as string | null
  const fileMimeType = formData.get('file_mime_type') as string | null

  const updatePayload: Record<string, unknown> = {
    title: title.trim(),
    document_type_id: (formData.get('document_type_id') as string | null) || null,
    status_id: (formData.get('status_id') as string | null) || null,
    description: (formData.get('description') as string | null)?.trim() || null,
    review_due_date: (formData.get('review_due_date') as string | null) || null,
    version: versionNumber,
    version_number: versionNumber,
    owner_id: ownerId,
    requires_acknowledgement: requiresAck,
    expiry_date: expiryDate,
    updated_at: new Date().toISOString(),
  }

  if (fileUrl) {
    updatePayload.file_url = fileUrl
    updatePayload.file_name = fileName || null
    updatePayload.file_size_bytes = fileSizeRaw ? parseInt(fileSizeRaw, 10) : null
    updatePayload.file_mime_type = fileMimeType || null
  }

  const { error } = await supabase
    .from('documents')
    .update(updatePayload)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/documents/${id}`)
  revalidatePath('/documents')
  redirect(`/documents/${id}`)
}

// ── E-Signature & Review actions ──────────────────────────────────────────────
import { headers } from 'next/headers'

export async function acknowledgeDocument(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const documentId = formData.get('document_id') as string
  if (!documentId) return { error: 'document_id is required' }

  let versionId = (formData.get('version_id') as string | null) || null

  // Fall back to latest version if not provided
  if (!versionId) {
    const { data: latestVersion } = await supabase
      .from('document_versions')
      .select('id')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    versionId = latestVersion?.id ?? null
  }

  const method = formData.get('method') as string
  const signerName = (formData.get('signer_name') as string | null) || null
  const signatureImageUrl = (formData.get('signature_image_url') as string | null) || null

  const headersList = await headers()
  const ipAddress =
    headersList.get('x-forwarded-for') ||
    headersList.get('x-real-ip') ||
    null

  const { error } = await supabase
    .from('document_acknowledgements')
    .insert({
      document_id: documentId,
      version_id: versionId,
      organisation_id: profile.organisation_id,
      user_id: user.id,
      method,
      signer_name: signerName,
      signature_image_url: signatureImageUrl,
      ip_address: ipAddress,
      acknowledged_at: new Date().toISOString(),
    })

  if (error) {
    if (error.code === '23505') return { error: 'Already acknowledged' }
    return { error: error.message }
  }

  revalidatePath(`/documents/${documentId}`)
  return {}
}

export async function addAcknowledgementRequirement(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const documentId = formData.get('document_id') as string
  if (!documentId) return { error: 'document_id is required' }

  const requirementType = (formData.get('type') ?? formData.get('requirement_type')) as 'user' | 'role' | 'site'
  const requirementValue = (formData.get('value') ?? formData.get('requirement_value')) as string
  const deadlineDaysRaw = formData.get('deadline_days') as string | null
  const deadlineDays = deadlineDaysRaw ? parseInt(deadlineDaysRaw, 10) : null

  const insertPayload: Record<string, unknown> = {
    document_id: documentId,
    organisation_id: profile.organisation_id,
    requirement_type: requirementType,
    deadline_days: deadlineDays,
  }

  if (requirementType === 'user') {
    insertPayload.required_user_id = requirementValue
  } else if (requirementType === 'role') {
    insertPayload.required_role_id = requirementValue
  } else if (requirementType === 'site') {
    insertPayload.required_site_id = requirementValue
  }

  const { error } = await supabase
    .from('document_acknowledgement_requirements')
    .insert(insertPayload)

  if (error) return { error: error.message }

  revalidatePath(`/documents/${documentId}`)
  return {}
}

export async function removeAcknowledgementRequirement(formData: FormData): Promise<{ error?: string }> {
  const id = formData.get('requirement_id') as string
  if (!id) return { error: 'requirement_id is required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  // Verify the requirement belongs to the user's org before deleting
  const { data: existing, error: fetchError } = await supabase
    .from('document_acknowledgement_requirements')
    .select('id, document_id')
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id)
    .maybeSingle()

  if (fetchError) return { error: fetchError.message }
  if (!existing) return { error: 'Requirement not found' }

  const { error } = await supabase
    .from('document_acknowledgement_requirements')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/documents/${existing.document_id}`)
  return {}
}

export async function submitForReview(documentId: string): Promise<{ error?: string }> {
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

  // Get the document's review workflow
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('review_workflow_id')
    .eq('id', documentId)
    .single()

  if (docError) return { error: docError.message }
  if (!doc?.review_workflow_id) return { error: 'No review workflow assigned to this document' }

  // Get workflow steps ordered by order_index
  const { data: steps, error: stepsError } = await supabase
    .from('document_review_workflow_steps')
    .select('id, order_index, step_name, step_type, assigned_role_id')
    .eq('workflow_id', doc.review_workflow_id)
    .order('order_index', { ascending: true })

  if (stepsError) return { error: stepsError.message }

  // Get or create a document version
  const { data: existingVersion } = await supabase
    .from('document_versions')
    .select('id')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let versionId: string

  if (existingVersion?.id) {
    versionId = existingVersion.id
    // Update the existing version to in_review
    await supabase
      .from('document_versions')
      .update({
        status: 'in_review',
        submitted_for_review_at: new Date().toISOString(),
        submitted_by: user.id,
      })
      .eq('id', versionId)
  } else {
    const { data: newVersion, error: versionError } = await supabase
      .from('document_versions')
      .insert({
        document_id: documentId,
        organisation_id: orgId,
        version_number: '1.0',
        status: 'in_review',
        submitted_for_review_at: new Date().toISOString(),
        submitted_by: user.id,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (versionError) return { error: versionError.message }
    versionId = newVersion.id
  }

  // Insert review rows for each workflow step
  if (steps && steps.length > 0) {
    const reviewRows = steps.map((step) => ({
      document_id: documentId,
      version_id: versionId,
      workflow_step_id: step.id,
      organisation_id: orgId,
      decision: 'pending',
    }))

    const { error: reviewsError } = await supabase
      .from('document_version_reviews')
      .insert(reviewRows)

    if (reviewsError) return { error: reviewsError.message }
  }

  // Update document status to in_review
  const { data: inReviewStatus } = await supabase
    .from('document_statuses')
    .select('id')
    .eq('code', 'in_review')
    .maybeSingle()

  if (inReviewStatus?.id) {
    await supabase
      .from('documents')
      .update({ status_id: inReviewStatus.id })
      .eq('id', documentId)
  }

  revalidatePath(`/documents/${documentId}`)
  return {}
}

export async function approveDocumentReview(formData: FormData): Promise<{ error?: string }> {
  const reviewId = formData.get('step_id') as string
  const notes = (formData.get('decision_notes') as string | null) || undefined
  if (!reviewId) return { error: 'step_id is required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Update this review to approved
  const { data: review, error: updateError } = await supabase
    .from('document_version_reviews')
    .update({
      decision: 'approved',
      decision_notes: notes ?? null,
      decided_at: new Date().toISOString(),
      reviewer_id: user.id,
    })
    .eq('id', reviewId)
    .select('version_id, document_id')
    .single()

  if (updateError) return { error: updateError.message }

  // Check if all reviews for this version are approved
  const { data: allReviews, error: allReviewsError } = await supabase
    .from('document_version_reviews')
    .select('id, decision')
    .eq('version_id', review.version_id)

  if (allReviewsError) return { error: allReviewsError.message }

  const allApproved = allReviews?.every((r) => r.decision === 'approved')

  if (allApproved) {
    const { data: approvedStatus } = await supabase
      .from('document_statuses')
      .select('id')
      .eq('code', 'approved')
      .maybeSingle()

    if (approvedStatus?.id) {
      await supabase
        .from('documents')
        .update({ status_id: approvedStatus.id })
        .eq('id', review.document_id)
    }

    await supabase
      .from('document_versions')
      .update({ status: 'approved' })
      .eq('id', review.version_id)
  }

  revalidatePath(`/documents/${review.document_id}`)
  return {}
}

export async function rejectDocumentReview(formData: FormData): Promise<{ error?: string }> {
  const reviewId = formData.get('step_id') as string
  const notes = (formData.get('decision_notes') as string | null) ?? ''
  if (!reviewId) return { error: 'step_id is required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Update this review to rejected
  const { data: review, error: updateError } = await supabase
    .from('document_version_reviews')
    .update({
      decision: 'rejected',
      decision_notes: notes || null,
      decided_at: new Date().toISOString(),
      reviewer_id: user.id,
    })
    .eq('id', reviewId)
    .select('version_id, document_id')
    .single()

  if (updateError) return { error: updateError.message }

  // Get draft status to revert document
  const { data: draftStatus } = await supabase
    .from('document_statuses')
    .select('id')
    .eq('code', 'draft')
    .maybeSingle()

  if (draftStatus?.id) {
    await supabase
      .from('documents')
      .update({ status_id: draftStatus.id })
      .eq('id', review.document_id)
  }

  // Mark the version as rejected
  await supabase
    .from('document_versions')
    .update({
      status: 'rejected',
      rejection_notes: notes,
    })
    .eq('id', review.version_id)

  revalidatePath(`/documents/${review.document_id}`)
  return {}
}

export async function createReviewWorkflow(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Workflow name is required' }

  const description = (formData.get('description') as string | null)?.trim() || null
  const isDefault = formData.get('is_default') === 'true'

  // Parse steps JSON array
  const stepsRaw = formData.get('steps') as string | null
  let steps: Array<{ step_name: string; step_type: string; assigned_role_id?: string }> = []
  if (stepsRaw) {
    try {
      steps = JSON.parse(stepsRaw)
    } catch {
      return { error: 'Invalid steps JSON' }
    }
  }

  const { data: workflow, error: workflowError } = await supabase
    .from('document_review_workflows')
    .insert({
      organisation_id: profile.organisation_id,
      name,
      description,
      is_default: isDefault,
      is_active: true,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (workflowError) return { error: workflowError.message }

  if (steps.length > 0) {
    const stepRows = steps.map((step, i) => ({
      workflow_id: workflow.id,
      order_index: i,
      step_name: step.step_name,
      step_type: step.step_type,
      assigned_role_id: step.assigned_role_id || null,
    }))

    const { error: stepsError } = await supabase
      .from('document_review_workflow_steps')
      .insert(stepRows)

    if (stepsError) return { error: stepsError.message }
  }

  revalidatePath('/documents/workflows')
  redirect('/documents/workflows')
}

export async function updateDocumentSettings(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const requiredSignatureMethod = formData.get('required_signature_method') as string | null

  const { error } = await supabase
    .from('organisations')
    .update({ required_signature_method: requiredSignatureMethod })
    .eq('id', profile.organisation_id)

  if (error) return { error: error.message }

  revalidatePath('/settings/documents')
  return {}
}
