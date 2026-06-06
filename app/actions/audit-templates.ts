'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

type CriterionInput = {
  reference_number: string | null
  criterion_text: string
  guidance: string | null
  evidence_required: string | null
}

export async function createAuditTemplate(formData: FormData): Promise<{ error?: string }> {
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
  const auditTypeId = formData.get('audit_type_id') as string | null
  const description = formData.get('description') as string | null
  const standardReference = formData.get('standard_reference') as string | null

  if (!name?.trim()) return { error: 'Template name is required' }

  let criteria: CriterionInput[] = []
  try {
    const raw = formData.get('criteria_json') as string
    if (raw) criteria = JSON.parse(raw)
  } catch {
    return { error: 'Invalid criteria data' }
  }

  if (criteria.length === 0) return { error: 'At least one criterion is required' }

  const { data: template, error: tplError } = await supabase
    .from('audit_templates')
    .insert({
      organisation_id: profile.organisation_id,
      audit_type_id: auditTypeId || null,
      name: name.trim(),
      description: description?.trim() || null,
      standard_reference: standardReference?.trim() || null,
      is_published: false,
      is_active: true,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (tplError) return { error: tplError.message }

  const criteriaRows = criteria.map((c, i) => ({
    template_id: template.id,
    reference_number: c.reference_number || null,
    criterion_text: c.criterion_text,
    guidance: c.guidance || null,
    evidence_required: c.evidence_required || null,
    order_index: i,
    is_active: true,
  }))

  const { error: cErr } = await supabase
    .from('audit_template_criteria')
    .insert(criteriaRows)

  if (cErr) return { error: cErr.message }

  revalidatePath('/audits/templates')
  redirect(`/audits/templates/${template.id}`)
}

export async function publishAuditTemplate(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('audit_templates')
    .update({ is_published: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/audits/templates/${id}`)
  revalidatePath('/audits/templates')
  return {}
}

export async function unpublishAuditTemplate(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('audit_templates')
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/audits/templates/${id}`)
  revalidatePath('/audits/templates')
  return {}
}

export async function deleteAuditTemplate(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('audit_templates')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/audits/templates')
  redirect('/audits/templates')
}
