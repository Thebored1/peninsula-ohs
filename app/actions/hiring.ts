'use server'

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { getOrgProvince } from '@/lib/supabase/get-org-province'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { jsPDF } from 'jspdf'

// ─── Admin client (service role — for auth user creation + storage) ───────────

function adminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComplianceCheckResult {
  rule_key: string
  rule_label: string
  severity: 'info' | 'warning' | 'error'
  passed: boolean
  message: string
}

export interface PreStartTask {
  task_title: string
  task_type: string
  is_required: boolean
  display_order: number
}

// ─── Jurisdiction helpers ──────────────────────────────────────────────────────

export async function getJurisdictionRules(province: string) {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data } = await supabase
    .from('employment_jurisdiction_rules')
    .select('*')
    .eq('province_code', province)
    .eq('is_active', true)
    .is('expiry_date', null)
    .or(`organisation_id.is.null,organisation_id.eq.${orgId}`)
    .order('rule_type')

  return data ?? []
}

// ─── Template helpers ──────────────────────────────────────────────────────────

export async function getHrTemplates() {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return []

  const { data } = await supabase
    .from('hr_document_templates')
    .select('id, name, template_type, description, is_system_template, applicable_provinces, variable_definitions')
    .or(`organisation_id.is.null,organisation_id.eq.${orgId}`)
    .eq('is_active', true)
    .order('name')

  return data ?? []
}

// ─── Hiring Workflow — Step saves ─────────────────────────────────────────────

