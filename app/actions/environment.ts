'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createMonitoringRecord(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const parameterTypeId = formData.get('parameter_type_id') as string
  const measuredValueRaw = formData.get('measured_value') as string
  const measuredAt = formData.get('measured_at') as string

  if (!parameterTypeId) return { error: 'Parameter type is required' }
  if (!measuredValueRaw) return { error: 'Measured value is required' }
  if (!measuredAt) return { error: 'Date/time is required' }

  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('organisation_id', profile.organisation_id)
    .limit(1)
    .maybeSingle()

  const stationId = formData.get('station_id') as string | null
  const unitId = formData.get('unit_id') as string | null
  const measurementMethod = formData.get('measurement_method') as string | null
  const weatherConditions = formData.get('weather_conditions') as string | null
  const notes = formData.get('notes') as string | null

  const { error } = await supabase
    .from('env_monitoring_records')
    .insert({
      organisation_id: profile.organisation_id,
      site_id: site?.id ?? null,
      station_id: stationId || null,
      parameter_type_id: parameterTypeId,
      unit_id: unitId || null,
      measured_value: parseFloat(measuredValueRaw),
      measured_at: measuredAt,
      measurement_method: measurementMethod || null,
      weather_conditions: weatherConditions?.trim() || null,
      notes: notes?.trim() || null,
      recorded_by: user.id,
    })

  if (error) return { error: error.message }

  revalidatePath('/environment')
  redirect('/environment')
}

export async function createEnvReportSubmission(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const requirementId = formData.get('requirement_id') as string | null
  const title = formData.get('title') as string
  const submittedDate = formData.get('submitted_date') as string
  const reportingPeriodStart = formData.get('reporting_period_start') as string | null
  const reportingPeriodEnd = formData.get('reporting_period_end') as string | null
  const regulatoryBody = formData.get('regulatory_body') as string | null
  const submissionMethod = formData.get('submission_method') as string | null
  const referenceNumber = formData.get('reference_number') as string | null
  const notes = formData.get('notes') as string | null

  if (!title?.trim()) return { error: 'Title is required' }
  if (!submittedDate) return { error: 'Submitted date is required' }

  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('organisation_id', profile.organisation_id)
    .limit(1)
    .maybeSingle()

  const { error } = await supabase
    .from('env_report_submissions')
    .insert({
      organisation_id: profile.organisation_id,
      site_id: site?.id ?? null,
      requirement_id: requirementId || null,
      title: title.trim(),
      submitted_date: submittedDate,
      reporting_period_start: reportingPeriodStart || null,
      reporting_period_end: reportingPeriodEnd || null,
      regulatory_body: regulatoryBody?.trim() || null,
      submission_method: submissionMethod?.trim() || null,
      reference_number: referenceNumber?.trim() || null,
      notes: notes?.trim() || null,
      submitted_by: user.id,
    })

  if (error) return { error: error.message }

  revalidatePath('/env-reporting')
  redirect('/env-reporting')
}
