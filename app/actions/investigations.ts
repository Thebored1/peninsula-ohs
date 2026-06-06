'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createInvestigation(incidentId: string): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const { data: existing } = await supabase
    .from('investigations')
    .select('id')
    .eq('incident_id', incidentId)
    .maybeSingle()

  if (existing) {
    redirect(`/investigations/${existing.id}`)
  }

  const { data: inv, error } = await supabase
    .from('investigations')
    .insert({
      organisation_id: profile.organisation_id,
      incident_id: incidentId,
      investigator_id: user.id,
      status: 'open',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/incidents/${incidentId}`)
  revalidatePath('/investigations')
  redirect(`/investigations/${inv.id}`)
}

export async function updateInvestigation(id: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const status = formData.get('status') as string
  const investigationSummary = (formData.get('investigation_summary') as string | null)?.trim() || null
  const findings = (formData.get('findings') as string | null)?.trim() || null
  const rootCause = (formData.get('root_cause') as string | null)?.trim() || null
  const dueDateRaw = (formData.get('due_date') as string | null) || null

  const updates: Record<string, unknown> = {
    status,
    investigation_summary: investigationSummary,
    findings,
    root_cause: rootCause,
    due_date: dueDateRaw,
    updated_at: new Date().toISOString(),
  }

  if (status === 'completed' || status === 'closed') {
    updates.completed_at = new Date().toISOString()
    updates.completed_by = user.id
  }

  const { error } = await supabase
    .from('investigations')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/investigations/${id}`)
  revalidatePath('/investigations')
  redirect(`/investigations/${id}`)
}
