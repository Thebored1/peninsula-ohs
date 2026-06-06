'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createFatigue(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Name is required' }

  const description = (formData.get('description') as string)?.trim() || null
  const isActive = formData.get('is_active') !== 'false'

  const { error } = await supabase
    .from('fatigue_rule_sets')
    .insert({
      organisation_id: profile.organisation_id,
      name,
      description,
      is_active: isActive,
      created_by: user.id,
    })

  if (error) return { error: error.message }

  revalidatePath('/fatigue')
  redirect('/fatigue')
}

export async function updateFatigueStatus(
  id: string,
  status: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found' }

  // Map status to is_active boolean for fatigue_rule_sets
  const isActive = status === 'active'

  const { error } = await supabase
    .from('fatigue_rule_sets')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id)

  if (error) return { error: error.message }

  revalidatePath('/fatigue')
  revalidatePath(`/fatigue/${id}`)
  return {}
}

export async function logShift(formData: FormData): Promise<{ error?: string }> {
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
  const shiftStart = (formData.get('shift_start') as string)?.trim()
  const shiftDate = (formData.get('shift_date') as string)?.trim()

  if (!workerId) return { error: 'Worker is required' }
  if (!shiftStart) return { error: 'Shift start time is required' }

  const shiftEnd = (formData.get('shift_end') as string)?.trim() || null
  const siteId = (formData.get('site_id') as string)?.trim() || null
  const shiftType = (formData.get('shift_type') as string)?.trim() || 'standard'
  const notes = (formData.get('notes') as string)?.trim() || null

  // Calculate hours_worked if both start and end are provided
  let hoursWorked: number | null = null
  if (shiftStart && shiftEnd) {
    const startMs = new Date(shiftStart).getTime()
    const endMs = new Date(shiftEnd).getTime()
    if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
      hoursWorked = Math.round(((endMs - startMs) / (1000 * 60 * 60)) * 100) / 100
    }
  }

  const { error } = await supabase
    .from('shift_logs')
    .insert({
      organisation_id: profile.organisation_id,
      worker_id: workerId,
      site_id: siteId,
      shift_date: shiftDate || new Date().toISOString().split('T')[0],
      shift_start: shiftStart,
      shift_end: shiftEnd,
      hours_worked: hoursWorked,
      shift_type: shiftType,
      notes,
      created_by: user.id,
    })

  if (error) return { error: error.message }

  revalidatePath('/fatigue')
  redirect('/fatigue')
}
