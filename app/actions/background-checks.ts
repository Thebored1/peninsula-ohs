'use server'

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { revalidatePath } from 'next/cache'
import { generateConsentToken, markConsentTokenUsed, generateReferenceToken } from '@/lib/background-checks/token'
import { sendConsentEmail, sendAdverseActionPreNotice, sendAdverseActionFinalNotice, sendReferenceRequest } from '@/lib/background-checks/email'
import { getProviderAdapter } from '@/lib/background-checks/provider'
import { getDisputeWindowCloseDate } from '@/lib/background-checks/adverse-action'
import type { BgcCheckType } from '@/lib/background-checks/provider'

function adminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ─── CREATE PACKAGE & SEND CONSENT ───────────────────────────────────────────

export async function createBgcPackageAndSendConsent(hireId: string): Promise<{
  packageId: string
  error?: string
}> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { packageId: '', error: 'No organisation found' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { packageId: '', error: 'Not authenticated' }

  // Load hire record for candidate details
  const { data: hire } = await supabase
    .from('hires')
    .select('candidate_first_name, candidate_last_name, candidate_email, position_title, compliance_province')
    .eq('id', hireId)
    .single()

  if (!hire) return { packageId: '', error: 'Hire not found' }

  // Create the package
  const { data: pkg, error: pkgErr } = await supabase
    .from('bgc_packages')
    .insert({
      organisation_id:       orgId,
      hire_id:               hireId,
      status:                'draft',
      candidate_first_name:  hire.candidate_first_name,
      candidate_last_name:   hire.candidate_last_name,
      candidate_email:       hire.candidate_email,
      position_title:        hire.position_title,
      province:              hire.compliance_province,
      created_by:            user.id,
    })
    .select('id, package_number')
    .single()

  if (pkgErr || !pkg) return { packageId: '', error: pkgErr?.message ?? 'Failed to create package' }

  // Load required check types from role requirements
  const { data: requirements } = await supabase
    .from('bgc_role_requirements')
    .select('check_type')
    .eq('organisation_id', orgId)
    .eq('position_title', hire.position_title ?? '')
    .eq('requirement_level', 'required')

  const checkTypes: BgcCheckType[] = requirements?.map(r => r.check_type as BgcCheckType) ?? ['identity', 'criminal_standard']

  // Create order rows (one per check type)
  const orderRows = checkTypes.map(ct => ({
    organisation_id: orgId,
    package_id:      pkg.id,
    check_type:      ct,
    status:          'consent_pending',
    created_by:      user.id,
  }))
  await supabase.from('bgc_orders').insert(orderRows)

  // Link package to hire
  await supabase
    .from('hires')
    .update({ bgc_package_id: pkg.id, bgc_required: true, bgc_status: 'consent_pending' })
    .eq('id', hireId)

  // Generate consent token
  const token = await generateConsentToken(pkg.id, 72)
  const consentLink = `${APP_URL}/bgc-consent/${token}`

  // Update package status → consent_pending (triggers notification)
  await supabase
    .from('bgc_packages')
    .update({ status: 'consent_pending', consent_email_sent_at: new Date().toISOString() })
    .eq('id', pkg.id)

  // Send consent email
  const { data: org } = await supabase
    .from('organisations')
    .select('name')
    .eq('id', orgId)
    .single()

  await sendConsentEmail({
    to:              hire.candidate_email,
    candidateName:   `${hire.candidate_first_name} ${hire.candidate_last_name}`,
    organisationName: org?.name ?? 'Your Employer',
    positionTitle:   hire.position_title ?? 'the role',
    consentLink,
    expiresInHours:  72,
  })

  revalidatePath(`/hiring/${hireId}`)
  revalidatePath('/background-checks')
  return { packageId: pkg.id }
}

// ─── RECORD CONSENT (called from the public consent page server action) ───────

