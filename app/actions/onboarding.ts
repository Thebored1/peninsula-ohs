'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function onboardingCreateSite(data: {
  name: string
  siteType: string
  city?: string
  state?: string
}): Promise<{ error?: string; siteId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found' }

  const address = (data.city || data.state)
    ? { city: data.city || null, state: data.state || null }
    : null

  const { data: site, error } = await supabase
    .from('sites')
    .insert({
      organisation_id: profile.organisation_id,
      name: data.name.trim(),
      site_type: data.siteType || null,
      address: address ? JSON.stringify(address) : null,
      is_active: true,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/onboarding')
  return { siteId: site.id }
}

export async function onboardingCreateDepartment(data: {
  name: string
  description?: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('departments')
    .insert({
      organisation_id: profile.organisation_id,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      created_by: user.id,
    })

  if (error) return { error: error.message }
  return {}
}

export async function onboardingInviteUsers(
  invites: { email: string; roleId: string }[]
): Promise<{ sent: number; errors: string[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { sent: 0, errors: ['Not authenticated'] }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { sent: 0, errors: ['Profile not found'] }

  const errors: string[] = []
  let sent = 0

  for (const invite of invites) {
    const email = invite.email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`${email}: invalid email`)
      continue
    }

    const { data: existing } = await supabase
      .from('user_invitations')
      .select('id')
      .eq('organisation_id', profile.organisation_id)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      errors.push(`${email}: invitation already pending`)
      continue
    }

    const { error } = await supabase
      .from('user_invitations')
      .insert({
        organisation_id: profile.organisation_id,
        email,
        role_id: invite.roleId || null,
        invited_by: user.id,
      })

    if (error) errors.push(`${email}: ${error.message}`)
    else sent++
  }

  return { sent, errors }
}

const STARTER_PACKS: Record<string, { templates: string[]; riskCategories: string[] }> = {
  'Construction': {
    templates: ['Scaffolding Inspection', 'Plant & Equipment Pre-Start', 'Site Electrical Inspection'],
    riskCategories: ['Working at Heights', 'Excavation & Trenching', 'Plant & Machinery', 'Manual Handling', 'Electrical Hazards'],
  },
  'Mining & Resources': {
    templates: ['Confined Space Entry Checklist', 'LOTO Verification', 'Hazardous Atmosphere Check'],
    riskCategories: ['Confined Spaces', 'Explosives & Blasting', 'Ground Instability', 'Toxic Atmospheres', 'Isolation Failures'],
  },
  'Healthcare': {
    templates: ['Infection Control Round', 'Manual Handling Assessment', 'Needle Stick Prevention Check'],
    riskCategories: ['Infection Control', 'Manual Handling', 'Violence & Aggression', 'Chemical Exposure', 'Needlestick Injuries'],
  },
  'Manufacturing': {
    templates: ['Machine Guard Inspection', 'Chemical Storage Check', 'Forklift Pre-Start'],
    riskCategories: ['Machine Guarding', 'Chemical Handling', 'Forklift Operations', 'Noise & Vibration', 'Ergonomics'],
  },
  '_default': {
    templates: ['General Workplace Inspection', 'JSA Template — General Tasks'],
    riskCategories: ['Manual Handling', 'Slips, Trips & Falls', 'Electrical Hazards', 'Fire Hazards', 'Emergency Preparedness'],
  },
}

export async function onboardingLoadStarterPack(): Promise<{ error?: string; loaded: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', loaded: 0 }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found', loaded: 0 }

  const { data: org } = await supabase
    .from('organisations')
    .select('industry')
    .eq('id', profile.organisation_id)
    .single()

  const pack = STARTER_PACKS[org?.industry ?? ''] ?? STARTER_PACKS['_default']

  // Get the first inspection type for the templates
  const { data: inspType } = await supabase
    .from('inspection_types')
    .select('id')
    .limit(1)
    .maybeSingle()

  let loaded = 0

  // Seed inspection templates
  for (const templateName of pack.templates) {
    const { error } = await supabase
      .from('inspection_templates')
      .insert({
        organisation_id: profile.organisation_id,
        name: templateName,
        inspection_type_id: inspType?.id ?? null,
        is_active: true,
        created_by: user.id,
      })
    if (!error) loaded++
  }

  // Seed risk categories (stored in organisations' custom risk categories if table exists)
  // Uses supabase for RLS — risk_categories may be a global lookup or org-scoped
  const { data: existingCats } = await supabase
    .from('risk_categories')
    .select('id')
    .limit(1)

  // Only seed org-scoped risk categories if the table has organisation_id
  // Check via supabaseAdmin to inspect first row
  const { data: sampleCat } = await supabaseAdmin
    .from('risk_categories')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (sampleCat && 'organisation_id' in sampleCat) {
    for (const catName of pack.riskCategories) {
      const { error } = await supabase
        .from('risk_categories')
        .insert({
          organisation_id: profile.organisation_id,
          name: catName,
          description: null,
          created_by: user.id,
        })
      if (!error) loaded++
    }
  }

  return { loaded }
}

export async function onboardingComplete(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found' }

  await supabase
    .from('organisations')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', profile.organisation_id)

  revalidatePath('/dashboard')
  return {}
}
