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