export async function recordConsent(opts: {
  token: string
  consentedCheckTypes: BgcCheckType[]
  signature: string
  signedIp: string
  emailCompletedFrom: string
}): Promise<{ error?: string }> {
  const admin = adminClient()

  const tokenHash = require('crypto')
    .createHash('sha256')
    .update(opts.token)
    .digest('hex')

  const { data: tokenRow } = await admin
    .from('bgc_consent_tokens')
    .select('package_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .single()

  if (!tokenRow || tokenRow.used_at || new Date(tokenRow.expires_at) < new Date()) {
    return { error: 'This consent link is invalid or has expired.' }
  }

  const packageId = tokenRow.package_id as string

  // Load system default consent template
  const { data: template } = await admin
    .from('bgc_consent_templates')
    .select('id, version')
    .is('organisation_id', null)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  // Load package for email metadata
  const { data: pkg } = await admin
    .from('bgc_packages')
    .select('consent_email_sent_to:candidate_email')
    .eq('id', packageId)
    .single()

  // Insert permanent consent record
  await admin.from('bgc_consent_records').insert({
    package_id:                  packageId,
    consent_template_id:         template?.id ?? null,
    consent_form_version:        template?.version ?? 1,
    consented_check_types:       opts.consentedCheckTypes,
    candidate_signature:         opts.signature,
    signed_ip:                   opts.signedIp,
    consent_email_sent_to:       pkg?.consent_email_sent_to ?? null,
    consent_email_completed_from: opts.emailCompletedFrom,
  })

  // Mark token as used
  await markConsentTokenUsed(opts.token, opts.signedIp)

  // Advance package to consent_given
  await admin
    .from('bgc_packages')
    .update({ status: 'consent_given', consent_given_at: new Date().toISOString() })
    .eq('id', packageId)

  return {}
}

// ─── SUBMIT CHECK ORDERS TO PROVIDER ─────────────────────────────────────────

export async function submitPackageOrders(packageId: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: pkg } = await supabase
    .from('bgc_packages')
    .select('*, bgc_orders(*)')
    .eq('id', packageId)
    .single()

  if (!pkg) return { error: 'Package not found' }
  if (pkg.status !== 'consent_given') return { error: 'Consent must be received before submitting orders' }

  // Load org provider config
  const { data: orgProvider } = await supabase
    .from('bgc_organisation_providers')
    .select('provider_code, credentials, check_type_mapping')
    .eq('organisation_id', orgId)
    .eq('is_active', true)
    .order('created_at')
    .limit(1)
    .single()

  const providerCode = orgProvider?.provider_code ?? 'stub'
  const creds = (orgProvider?.credentials ?? {}) as Record<string, string>
  const apiKey = creds.api_key ?? 'stub-key'

  const adapter = getProviderAdapter(providerCode)

  // SIN: collected from form, transmitted to provider, never stored
  const candidateSin = (formData.get('sin') as string | null) ?? undefined
  const driversLicenceNumber = formData.get('drivers_licence_number') as string | null
  const driversLicenceProvince = formData.get('drivers_licence_province') as string | null

  const errors: string[] = []

  // Submit each pending order
  for (const order of (pkg.bgc_orders ?? []) as Array<Record<string, unknown>>) {
    if (order.status !== 'consent_pending') continue
    try {
      const result = await adapter.submitCheck(
        {
          externalOrderId:         order.id as string,
          checkType:               order.check_type as BgcCheckType,
          candidateFirstName:      pkg.candidate_first_name,
          candidateLastName:       pkg.candidate_last_name,
          candidateEmail:          pkg.candidate_email,
          candidateDob:            pkg.candidate_dob ?? undefined,
          candidateSin,            // forwarded to provider, not stored
          province:                pkg.province ?? undefined,
          positionTitle:           pkg.position_title ?? undefined,
          driversLicenceNumber:    driversLicenceNumber ?? undefined,
          driversLicenceProvince:  driversLicenceProvince ?? undefined,
        },
        apiKey
      )

      await supabase
        .from('bgc_orders')
        .update({
          status:                'ordered',
          provider_code:         providerCode,
          external_reference_id: result.externalId,
          submitted_at:          new Date().toISOString(),
          expected_by:           result.estimatedCompletionAt ?? null,
        })
        .eq('id', order.id as string)

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${order.check_type}: ${msg}`)
      await supabase
        .from('bgc_orders')
        .update({ status: 'error', error_detail: msg })
        .eq('id', order.id as string)
    }
  }

  // Advance package to in_progress if at least one order submitted
  await supabase
    .from('bgc_packages')
    .update({ status: 'in_progress' })
    .eq('id', packageId)

  revalidatePath(`/background-checks/packages/${packageId}`)
  if (errors.length > 0) return { error: errors.join('; ') }
  return {}
}

// ─── RECORD ADJUDICATION ─────────────────────────────────────────────────────

export async function recordAdjudication(packageId: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const recommendation = formData.get('recommendation') as string
  const rationale = formData.get('rationale') as string
  const humanRightsConsidered = formData.get('human_rights_considered') === 'yes'
  const signature = formData.get('digital_signature') as string

  if (!recommendation || !rationale || !signature) {
    return { error: 'Recommendation, rationale, and signature are required' }
  }
  if (!humanRightsConsidered) {
    return { error: 'You must confirm that you considered human rights obligations before adjudicating' }
  }

  const { error } = await supabase.from('bgc_adjudications').insert({
    organisation_id:         orgId,
    package_id:              packageId,
    recommendation,
    rationale,
    human_rights_considered: true,
    adjudicated_by:          user.id,
    adjudicated_at:          new Date().toISOString(),
    digital_signature:       signature,
  })

  if (error) return { error: error.message }

  await supabase
    .from('bgc_packages')
    .update({
      status:                 'adjudicated',
      overall_recommendation: recommendation,
      adjudicated_at:         new Date().toISOString(),
      adjudicated_by:         user.id,
    })
    .eq('id', packageId)

  revalidatePath(`/background-checks/packages/${packageId}`)
  return {}
}

// ─── ISSUE ADVERSE ACTION PRE-NOTICE ─────────────────────────────────────────

export async function issueAdverseActionPreNotice(packageId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const { data: pkg } = await supabase
    .from('bgc_packages')
    .select('candidate_first_name, candidate_last_name, candidate_email, position_title')
    .eq('id', packageId)
    .single()

  if (!pkg) return { error: 'Package not found' }

  const { data: org } = await supabase
    .from('organisations')
    .select('name')
    .eq('id', orgId)
    .single()

  const now = new Date()
  const disputeWindowClosesAt = getDisputeWindowCloseDate(now, 5)

  const { error } = await supabase.from('bgc_adverse_action_notices').insert({
    organisation_id:          orgId,
    package_id:               packageId,
    notice_type:              'pre',
    sent_to_email:            pkg.candidate_email,
    dispute_window_closes_at: disputeWindowClosesAt.toISOString(),
    sent_at:                  now.toISOString(),
    created_by:               (await supabase.auth.getUser()).data.user?.id,
  })

  if (error) return { error: error.message }

  await sendAdverseActionPreNotice({
    to:               pkg.candidate_email,
    candidateName:    `${pkg.candidate_first_name} ${pkg.candidate_last_name}`,
    organisationName: org?.name ?? 'Your Employer',
    positionTitle:    pkg.position_title ?? 'the role',
    disputeWindowDays: 5,
    reportDownloadLink: `${APP_URL}/background-checks/packages/${packageId}/report`,
  })

  revalidatePath(`/background-checks/packages/${packageId}`)
  return {}
}

// ─── ISSUE ADVERSE ACTION FINAL NOTICE ───────────────────────────────────────

export async function issueAdverseActionFinalNotice(packageId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const { data: pkg } = await supabase
    .from('bgc_packages')
    .select('candidate_first_name, candidate_last_name, candidate_email, position_title')
    .eq('id', packageId)
    .single()

  if (!pkg) return { error: 'Package not found' }

  const { data: org } = await supabase.from('organisations').select('name').eq('id', orgId).single()

  await supabase.from('bgc_adverse_action_notices').insert({
    organisation_id: orgId,
    package_id:      packageId,
    notice_type:     'final',
    sent_to_email:   pkg.candidate_email,
    sent_at:         new Date().toISOString(),
    final_decision_at: new Date().toISOString(),
    created_by:      (await supabase.auth.getUser()).data.user?.id,
  })

  await sendAdverseActionFinalNotice({
    to:               pkg.candidate_email,
    candidateName:    `${pkg.candidate_first_name} ${pkg.candidate_last_name}`,
    organisationName: org?.name ?? 'Your Employer',
    positionTitle:    pkg.position_title ?? 'the role',
  })

  revalidatePath(`/background-checks/packages/${packageId}`)
  return {}
}

// ─── RESEND CONSENT EMAIL ─────────────────────────────────────────────────────

export async function resendConsentEmail(packageId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const { data: pkg } = await supabase
    .from('bgc_packages')
    .select('candidate_first_name, candidate_last_name, candidate_email, position_title, status')
    .eq('id', packageId)
    .single()

  if (!pkg) return { error: 'Package not found' }
  if (pkg.status === 'consent_given') return { error: 'Consent has already been given' }

  const { data: org } = await supabase.from('organisations').select('name').eq('id', orgId).single()

  const token = await generateConsentToken(packageId, 72)
  const consentLink = `${APP_URL}/bgc-consent/${token}`

  await supabase
    .from('bgc_packages')
    .update({ consent_email_sent_at: new Date().toISOString() })
    .eq('id', packageId)

  await sendConsentEmail({
    to:              pkg.candidate_email,
    candidateName:   `${pkg.candidate_first_name} ${pkg.candidate_last_name}`,
    organisationName: org?.name ?? 'Your Employer',
    positionTitle:   pkg.position_title ?? 'the role',
    consentLink,
    expiresInHours:  72,
  })

  revalidatePath(`/background-checks/packages/${packageId}`)
  return {}
}

// ─── SEND REFERENCE REQUESTS ──────────────────────────────────────────────────

export async function sendReferenceRequests(packageId: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: pkg } = await supabase
    .from('bgc_packages')
    .select('candidate_first_name, candidate_last_name, position_title')
    .eq('id', packageId)
    .single()
  if (!pkg) return { error: 'Package not found' }

  const { data: org } = await supabase.from('organisations').select('name').eq('id', orgId).single()

  const { data: template } = await supabase
    .from('bgc_reference_templates')
    .select('id')
    .is('organisation_id', null)
    .eq('is_active', true)
    .limit(1)
    .single()

  // Parse referee list from form (referee_name_0, referee_email_0, ...)
  const referees: Array<{ name: string; title: string; company: string; email: string; phone: string; relationship: string }> = []
  let i = 0
  while (formData.get(`referee_name_${i}`)) {
    referees.push({
      name:         formData.get(`referee_name_${i}`) as string,
      title:        formData.get(`referee_title_${i}`) as string ?? '',
      company:      formData.get(`referee_company_${i}`) as string ?? '',
      email:        formData.get(`referee_email_${i}`) as string,
      phone:        formData.get(`referee_phone_${i}`) as string ?? '',
      relationship: formData.get(`referee_relationship_${i}`) as string ?? '',
    })
    i++
  }

  if (referees.length === 0) return { error: 'At least one referee is required' }

  for (const ref of referees) {
    const { data: request, error: reqErr } = await supabase
      .from('bgc_reference_requests')
      .insert({
        organisation_id: orgId,
        package_id:      packageId,
        template_id:     template?.id ?? null,
        referee_name:    ref.name,
        referee_title:   ref.title,
        referee_company: ref.company,
        referee_email:   ref.email,
        referee_phone:   ref.phone,
        relationship:    ref.relationship,
        status:          'pending',
        created_by:      user.id,
      })
      .select('id')
      .single()

    if (reqErr || !request) continue

    const token = await generateReferenceToken(request.id, 14)
    const questionnaireLink = `${APP_URL}/bgc-reference/${token}`

    await sendReferenceRequest({
      to:              ref.email,
      refereeName:     ref.name,
      candidateName:   `${pkg.candidate_first_name} ${pkg.candidate_last_name}`,
      organisationName: org?.name ?? 'Your Employer',
      positionTitle:   pkg.position_title ?? 'the role',
      questionnaireLink,
      expiresInDays:   14,
    })
  }

  revalidatePath(`/background-checks/packages/${packageId}`)
  return {}
}

// ─── WORKER LICENCES ──────────────────────────────────────────────────────────

export async function addWorkerLicence(workerId: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const licenceType = (formData.get('licence_type') as string)?.trim()
  if (!licenceType) return { error: 'Licence type is required' }

  const { error } = await supabase.from('worker_licences').insert({
    organisation_id:  orgId,
    worker_id:        workerId,
    licence_type:     licenceType,
    licence_number:   formData.get('licence_number') as string | null,
    issuing_body:     formData.get('issuing_body') as string | null,
    issuing_province: formData.get('issuing_province') as string | null,
    issue_date:       formData.get('issue_date') as string | null,
    expiry_date:      formData.get('expiry_date') as string | null,
    notes:            formData.get('notes') as string | null,
    status:           'active',
    created_by:       user.id,
  })

  if (error) return { error: error.message }
  revalidatePath(`/workers/${workerId}`)
  revalidatePath('/background-checks/licences')
  return {}
}

export async function updateWorkerLicenceStatus(
  licenceId: string,
  status: 'active' | 'expired' | 'suspended' | 'cancelled'
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const { error } = await supabase
    .from('worker_licences')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', licenceId)
    .eq('organisation_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/background-checks/licences')
  return {}
}
