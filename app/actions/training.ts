'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ─── Training Courses ──────────────────────────────────────────────────────

export async function createCourse(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Course name is required' }

  const courseType = (formData.get('course_type') as string) || 'classroom'
  const code = (formData.get('code') as string)?.trim() || null
  const description = (formData.get('description') as string)?.trim() || null
  const durationHoursRaw = formData.get('duration_hours') as string
  const validityMonthsRaw = formData.get('validity_period_months') as string
  const isCertification = formData.get('is_certification') === 'true'

  const { error } = await supabase.from('training_courses').insert({
    organisation_id: orgId,
    name,
    code,
    description,
    course_type: courseType,
    duration_hours: durationHoursRaw ? parseFloat(durationHoursRaw) : null,
    validity_period_months: validityMonthsRaw ? parseInt(validityMonthsRaw, 10) : null,
    is_certification: isCertification,
    is_active: true,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/training/courses')
  redirect('/training/courses')
}

export async function updateCourse(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const id = (formData.get('id') as string)?.trim()
  if (!id) return { error: 'Course ID is required' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Course name is required' }

  const courseType = (formData.get('course_type') as string) || 'classroom'
  const code = (formData.get('code') as string)?.trim() || null
  const description = (formData.get('description') as string)?.trim() || null
  const durationHoursRaw = formData.get('duration_hours') as string
  const validityMonthsRaw = formData.get('validity_period_months') as string
  const isCertification = formData.get('is_certification') === 'true'
  const isActive = formData.get('is_active') !== 'false'

  const { error } = await supabase
    .from('training_courses')
    .update({
      name,
      code,
      description,
      course_type: courseType,
      duration_hours: durationHoursRaw ? parseFloat(durationHoursRaw) : null,
      validity_period_months: validityMonthsRaw ? parseInt(validityMonthsRaw, 10) : null,
      is_certification: isCertification,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/training/courses')
  revalidatePath(`/training/courses/${id}`)
  redirect(`/training/courses/${id}`)
}

// ─── Training Records ──────────────────────────────────────────────────────

export async function createTrainingRecord(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const workerId = (formData.get('worker_id') as string)?.trim()
  const courseId = (formData.get('course_id') as string)?.trim()
  const completedDate = (formData.get('completed_date') as string)?.trim()

  if (!workerId) return { error: 'Worker is required' }
  if (!courseId) return { error: 'Course is required' }
  if (!completedDate) return { error: 'Completed date is required' }

  const expiryDate = (formData.get('expiry_date') as string)?.trim() || null
  const deliveryMethod = (formData.get('delivery_method') as string)?.trim() || null
  const provider = (formData.get('provider') as string)?.trim() || null
  const trainerName = (formData.get('trainer_name') as string)?.trim() || null
  const certificateNumber = (formData.get('certificate_number') as string)?.trim() || null
  const certificateFileUrl = (formData.get('certificate_file_url') as string)?.trim() || null
  const certificateFileName = (formData.get('certificate_file_name') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  const { data: record, error } = await supabase
    .from('training_records')
    .insert({
      organisation_id: orgId,
      worker_id: workerId,
      course_id: courseId,
      completed_date: completedDate,
      expiry_date: expiryDate,
      delivery_method: deliveryMethod,
      provider,
      trainer_name: trainerName,
      certificate_number: certificateNumber,
      certificate_file_url: certificateFileUrl,
      certificate_file_name: certificateFileName,
      notes,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/training/records')
  redirect(`/training/records/${record.id}`)
}

// ─── Induction Programs ────────────────────────────────────────────────────

export async function createInductionProgram(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Program name is required' }

  const description = (formData.get('description') as string)?.trim() || null
  const siteId = (formData.get('site_id') as string)?.trim() || null
  const appliesTo = (formData.get('applies_to') as string) || 'all'

  const { data: program, error } = await supabase
    .from('induction_programs')
    .insert({
      organisation_id: orgId,
      name,
      description,
      site_id: siteId,
      applies_to: appliesTo,
      is_active: true,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/training/inductions')
  redirect(`/training/inductions/${program.id}`)
}

// ─── Induction Completions ─────────────────────────────────────────────────

export async function assignInduction(
  workerId: string,
  programId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  if (!workerId) return { error: 'Worker is required' }
  if (!programId) return { error: 'Induction program is required' }

  const { error } = await supabase.from('induction_completions').insert({
    organisation_id: orgId,
    worker_id: workerId,
    program_id: programId,
    status: 'assigned',
  })

  if (error) return { error: error.message }

  revalidatePath('/training/inductions')
  return {}
}

export async function completeInduction(
  completionId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!completionId) return { error: 'Completion ID is required' }

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('induction_completions')
    .update({
      status: 'completed',
      completed_at: now,
      acknowledged_at: now,
    })
    .eq('id', completionId)

  if (error) return { error: error.message }

  revalidatePath('/training/inductions')
  return {}
}

// ─── Course Modules ────────────────────────────────────────────────────────

export async function addCourseModule(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const courseId = (formData.get('course_id') as string)?.trim()
  if (!courseId) return { error: 'Course ID is required' }

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Module title is required' }

  // Auto-increment module_number from current max + 1
  const { data: existing } = await supabase
    .from('training_course_modules')
    .select('module_number')
    .eq('course_id', courseId)
    .order('module_number', { ascending: false })
    .limit(1)
    .single()

  const moduleNumber = existing ? existing.module_number + 1 : 1

  const description = (formData.get('description') as string)?.trim() || null
  const contentType = (formData.get('content_type') as string)?.trim() || null
  const contentUrl = (formData.get('content_url') as string)?.trim() || null
  const durationMinutesRaw = formData.get('duration_minutes') as string
  const isMandatory = formData.get('is_mandatory') !== 'false'

  const { error } = await supabase.from('training_course_modules').insert({
    course_id: courseId,
    organisation_id: orgId,
    module_number: moduleNumber,
    title,
    description,
    content_type: contentType,
    content_url: contentUrl,
    duration_minutes: durationMinutesRaw ? parseInt(durationMinutesRaw, 10) : null,
    is_mandatory: isMandatory,
  })

  if (error) return { error: error.message }

  revalidatePath(`/training/courses/${courseId}`)
  redirect(`/training/courses/${courseId}`)
}
