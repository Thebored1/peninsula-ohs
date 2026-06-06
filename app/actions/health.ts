'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createHealthCheckRecord(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const subjectUserId = formData.get('user_id') as string
  const surveillanceTypeId = formData.get('surveillance_type_id') as string
  const result = formData.get('result') as string
  const checkDate = formData.get('check_date') as string

  if (!subjectUserId) return { error: 'Worker is required' }
  if (!surveillanceTypeId) return { error: 'Surveillance type is required' }
  if (!result) return { error: 'Result is required' }
  if (!checkDate) return { error: 'Check date is required' }

  const providerName = formData.get('provider_name') as string | null
  const providerReference = formData.get('provider_reference') as string | null
  const nextCheckDue = formData.get('next_check_due') as string | null
  const resultNotes = formData.get('result_notes') as string | null
  const restrictionsIssued = formData.get('restrictions_issued') === 'true'
  const isBaseline = formData.get('is_baseline') === 'true'

  const { data: record, error } = await supabase
    .from('health_check_records')
    .insert({
      organisation_id: profile.organisation_id,
      user_id: subjectUserId,
      surveillance_type_id: surveillanceTypeId,
      result,
      check_date: checkDate,
      provider_name: providerName?.trim() || null,
      provider_reference: providerReference?.trim() || null,
      next_check_due: nextCheckDue || null,
      result_notes: resultNotes?.trim() || null,
      restrictions_issued: restrictionsIssued,
      is_baseline: isBaseline,
      recorded_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/health')
  redirect('/health')
}