export async function saveHireStep1(
  hireId: string | null,
  formData: FormData
): Promise<{ hireId: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { hireId: '', error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { hireId: '', error: 'No organisation found' }

  const firstName = (formData.get('candidate_first_name') as string)?.trim()
  const lastName = (formData.get('candidate_last_name') as string)?.trim()
  const email = (formData.get('candidate_email') as string)?.trim()
  const phone = (formData.get('candidate_phone') as string)?.trim() || null

  if (!firstName) return { hireId: hireId ?? '', error: 'First name is required' }
  if (!lastName) return { hireId: hireId ?? '', error: 'Last name is required' }
  if (!email) return { hireId: hireId ?? '', error: 'Email is required' }

  if (!hireId) {
    const { data, error } = await supabase
      .from('hires')
      .insert({
        organisation_id: orgId,
        candidate_first_name: firstName,
        candidate_last_name: lastName,
        candidate_email: email,
        candidate_phone: phone,
        status: 'in_progress',
        current_step: 1,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (error) return { hireId: '', error: error.message }
    return { hireId: data.id }
  }

  const { error } = await supabase
    .from('hires')
    .update({
      candidate_first_name: firstName,
      candidate_last_name: lastName,
      candidate_email: email,
      candidate_phone: phone,
    })
    .eq('id', hireId)
    .eq('organisation_id', orgId)

  if (error) return { hireId, error: error.message }
  return { hireId }
}

export async function saveHireStep2(
  hireId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const positionTitle = (formData.get('position_title') as string)?.trim() || null
  const employmentType = (formData.get('employment_type') as string) || null
  const siteId = (formData.get('site_id') as string)?.trim() || null
  const departmentId = (formData.get('department_id') as string)?.trim() || null
  const startDate = (formData.get('start_date') as string)?.trim() || null
  const isFixedTerm = formData.get('is_fixed_term') === 'true'
  const contractEndDate = (formData.get('contract_end_date') as string)?.trim() || null
  const probationDaysRaw = formData.get('probation_period_days') as string
  const reportsToId = (formData.get('reports_to_id') as string)?.trim() || null

  const { error } = await supabase
    .from('hires')
    .update({
      position_title: positionTitle,
      employment_type: employmentType,
      site_id: siteId || null,
      department_id: departmentId || null,
      start_date: startDate || null,
      is_fixed_term: isFixedTerm,
      contract_end_date: isFixedTerm ? (contractEndDate || null) : null,
      probation_period_days: probationDaysRaw ? parseInt(probationDaysRaw, 10) : null,
      reports_to_id: reportsToId || null,
      current_step: 2,
    })
    .eq('id', hireId)
    .eq('organisation_id', orgId)

  if (error) return { error: error.message }
  return {}
}

export async function saveHireStep3(
  hireId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const salaryRaw = formData.get('salary_amount') as string
  const hourlyRaw = formData.get('hourly_rate') as string
  const payFrequency = (formData.get('pay_frequency') as string) || null
  const overtimeEligible = formData.get('overtime_eligible') === 'true'

  const { error } = await supabase
    .from('hires')
    .update({
      salary_amount: salaryRaw ? parseFloat(salaryRaw) : null,
      hourly_rate: hourlyRaw ? parseFloat(hourlyRaw) : null,
      pay_frequency: payFrequency,
      overtime_eligible: overtimeEligible,
      current_step: 3,
    })
    .eq('id', hireId)
    .eq('organisation_id', orgId)

  if (error) return { error: error.message }
  return {}
}

// ─── Step 4 — Compliance Check ────────────────────────────────────────────────

export async function runComplianceCheck(
  hireId: string
): Promise<{ results: ComplianceCheckResult[]; passed: boolean; error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { results: [], passed: false, error: 'No organisation found' }

  // Fetch the hire with site → org province
  const { data: hire } = await supabase
    .from('hires')
    .select('*, sites(organisations(province))')
    .eq('id', hireId)
    .eq('organisation_id', orgId)
    .single()

  if (!hire) return { results: [], passed: false, error: 'Hire not found' }

  // Resolve province
  const siteOrg = hire.sites as { organisations: { province: string | null } } | null
  const province: string | null =
    (Array.isArray(siteOrg)
      ? (siteOrg[0] as { organisations: { province: string | null } } | undefined)
      : siteOrg
    )?.organisations?.province ?? await getOrgProvince()

  if (!province) {
    return {
      results: [{
        rule_key: 'no_province',
        rule_label: 'Province Not Set',
        severity: 'warning',
        passed: false,
        message: 'No province is set for this site or organisation. Set a province in Organisation Settings to enable compliance checks.',
      }],
      passed: true,
    }
  }

  const rules = await getJurisdictionRules(province)
  const results: ComplianceCheckResult[] = []

  const PROVINCE_NAMES: Record<string, string> = {
    ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec',
    SK: 'Saskatchewan', MB: 'Manitoba', NS: 'Nova Scotia', NB: 'New Brunswick',
    PE: 'Prince Edward Island', NL: 'Newfoundland & Labrador',
  }
  const provinceName = PROVINCE_NAMES[province] ?? province

  // ── Check 1: Minimum wage ──
  const minWageRule = rules.find(r => r.rule_type === 'minimum_wage' && r.rule_key === 'min_wage_general')
  if (minWageRule && hire.pay_frequency === 'hourly') {
    if (hire.hourly_rate == null) {
      results.push({
        rule_key: 'min_wage_general',
        rule_label: minWageRule.rule_label,
        severity: 'warning',
        passed: false,
        message: `Could not verify minimum wage compliance — hourly rate not specified. ${provinceName} minimum wage is $${minWageRule.rule_value}.`,
      })
    } else if (hire.hourly_rate < (minWageRule.rule_value_numeric ?? 0)) {
      results.push({
        rule_key: 'min_wage_general',
        rule_label: minWageRule.rule_label,
        severity: 'error',
        passed: false,
        message: `Hourly rate ($${hire.hourly_rate}) is below the ${provinceName} minimum wage ($${minWageRule.rule_value} effective ${minWageRule.effective_date}).`,
      })
    } else {
      results.push({
        rule_key: 'min_wage_general',
        rule_label: minWageRule.rule_label,
        severity: 'info',
        passed: true,
        message: `Hourly rate ($${hire.hourly_rate}) meets the ${provinceName} minimum wage ($${minWageRule.rule_value}).`,
      })
    }
  }

  // ── Check 2: Probation period ──
  const probationRule = rules.find(r => r.rule_type === 'probation_max_days')
  if (probationRule) {
    if (hire.probation_period_days == null) {
      results.push({
        rule_key: 'probation_max',
        rule_label: probationRule.rule_label,
        severity: 'warning',
        passed: false,
        message: `No probation period specified. ${provinceName} allows up to ${probationRule.rule_value} days.`,
      })
    } else if (hire.probation_period_days > (probationRule.rule_value_numeric ?? 90)) {
      results.push({
        rule_key: 'probation_max',
        rule_label: probationRule.rule_label,
        severity: 'error',
        passed: false,
        message: `Probation period of ${hire.probation_period_days} days exceeds the ${provinceName} maximum of ${probationRule.rule_value} days.`,
      })
    } else {
      results.push({
        rule_key: 'probation_max',
        rule_label: probationRule.rule_label,
        severity: 'info',
        passed: true,
        message: `Probation period of ${hire.probation_period_days} days is within the ${provinceName} maximum of ${probationRule.rule_value} days.`,
      })
    }
  }

  // ── Check 3: Fixed-term end date ──
  if (hire.is_fixed_term) {
    if (!hire.contract_end_date) {
      results.push({
        rule_key: 'fixed_term_end_date',
        rule_label: 'Fixed-Term Contract End Date',
        severity: 'error',
        passed: false,
        message: `Fixed-term contracts in ${provinceName} require a specified end date.`,
      })
    } else {
      results.push({
        rule_key: 'fixed_term_end_date',
        rule_label: 'Fixed-Term Contract End Date',
        severity: 'info',
        passed: true,
        message: `Fixed-term contract end date is set: ${hire.contract_end_date}.`,
      })
    }
  }

  // ── Check 4: Required documents (informational) ──
  const requiredDocRules = rules.filter(r => r.rule_type === 'required_doc')
  for (const rule of requiredDocRules) {
    results.push({
      rule_key: rule.rule_key,
      rule_label: rule.rule_label,
      severity: 'info',
      passed: true,
      message: `${provinceName} requires: ${rule.rule_label}${rule.notes ? ' — ' + rule.notes : ''}`,
    })
  }

  // ── Check 5: Stat holiday pay for casual/part-time ──
  const statHolidayRule = rules.find(r => r.rule_type === 'stat_holiday_pay_pct')
  if (statHolidayRule && (hire.employment_type === 'casual' || hire.employment_type === 'part_time')) {
    results.push({
      rule_key: 'stat_holiday_pay',
      rule_label: statHolidayRule.rule_label,
      severity: 'info',
      passed: true,
      message: `${provinceName} requires ${statHolidayRule.rule_value}% vacation/stat holiday pay on all earnings for ${hire.employment_type} workers.`,
    })
  }

  const passed = !results.some(r => r.severity === 'error')

  // Store results in the hire record
  await supabase
    .from('hires')
    .update({
      compliance_province: province,
      compliance_check_results: results,
      compliance_passed_at: passed ? new Date().toISOString() : null,
      current_step: 4,
    })
    .eq('id', hireId)
    .eq('organisation_id', orgId)

  return { results, passed }
}

export async function acknowledgeComplianceOverride(
  hireId: string,
  overrides: string[]
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const { error } = await supabase
    .from('hires')
    .update({
      compliance_overrides: overrides,
      current_step: 4,
    })
    .eq('id', hireId)
    .eq('organisation_id', orgId)

  if (error) return { error: error.message }
  return {}
}

// ─── Step 5 — Document Generation ────────────────────────────────────────────

function substituteVars(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value ?? ''),
    template
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function generateHireDocuments(
  hireId: string,
  templateIds: string[]
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  // Fetch hire with org info
  const { data: hire } = await supabase
    .from('hires')
    .select('*, organisations!organisation_id(name, province), sites(name)')
    .eq('id', hireId)
    .eq('organisation_id', orgId)
    .single()

  if (!hire) return { error: 'Hire not found' }

  const org = Array.isArray(hire.organisations) ? hire.organisations[0] : hire.organisations as { name: string; province: string } | null
  const site = Array.isArray(hire.sites) ? hire.sites[0] : hire.sites as { name: string } | null
  const province = hire.compliance_province ?? org?.province ?? ''
  const today = new Date().toLocaleDateString('en-CA')

  // Build variable map
  const probationLabel = hire.probation_period_days
    ? `${hire.probation_period_days} days`
    : 'Not applicable'

  const probationEndDate = hire.start_date && hire.probation_period_days
    ? formatDate(new Date(new Date(hire.start_date).getTime() + hire.probation_period_days * 86400000).toISOString())
    : '—'

  let compensationSummary = ''
  if (hire.pay_frequency === 'hourly' && hire.hourly_rate) {
    compensationSummary = `$${hire.hourly_rate}/hour (${hire.pay_frequency})`
  } else if (hire.salary_amount) {
    compensationSummary = `$${hire.salary_amount.toLocaleString('en-CA')} per year (${hire.pay_frequency ?? 'annual'})`
  }

  const vars: Record<string, string> = {
    employer_name: org?.name ?? 'The Employer',
    document_date: today,
    employee_full_name: `${hire.candidate_first_name ?? ''} ${hire.candidate_last_name ?? ''}`.trim(),
    position_title: hire.position_title ?? '',
    start_date: formatDate(hire.start_date),
    employment_type: hire.employment_type?.replace(/_/g, ' ') ?? '',
    employment_type_clause: hire.is_fixed_term
      ? `This is a fixed-term employment arrangement commencing ${formatDate(hire.start_date)} and ending ${formatDate(hire.contract_end_date)}.`
      : `This is a permanent ${(hire.employment_type ?? '').replace(/_/g, ' ')} employment arrangement.`,
    site_name: site?.name ?? '',
    reports_to_name: '',
    compensation_summary: compensationSummary,
    offer_expiry_date: formatDate(
      new Date(Date.now() + 7 * 86400000).toISOString()
    ),
    probation_period: probationLabel,
    probation_end_date: probationEndDate,
    contract_end_date: formatDate(hire.contract_end_date),
    vacation_pay_pct: '4',
    governing_province: province,
    nda_duration_years: '2',
    hours_per_week: '40',
    employer_signatory_name: 'Authorised Representative',
    employer_signatory_title: 'Human Resources',
  }

  // Fetch manager name if set
  if (hire.reports_to_id) {
    const { data: manager } = await supabase
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('id', hire.reports_to_id)
      .single()
    if (manager) vars.reports_to_name = `${manager.first_name} ${manager.last_name}`
  }

  const admin = adminClient()

  for (const templateId of templateIds) {
    const { data: template } = await supabase
      .from('hr_document_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (!template) continue

    // Inject province clause
    const provinceClause = (template.province_clauses as Record<string, string> | null)?.[province]
    const fullContent = provinceClause
      ? `${template.body_content}\n\n─────────────────────────────────────────────────────────────\nJURISDICTION-SPECIFIC TERMS (${province})\n\n${provinceClause}`
      : template.body_content

    const resolvedText = substituteVars(fullContent, vars)

    // Generate PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })

    // Header
    doc.setFillColor(15, 98, 254)
    doc.rect(0, 0, 216, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(org?.name ?? 'Lumis', 14, 13)

    doc.setTextColor(22, 22, 22)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(template.name, 14, 32)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(82, 82, 82)
    doc.text(`Date: ${today}`, 14, 39)

    doc.setDrawColor(224, 224, 224)
    doc.line(14, 43, 202, 43)

    // Body
    doc.setTextColor(22, 22, 22)
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(resolvedText, 188)
    let y = 50
    const pageHeight = doc.internal.pageSize.height
    for (const line of lines) {
      if (y > pageHeight - 20) {
        doc.addPage()
        y = 20
      }
      doc.text(line, 14, y)
      y += 5
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const fileName = `${template.template_type}_${hireId.substring(0, 8)}.pdf`
    const storagePath = `hiring/${orgId}/${hireId}/${fileName}`

    const { error: uploadError } = await admin.storage
      .from('org-documents')
      .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

    if (uploadError) return { error: `Failed to upload ${template.name}: ${uploadError.message}` }

    const { error: insertError } = await supabase.from('hire_documents').insert({
      organisation_id: orgId,
      hire_id: hireId,
      template_id: templateId,
      document_type: template.template_type,
      file_name: fileName,
      storage_path: storagePath,
      file_size_bytes: pdfBuffer.byteLength,
      generated_by: user.id,
      requires_candidate_sig: true,
      requires_employer_sig: false,
      created_by: user.id,
    })

    if (insertError) return { error: insertError.message }
  }

  await supabase
    .from('hires')
    .update({ current_step: 5 })
    .eq('id', hireId)
    .eq('organisation_id', orgId)

  revalidatePath(`/hiring/${hireId}`)
  return {}
}

// ─── Step 6 — Record document signature ───────────────────────────────────────

export async function recordDocumentSignature(
  hireDocumentId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const signatureUrl = (formData.get('signature_url') as string)?.trim() || null
  const now = new Date().toISOString()

  const { data: doc, error: fetchError } = await supabase
    .from('hire_documents')
    .select('hire_id')
    .eq('id', hireDocumentId)
    .eq('organisation_id', orgId)
    .single()

  if (fetchError || !doc) return { error: 'Document not found' }

  const { error } = await supabase
    .from('hire_documents')
    .update({
      candidate_signed_at: now,
      candidate_signature_url: signatureUrl,
    })
    .eq('id', hireDocumentId)
    .eq('organisation_id', orgId)

  if (error) return { error: error.message }

  // Check if all docs for this hire are now signed
  const { data: allDocs } = await supabase
    .from('hire_documents')
    .select('requires_candidate_sig, candidate_signed_at')
    .eq('hire_id', doc.hire_id)
    .eq('organisation_id', orgId)

  const allSigned = (allDocs ?? []).every(
    d => !d.requires_candidate_sig || d.candidate_signed_at != null
  )

  if (allSigned) {
    await supabase
      .from('hires')
      .update({
        all_signatures_collected: true,
        signatures_collected_at: now,
        current_step: 6,
      })
      .eq('id', doc.hire_id)
      .eq('organisation_id', orgId)
  }

  revalidatePath(`/hiring/${doc.hire_id}/documents`)
  return {}
}

// ─── Step 7 — Pre-start checklist ─────────────────────────────────────────────

export async function savePreStartChecklist(
  hireId: string,
  tasks: PreStartTask[]
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  // Delete + re-insert (idempotent)
  await supabase.from('hire_prestart_tasks').delete().eq('hire_id', hireId).eq('organisation_id', orgId)

  if (tasks.length > 0) {
    const { error } = await supabase.from('hire_prestart_tasks').insert(
      tasks.map(t => ({
        organisation_id: orgId,
        hire_id: hireId,
        task_title: t.task_title,
        task_type: t.task_type,
        is_required: t.is_required,
        display_order: t.display_order,
        created_by: user.id,
      }))
    )
    if (error) return { error: error.message }
  }

  await supabase
    .from('hires')
    .update({ current_step: 7 })
    .eq('id', hireId)
    .eq('organisation_id', orgId)

  revalidatePath(`/hiring/${hireId}/checklist`)
  return {}
}

export async function completePreStartTask(taskId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const { data: task, error: fetchError } = await supabase
    .from('hire_prestart_tasks')
    .select('hire_id, is_required')
    .eq('id', taskId)
    .eq('organisation_id', orgId)
    .single()

  if (fetchError || !task) return { error: 'Task not found' }

  const { error } = await supabase
    .from('hire_prestart_tasks')
    .update({ is_completed: true, completed_at: new Date().toISOString(), completed_by: user.id })
    .eq('id', taskId)
    .eq('organisation_id', orgId)

  if (error) return { error: error.message }

  // Check if all required tasks are done
  const { data: allTasks } = await supabase
    .from('hire_prestart_tasks')
    .select('is_required, is_completed')
    .eq('hire_id', task.hire_id)
    .eq('organisation_id', orgId)

  const allRequiredDone = (allTasks ?? [])
    .filter(t => t.is_required)
    .every(t => t.is_completed)

  if (allRequiredDone) {
    await supabase
      .from('hires')
      .update({ checklist_completed: true, checklist_completed_at: new Date().toISOString() })
      .eq('id', task.hire_id)
      .eq('organisation_id', orgId)
  }

  revalidatePath(`/hiring/${task.hire_id}/checklist`)
  return {}
}

// ─── Step 8 — Finalise hire (creates worker profile) ──────────────────────────

export async function finaliseHire(
  hireId: string
): Promise<{ workerId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const { data: hire } = await supabase
    .from('hires')
    .select('*')
    .eq('id', hireId)
    .eq('organisation_id', orgId)
    .single()

  if (!hire) return { error: 'Hire not found' }
  if (hire.status === 'completed') return { error: 'This hire is already completed' }
  if (!hire.candidate_email) return { error: 'Candidate email is required' }

  const admin = adminClient()

  // Create auth user
  const { data: userData, error: authError } = await admin.auth.admin.createUser({
    email: hire.candidate_email,
    email_confirm: true,
    user_metadata: {
      first_name: hire.candidate_first_name,
      last_name: hire.candidate_last_name,
    },
  })

  if (authError) return { error: authError.message }
  const workerId = userData.user.id

  // Create worker profile
  const { error: profileError } = await admin.from('user_profiles').insert({
    id: workerId,
    organisation_id: orgId,
    first_name: hire.candidate_first_name,
    last_name: hire.candidate_last_name,
    email: hire.candidate_email,
    phone: hire.candidate_phone ?? null,
    job_title: hire.position_title ?? null,
    employment_type: hire.employment_type ?? null,
    hire_date: hire.start_date ?? null,
    primary_site_id: hire.site_id ?? null,
    primary_department_id: hire.department_id ?? null,
    is_active: true,
    created_by: user.id,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(workerId)
    return { error: profileError.message }
  }

  // Mark hire completed
  await supabase
    .from('hires')
    .update({
      worker_id: workerId,
      status: 'completed',
      completed_at: new Date().toISOString(),
      current_step: 8,
    })
    .eq('id', hireId)
    .eq('organisation_id', orgId)

  // Assign onboarding checklists
  await assignOnboardingChecklists(hireId, workerId, hire, orgId, user.id, supabase)

  // Create compliance calendar entries
  await createComplianceCalendarEntries(hire, workerId, orgId, user.id, supabase)

  // Fire hiring.completed notification
  try {
    await supabase.rpc('create_notification', {
      p_trigger_event: 'hiring.completed',
      p_organisation_id: orgId,
      p_site_id: hire.site_id,
      p_trigger_entity_type: 'hire',
      p_trigger_entity_id: hireId,
      p_data: {
        worker_name: `${hire.candidate_first_name ?? ''} ${hire.candidate_last_name ?? ''}`.trim(),
        position_title: hire.position_title ?? '',
        start_date: hire.start_date ?? '',
        hire_number: hire.hire_number ?? hireId,
      },
    })
  } catch {
    // Notification failure must not block hire completion
  }

  revalidatePath('/hiring')
  revalidatePath('/workers')
  redirect(`/workers/${workerId}`)
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

async function assignOnboardingChecklists(
  hireId: string,
  workerId: string,
  hire: Record<string, unknown>,
  orgId: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data: templates } = await supabase
    .from('onboarding_templates')
    .select('id')
    .eq('organisation_id', orgId)
    .eq('is_active', true)

  if (!templates || templates.length === 0) return

  const employmentType = hire.employment_type as string | null
  const startDate = hire.start_date as string | null

  for (const template of templates) {
    const { data: assignment } = await supabase
      .from('onboarding_assignments')
      .insert({
        organisation_id: orgId,
        hire_id: hireId,
        worker_id: workerId,
        template_id: template.id,
        status: 'assigned',
        start_date: startDate,
        created_by: userId,
      })
      .select('id')
      .single()

    if (!assignment) continue

    // Create task completion rows from template tasks
    const { data: tasks } = await supabase
      .from('onboarding_template_tasks')
      .select('id, due_days_from_start')
      .eq('template_id', template.id)

    if (tasks && tasks.length > 0) {
      await supabase.from('onboarding_task_completions').insert(
        tasks.map(t => ({
          organisation_id: orgId,
          assignment_id: assignment.id,
          template_task_id: t.id,
          worker_id: workerId,
          status: 'pending',
          due_date: startDate && t.due_days_from_start != null
            ? new Date(new Date(startDate).getTime() + t.due_days_from_start * 86400000)
                .toISOString().split('T')[0]
            : null,
          created_by: userId,
        }))
      )
    }
  }
}

async function createComplianceCalendarEntries(
  hire: Record<string, unknown>,
  workerId: string,
  orgId: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const startDate = hire.start_date as string | null
  const probationDays = hire.probation_period_days as number | null
  const isFixedTerm = hire.is_fixed_term as boolean
  const contractEndDate = hire.contract_end_date as string | null
  const workerName = `${hire.candidate_first_name ?? ''} ${hire.candidate_last_name ?? ''}`.trim()

  // Probation review compliance obligation
  if (startDate && probationDays) {
    const reviewDate = new Date(new Date(startDate).getTime() + probationDays * 86400000)
      .toISOString().split('T')[0]
    await supabase.from('compliance_obligations').insert({
      organisation_id: orgId,
      title: `Probation Review — ${workerName}`,
      description: `End-of-probation review for ${workerName} (${hire.position_title ?? 'new hire'}).`,
      frequency: 'one_time',
      next_due_date: reviewDate,
      owner_id: hire.reports_to_id as string | null ?? null,
      status: 'active',
      is_critical: false,
      created_by: userId,
    })
  }

  // Fixed-term contract end alert (60 days before end)
  if (isFixedTerm && contractEndDate) {
    const alertDate = new Date(new Date(contractEndDate).getTime() - 60 * 86400000)
      .toISOString().split('T')[0]
    await supabase.from('compliance_obligations').insert({
      organisation_id: orgId,
      title: `Fixed-Term Contract Ending — ${workerName}`,
      description: `The fixed-term contract for ${workerName} (${hire.position_title ?? 'new hire'}) ends on ${contractEndDate}. Decide whether to renew, convert, or let expire.`,
      frequency: 'one_time',
      next_due_date: alertDate,
      status: 'active',
      is_critical: false,
      created_by: userId,
    })
  }
}

// ─── Onboarding template management ───────────────────────────────────────────

export async function createOnboardingTemplate(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Name is required' }

  const description = (formData.get('description') as string)?.trim() || null
  const siteId = (formData.get('site_id') as string)?.trim() || null
  const employmentTypes = formData.getAll('employment_types') as string[]

  const { error } = await supabase.from('onboarding_templates').insert({
    organisation_id: orgId,
    name,
    description,
    site_id: siteId || null,
    employment_types: employmentTypes.length > 0 ? employmentTypes : null,
    is_active: true,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/hiring/onboarding/templates')
  redirect('/hiring/onboarding/templates')
}

export async function updateOnboardingTemplate(
  id: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Name is required' }

  const description = (formData.get('description') as string)?.trim() || null
  const siteId = (formData.get('site_id') as string)?.trim() || null
  const isActive = formData.get('is_active') !== 'false'
  const employmentTypes = formData.getAll('employment_types') as string[]

  const { error } = await supabase
    .from('onboarding_templates')
    .update({
      name,
      description,
      site_id: siteId || null,
      employment_types: employmentTypes.length > 0 ? employmentTypes : null,
      is_active: isActive,
    })
    .eq('id', id)
    .eq('organisation_id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/hiring/onboarding/templates')
  revalidatePath(`/hiring/onboarding/templates/${id}`)
  redirect(`/hiring/onboarding/templates/${id}`)
}

export async function addOnboardingTemplateTask(
  templateId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const title = (formData.get('task_title') as string)?.trim()
  if (!title) return { error: 'Task title is required' }

  const { data: existing } = await supabase
    .from('onboarding_template_tasks')
    .select('display_order')
    .eq('template_id', templateId)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = existing ? existing.display_order + 1 : 0

  const dueDays = (formData.get('due_days_from_start') as string)?.trim()
  const documentId = (formData.get('document_id') as string)?.trim() || null
  const courseId = (formData.get('training_course_id') as string)?.trim() || null

  const { error } = await supabase.from('onboarding_template_tasks').insert({
    organisation_id: orgId,
    template_id: templateId,
    task_title: title,
    task_description: (formData.get('task_description') as string)?.trim() || null,
    task_type: (formData.get('task_type') as string) || 'task',
    due_days_from_start: dueDays ? parseInt(dueDays, 10) : null,
    document_id: documentId || null,
    training_course_id: courseId || null,
    is_required: formData.get('is_required') !== 'false',
    display_order: nextOrder,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath(`/hiring/onboarding/templates/${templateId}`)
  return {}
}

export async function completeOnboardingTask(
  completionId: string,
  notes?: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const { data: completion } = await supabase
    .from('onboarding_task_completions')
    .select('assignment_id')
    .eq('id', completionId)
    .eq('organisation_id', orgId)
    .single()

  if (!completion) return { error: 'Task not found' }

  const { error } = await supabase
    .from('onboarding_task_completions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: user.id,
      notes: notes ?? null,
    })
    .eq('id', completionId)
    .eq('organisation_id', orgId)

  if (error) return { error: error.message }

  // Check if all tasks in assignment are done
  const { data: allTasks } = await supabase
    .from('onboarding_task_completions')
    .select('status')
    .eq('assignment_id', completion.assignment_id)
    .eq('organisation_id', orgId)

  const allDone = (allTasks ?? []).every(t => t.status === 'completed' || t.status === 'skipped' || t.status === 'waived')

  if (allDone) {
    await supabase
      .from('onboarding_assignments')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', completion.assignment_id)
      .eq('organisation_id', orgId)
  }

  revalidatePath(`/hiring/onboarding/${completion.assignment_id}`)
  return {}
}

// ─── HR template management ────────────────────────────────────────────────────

export async function createHrTemplate(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Template name is required' }

  const bodyContent = (formData.get('body_content') as string)?.trim()
  if (!bodyContent) return { error: 'Template body is required' }

  const applicableProvinces = formData.getAll('applicable_provinces') as string[]

  // Parse province clauses from individual fields
  const PROVINCE_CODES = ['ON', 'BC', 'AB', 'QC', 'SK', 'MB', 'NS', 'NB', 'PE', 'NL']
  const provinceClauses: Record<string, string> = {}
  for (const code of PROVINCE_CODES) {
    const clause = (formData.get(`province_clause_${code}`) as string)?.trim()
    if (clause) provinceClauses[code] = clause
  }

  const { error } = await supabase.from('hr_document_templates').insert({
    organisation_id: orgId,
    template_type: (formData.get('template_type') as string) || 'custom',
    name,
    description: (formData.get('description') as string)?.trim() || null,
    body_content: bodyContent,
    province_clauses: Object.keys(provinceClauses).length > 0 ? provinceClauses : null,
    applicable_provinces: applicableProvinces.length > 0 ? applicableProvinces : null,
    variable_definitions: [],
    is_active: true,
    is_system_template: false,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/hiring/templates')
  redirect('/hiring/templates')
}

export async function updateHrTemplate(
  id: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Template name is required' }

  const bodyContent = (formData.get('body_content') as string)?.trim()
  if (!bodyContent) return { error: 'Template body is required' }

  const applicableProvinces = formData.getAll('applicable_provinces') as string[]
  const PROVINCE_CODES = ['ON', 'BC', 'AB', 'QC', 'SK', 'MB', 'NS', 'NB', 'PE', 'NL']
  const provinceClauses: Record<string, string> = {}
  for (const code of PROVINCE_CODES) {
    const clause = (formData.get(`province_clause_${code}`) as string)?.trim()
    if (clause) provinceClauses[code] = clause
  }

  const { error } = await supabase
    .from('hr_document_templates')
    .update({
      name,
      description: (formData.get('description') as string)?.trim() || null,
      body_content: bodyContent,
      template_type: (formData.get('template_type') as string) || 'custom',
      province_clauses: Object.keys(provinceClauses).length > 0 ? provinceClauses : null,
      applicable_provinces: applicableProvinces.length > 0 ? applicableProvinces : null,
      is_active: formData.get('is_active') !== 'false',
    })
    .eq('id', id)
    .eq('organisation_id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/hiring/templates')
  revalidatePath(`/hiring/templates/${id}`)
  redirect(`/hiring/templates/${id}`)
}

// ─── Cancel hire ───────────────────────────────────────────────────────────────

export async function cancelHire(
  hireId: string,
  reason: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const { error } = await supabase
    .from('hires')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
    })
    .eq('id', hireId)
    .eq('organisation_id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/hiring')
  redirect('/hiring')
}
