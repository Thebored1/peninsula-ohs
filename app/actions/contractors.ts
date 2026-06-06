'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ── 1. Create a contractor company ──────────────────────────────────────────
export async function createContractorCompany(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const companyName = (formData.get('company_name') as string)?.trim()
  if (!companyName) return { error: 'Company name is required' }

  const { data: company, error } = await supabase
    .from('contractor_companies')
    .insert({
      organisation_id: orgId,
      company_name: companyName,
      abn: (formData.get('abn') as string)?.trim() || null,
      primary_contact_name: (formData.get('primary_contact_name') as string)?.trim() || null,
      primary_contact_email: (formData.get('primary_contact_email') as string)?.trim() || null,
      primary_contact_phone: (formData.get('primary_contact_phone') as string)?.trim() || null,
      address: (formData.get('address') as string)?.trim() || null,
      notes: (formData.get('notes') as string)?.trim() || null,
      prequalification_status: 'pending',
      is_active: true,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/contractors')
  redirect(`/contractors/${company.id}`)
}

// ── 2. Update contractor prequalification status ─────────────────────────────
export async function updateContractorStatus(
  id: string,
  status: string,
  expiryDate?: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('contractor_companies')
    .update({
      prequalification_status: status,
      prequalification_expiry: expiryDate || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/contractors/${id}`)
  revalidatePath('/contractors')
  return {}
}

// ── 3. Add a worker to a contractor company ───────────────────────────────────
export async function addContractorWorker(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const contractorId = (formData.get('contractor_id') as string)?.trim()
  const firstName = (formData.get('first_name') as string)?.trim()
  const lastName = (formData.get('last_name') as string)?.trim()

  if (!contractorId) return { error: 'Contractor is required' }
  if (!firstName) return { error: 'First name is required' }
  if (!lastName) return { error: 'Last name is required' }

  const { error } = await supabase
    .from('contractor_workers')
    .insert({
      contractor_id: contractorId,
      organisation_id: orgId,
      first_name: firstName,
      last_name: lastName,
      email: (formData.get('email') as string)?.trim() || null,
      phone: (formData.get('phone') as string)?.trim() || null,
      role: (formData.get('role') as string)?.trim() || null,
      is_active: true,
      induction_status: 'not_inducted',
      created_by: user.id,
    })

  if (error) return { error: error.message }

  revalidatePath(`/contractors/${contractorId}`)
  redirect(`/contractors/${contractorId}`)
}

// ── 4. Sign in a contractor worker ────────────────────────────────────────────
export async function signInContractor(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const contractorWorkerId = (formData.get('contractor_worker_id') as string)?.trim()
  if (!contractorWorkerId) return { error: 'Contractor worker is required' }

  const siteId = (formData.get('site_id') as string)?.trim() || null
  const purpose = (formData.get('purpose') as string)?.trim() || null

  const { error } = await supabase
    .from('contractor_site_access_log')
    .insert({
      organisation_id: orgId,
      contractor_worker_id: contractorWorkerId,
      site_id: siteId,
      purpose,
      sign_in_at: new Date().toISOString(),
      signed_in_by: user.id,
    })

  if (error) return { error: error.message }

  revalidatePath('/contractors/access-log')
  return {}
}

// ── 5. Sign out a contractor worker ──────────────────────────────────────────
export async function signOutContractor(
  accessLogId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('contractor_site_access_log')
    .update({ sign_out_at: new Date().toISOString() })
    .eq('id', accessLogId)

  if (error) return { error: error.message }

  revalidatePath('/contractors/access-log')
  return {}
}

// ── 6. Create a prequalification assessment ───────────────────────────────────
export async function createPrequalAssessment(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const contractorId = (formData.get('contractor_id') as string)?.trim()
  const decision = (formData.get('decision') as string)?.trim()

  if (!contractorId) return { error: 'Contractor is required' }
  if (!decision) return { error: 'Decision is required' }

  const expiryDate = (formData.get('expiry_date') as string)?.trim() || null
  const decisionNotes = (formData.get('decision_notes') as string)?.trim() || null
  const conditions = (formData.get('conditions') as string)?.trim() || null

  // Insert the assessment
  const { error: assessError } = await supabase
    .from('prequalification_assessments')
    .insert({
      contractor_id: contractorId,
      organisation_id: orgId,
      assessed_by: user.id,
      assessment_date: new Date().toISOString().split('T')[0],
      decision,
      decision_notes: decisionNotes,
      conditions,
      expiry_date: expiryDate,
    })

  if (assessError) return { error: assessError.message }

  // Map decision to prequalification_status
  const statusMap: Record<string, string> = {
    approved: 'approved',
    rejected: 'suspended',
    conditionally_approved: 'conditionally_approved',
  }
  const newStatus = statusMap[decision] ?? 'pending'

  const { error: updateError } = await supabase
    .from('contractor_companies')
    .update({
      prequalification_status: newStatus,
      prequalification_expiry: expiryDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contractorId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/contractors/${contractorId}`)
  redirect(`/contractors/${contractorId}`)
}
