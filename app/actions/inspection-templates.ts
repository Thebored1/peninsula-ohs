'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

type QuestionInput = {
  question_text: string
  question_type: string
  is_required: boolean
  is_scored: boolean
  weight: number
  options: string[] | null
  fail_condition: Record<string, unknown> | null
  action_required_on_fail: boolean
  suggested_action: string | null
}

export async function createTemplate(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const name = formData.get('name') as string
  const inspectionTypeId = formData.get('inspection_type_id') as string
  const description = formData.get('description') as string | null
  const instructions = formData.get('instructions') as string | null
  const passingScore = parseFloat((formData.get('passing_score_threshold') as string) || '80')
  const durationMinutes = parseInt((formData.get('estimated_duration_minutes') as string) || '0', 10) || null

  if (!name?.trim()) return { error: 'Template name is required' }
  if (!inspectionTypeId) return { error: 'Inspection type is required' }

  let questions: QuestionInput[] = []
  try {
    const raw = formData.get('questions_json') as string
    if (raw) questions = JSON.parse(raw)
  } catch {
    return { error: 'Invalid questions data' }
  }

  if (questions.length === 0) return { error: 'At least one question is required' }

  const { data: template, error: templateError } = await supabase
    .from('inspection_templates')
    .insert({
      organisation_id: profile.organisation_id,
      inspection_type_id: inspectionTypeId,
      name: name.trim(),
      description: description?.trim() || null,
      instructions: instructions?.trim() || null,
      passing_score_threshold: passingScore,
      estimated_duration_minutes: durationMinutes,
      is_published: false,
      is_active: true,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (templateError) return { error: templateError.message }

  const questionRows = questions.map((q, i) => ({
    template_id: template.id,
    question_text: q.question_text,
    question_type: q.question_type,
    is_required: q.is_required,
    is_scored: q.is_scored,
    weight: q.weight || 1,
    options: q.options ? JSON.stringify(q.options) : null,
    fail_condition: q.fail_condition ? JSON.stringify(q.fail_condition) : null,
    action_required_on_fail: q.action_required_on_fail,
    suggested_action: q.suggested_action || null,
    order_index: i,
    is_active: true,
  }))

  const { error: qError } = await supabase
    .from('inspection_template_questions')
    .insert(questionRows)

  if (qError) return { error: qError.message }

  revalidatePath('/inspections/templates')
  redirect(`/inspections/templates/${template.id}`)
}

export async function publishTemplate(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('inspection_templates')
    .update({ is_published: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/inspections/templates/${id}`)
  revalidatePath('/inspections/templates')
  return {}
}

export async function unpublishTemplate(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('inspection_templates')
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/inspections/templates/${id}`)
  revalidatePath('/inspections/templates')
  return {}
}

export async function deleteTemplate(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('inspection_templates')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/inspections/templates')
  redirect('/inspections/templates')
}
