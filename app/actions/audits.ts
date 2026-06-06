'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createAudit(formData: FormData): Promise<{ error?: string }> {
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

  const auditTypeId = formData.get('audit_type_id') as string
  const title = formData.get('title') as string
  const templateId = formData.get('template_id') as string | null
  const scope = formData.get('scope') as string | null
  const objectives = formData.get('objectives') as string | null
  const standardReference = formData.get('standard_reference') as string | null
  const leadAuditorId = formData.get('lead_auditor_id') as string | null
  const plannedStartDate = formData.get('planned_start_date') as string | null
  const plannedEndDate = formData.get('planned_end_date') as string | null
  const reportDueDate = formData.get('report_due_date') as string | null

  if (!auditTypeId) return { error: 'Audit type is required' }
  if (!title?.trim()) return { error: 'Title is required' }

  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('organisation_id', orgId)
    .limit(1)
    .maybeSingle()

  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .insert({
      organisation_id: orgId,
      audit_type_id: auditTypeId,
      template_id: templateId || null,
      title: title.trim(),
      scope: scope?.trim() || null,
      objectives: objectives?.trim() || null,
      standard_reference: standardReference?.trim() || null,
      site_ids: site ? [site.id] : [],
      lead_auditor_id: leadAuditorId || user.id,
      planned_start_date: plannedStartDate || null,
      planned_end_date: plannedEndDate || null,
      report_due_date: reportDueDate || null,
      status: 'planned',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (auditError) return { error: auditError.message }

  // Copy template sections + criteria if template selected
  if (templateId) {
    const { data: tplSections } = await supabase
      .from('audit_template_sections')
      .select('id, title, description, order_index')
      .eq('template_id', templateId)
      .order('order_index')

    const sectionIdMap: Record<string, string> = {}

    if (tplSections && tplSections.length > 0) {
      for (const s of tplSections) {
        const { data: newSection } = await supabase
          .from('audit_sections')
          .insert({
            audit_id: audit.id,
            template_section_id: s.id,
            organisation_id: orgId,
            title: s.title,
            description: s.description,
            order_index: s.order_index,
          })
          .select('id')
          .single()
        if (newSection) sectionIdMap[s.id] = newSection.id
      }
    }

    const { data: criteria } = await supabase
      .from('audit_template_criteria')
      .select('id, section_id, reference_number, criterion_text, guidance, evidence_required, order_index')
      .eq('template_id', templateId)
      .eq('is_active', true)
      .order('order_index')

    if (criteria && criteria.length > 0) {
      const criteriaRows = criteria.map(c => ({
        audit_id: audit.id,
        section_id: c.section_id ? (sectionIdMap[c.section_id] ?? null) : null,
        template_criterion_id: c.id,
        organisation_id: orgId,
        reference_number: c.reference_number,
        criterion_text: c.criterion_text,
        guidance: c.guidance,
        evidence_required: c.evidence_required,
        order_index: c.order_index,
      }))
      await supabase.from('audit_criteria').insert(criteriaRows)

      await supabase
        .from('audits')
        .update({ total_criteria: criteria.length })
        .eq('id', audit.id)
    }
  }

  revalidatePath('/audits')
  redirect(`/audits/${audit.id}`)
}

type FindingInput = {
  criterion_id: string
  outcome_id: string
  finding_text: string | null
  recommendation: string | null
  root_cause: string | null
  objective_evidence: string | null
}

export async function saveFindings(
  auditId: string,
  findings: FindingInput[]
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

  const now = new Date().toISOString()

  const upserts = findings
    .filter(f => f.outcome_id)
    .map(f => ({
      audit_id: auditId,
      criterion_id: f.criterion_id,
      outcome_id: f.outcome_id,
      organisation_id: profile.organisation_id,
      finding_text: f.finding_text || null,
      recommendation: f.recommendation || null,
      root_cause: f.root_cause || null,
      objective_evidence: f.objective_evidence || null,
      assessed_by: user.id,
      assessed_at: now,
    }))

  if (upserts.length === 0) return {}

  const { error } = await supabase
    .from('audit_findings')
    .upsert(upserts, { onConflict: 'audit_id,criterion_id' })

  if (error) return { error: error.message }

  // Advance status to in_progress if still planned
  await supabase
    .from('audits')
    .update({ status: 'in_progress', updated_at: now })
    .eq('id', auditId)
    .eq('status', 'planned')

  revalidatePath(`/audits/${auditId}`)
  return {}
}

export async function updateAuditStatus(id: string, status: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { status, updated_at: now }
  if (status === 'in_progress') patch.actual_start_date = now.slice(0, 10)
  if (status === 'completed') patch.actual_end_date = now.slice(0, 10)

  const { error } = await supabase
    .from('audits')
    .update(patch)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/audits/${id}`)
  revalidatePath('/audits')
  return {}
}

export async function deleteAudit(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('audits')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/audits')
  redirect('/audits')
}
