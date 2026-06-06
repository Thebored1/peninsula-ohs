'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createSchedule(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const templateId = formData.get('template_id') as string
  const name = formData.get('name') as string
  const recurrenceType = (formData.get('recurrence_type') as string) || 'once'
  const nextDueAt = formData.get('next_due_at') as string | null
  const advanceNoticeDays = parseInt((formData.get('advance_notice_days') as string) || '1', 10)
  const overdueAfterHours = parseInt((formData.get('overdue_after_hours') as string) || '24', 10)
  const assignedTo = formData.get('assigned_to') as string | null

  if (!templateId) return { error: 'Template is required' }
  if (!name?.trim()) return { error: 'Schedule name is required' }

  const { data: schedule, error } = await supabase
    .from('inspection_schedules')
    .insert({
      organisation_id: profile.organisation_id,
      template_id: templateId,
      name: name.trim(),
      recurrence_type: recurrenceType,
      next_due_at: nextDueAt || null,
      advance_notice_days: advanceNoticeDays,
      overdue_after_hours: overdueAfterHours,
      assigned_to: assignedTo || null,
      is_active: true,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/inspections/schedules')
  redirect(`/inspections/schedules/${schedule.id}`)
}

export async function toggleScheduleActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('inspection_schedules')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/inspections/schedules/${id}`)
  revalidatePath('/inspections/schedules')
  return {}
}

export async function deleteSchedule(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('inspection_schedules')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/inspections/schedules')
  redirect('/inspections/schedules')
}
