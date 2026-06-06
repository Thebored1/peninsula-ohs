'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createEmergencyContact(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found' }

  const workerId = (formData.get('worker_id') as string)?.trim()
  const contactName = (formData.get('contact_name') as string)?.trim()
  const relationship = (formData.get('relationship') as string)?.trim()
  const phonePrimary = (formData.get('phone_primary') as string)?.trim()

  if (!workerId) return { error: 'Worker ID is required' }
  if (!contactName) return { error: 'Contact name is required' }
  if (!relationship) return { error: 'Relationship is required' }
  if (!phonePrimary) return { error: 'Primary phone is required' }

  const { error } = await supabase.from('emergency_contacts').insert({
    organisation_id: profile.organisation_id,
    worker_id: workerId,
    contact_name: contactName,
    relationship,
    phone_primary: phonePrimary,
    phone_secondary: (formData.get('phone_secondary') as string)?.trim() || null,
    email: (formData.get('email') as string)?.trim() || null,
    is_primary: formData.get('is_primary') === 'true',
    notes: (formData.get('notes') as string)?.trim() || null,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath(`/workers/${workerId}/emergency-contacts`)
  redirect(`/workers/${workerId}/emergency-contacts`)
}

export async function updateEmergencyContact(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const id = (formData.get('id') as string)?.trim()
  const workerId = (formData.get('worker_id') as string)?.trim()
  const contactName = (formData.get('contact_name') as string)?.trim()
  const relationship = (formData.get('relationship') as string)?.trim()
  const phonePrimary = (formData.get('phone_primary') as string)?.trim()

  if (!id) return { error: 'Contact ID is required' }
  if (!workerId) return { error: 'Worker ID is required' }
  if (!contactName) return { error: 'Contact name is required' }
  if (!relationship) return { error: 'Relationship is required' }
  if (!phonePrimary) return { error: 'Primary phone is required' }

  const { error } = await supabase
    .from('emergency_contacts')
    .update({
      contact_name: contactName,
      relationship,
      phone_primary: phonePrimary,
      phone_secondary: (formData.get('phone_secondary') as string)?.trim() || null,
      email: (formData.get('email') as string)?.trim() || null,
      is_primary: formData.get('is_primary') === 'true',
      notes: (formData.get('notes') as string)?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/workers/${workerId}/emergency-contacts`)
  redirect(`/workers/${workerId}/emergency-contacts`)
}

export async function deleteEmergencyContact(id: string, workerId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('emergency_contacts')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/workers/${workerId}/emergency-contacts`)
  return {}
}
