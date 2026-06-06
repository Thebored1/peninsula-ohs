'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateOrganisation(formData: FormData): Promise<{ error?: string }> {
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
  if (!name?.trim()) return { error: 'Organisation name is required' }

  const { error } = await supabase
    .from('organisations')
    .update({
      name: name.trim(),
      industry: (formData.get('industry') as string)?.trim() || null,
      timezone: (formData.get('timezone') as string) || 'UTC',
      contact_email: (formData.get('contact_email') as string)?.trim() || null,
      contact_phone: (formData.get('contact_phone') as string)?.trim() || null,
      province: (formData.get('province') as string)?.trim() || null,
      country_code: (formData.get('country_code') as string)?.trim() || 'CA',
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.organisation_id)

  if (error) return { error: error.message }

  revalidatePath('/settings/organisation')
  return {}
}

export async function createSite(formData: FormData): Promise<{ error?: string }> {
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
  if (!name?.trim()) return { error: 'Site name is required' }

  const { error } = await supabase
    .from('sites')
    .insert({
      organisation_id: profile.organisation_id,
      name: name.trim(),
      code: (formData.get('code') as string)?.trim() || null,
      site_type: (formData.get('site_type') as string) || null,
      is_active: true,
      created_by: user.id,
    })

  if (error) return { error: error.message }

  revalidatePath('/settings/sites')
  return {}
}

export async function inviteUser(formData: FormData): Promise<{ error?: string }> {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase() ?? ''
  const role_id = (formData.get('role_id') as string | null)?.trim() || null

  if (!email) return { error: 'Email is required.' }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRe.test(email)) return { error: 'Please enter a valid email address.' }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  let organisationId: string | null = null
  let invitedById: string | null = null

  if (!userError && user) {
    invitedById = user.id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organisation_id')
      .eq('id', user.id)
      .single()
    if (profileError || !profile) return { error: 'User profile not found.' }
    organisationId = profile.organisation_id
  } else {
    const { getOrgId } = await import('@/lib/supabase/get-org-id')
    organisationId = await getOrgId()
    if (!organisationId) return { error: 'No organisation found.' }
  }

  // Check for an existing pending invitation for this email in this org
  const { data: existing } = await supabase
    .from('user_invitations')
    .select('id')
    .eq('organisation_id', organisationId)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return { error: 'A pending invitation already exists for this email address.' }

  const { error: insertError } = await supabase
    .from('user_invitations')
    .insert({
      organisation_id: organisationId,
      email,
      role_id: role_id ?? undefined,
      invited_by: invitedById ?? undefined,
    })

  if (insertError) return { error: insertError.message }

  revalidatePath('/settings/users')
  return {}
}

export async function cancelInvitation(id: string): Promise<{ error?: string }> {
  if (!id) return { error: 'Invitation ID is required.' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('user_invitations')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/settings/users')
  return {}
}

export async function updateNotificationRule(
  id: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  if (!id) return { error: 'Rule ID is required.' }

  const { getOrgId } = await import('@/lib/supabase/get-org-id')
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Not authenticated.' }

  const supabase = await createClient()

  // Verify the rule belongs to this organisation before updating
  const { data: rule, error: fetchError } = await supabase
    .from('notification_rules')
    .select('id')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .maybeSingle()

  if (fetchError) return { error: fetchError.message }
  if (!rule) return { error: 'Notification rule not found or access denied.' }

  const { error } = await supabase
    .from('notification_rules')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/settings/notifications')
  return {}
}
