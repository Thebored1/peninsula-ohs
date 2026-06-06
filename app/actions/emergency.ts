'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getOrgId } from '@/lib/supabase/get-org-id'

// 1. Create an Emergency Response Plan
export async function createEmergencyPlan(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No org' }

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const emergency_type_id = (formData.get('emergency_type_id') as string) || null
  const site_id = (formData.get('site_id') as string) || null
  const description = (formData.get('description') as string)?.trim() || null
  const version_number = (formData.get('version_number') as string)?.trim() || '1.0'
  const next_review_date = (formData.get('next_review_date') as string) || null

  const { data: plan, error } = await supabase
    .from('emergency_response_plans')
    .insert({
      organisation_id: orgId,
      title,
      emergency_type_id: emergency_type_id || null,
      site_id: site_id || null,
      description,
      version_number,
      next_review_date: next_review_date || null,
      status: 'draft',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/emergency/plans')
  redirect(`/emergency/plans/${plan.id}`)
}

// 2. Update plan status (activate/archive)
export async function updatePlanStatus(id: string, status: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('emergency_response_plans')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/emergency/plans/${id}`)
  revalidatePath('/emergency/plans')
  return {}
}

// 3. Create a Drill
export async function createDrill(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No org' }

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const plan_id = (formData.get('plan_id') as string) || null
  const site_id = (formData.get('site_id') as string) || null
  const drill_type = (formData.get('drill_type') as string) || 'evacuation'
  const scheduled_date = (formData.get('scheduled_date') as string) || null

  const { data: drill, error } = await supabase
    .from('emergency_drills')
    .insert({
      organisation_id: orgId,
      title,
      plan_id: plan_id || null,
      site_id: site_id || null,
      drill_type,
      scheduled_date: scheduled_date || null,
      status: 'scheduled',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/emergency/drills')
  redirect(`/emergency/drills/${drill.id}`)
}

// 4. Complete a Drill
export async function completeDrill(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const id = (formData.get('id') as string)
  if (!id) return { error: 'Drill ID is required' }

  const actual_date = (formData.get('actual_date') as string) || null
  const participants_count = formData.get('participants_count') ? parseInt(formData.get('participants_count') as string, 10) : null
  const duration_minutes = formData.get('duration_minutes') ? parseInt(formData.get('duration_minutes') as string, 10) : null
  const outcomes = (formData.get('outcomes') as string)?.trim() || null
  const findings = (formData.get('findings') as string)?.trim() || null

  const { error } = await supabase
    .from('emergency_drills')
    .update({
      status: 'completed',
      actual_date: actual_date || null,
      participants_count,
      duration_minutes,
      outcomes,
      findings,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/emergency/drills/${id}`)
  revalidatePath('/emergency/drills')
  return {}
}

// 5. Add a Warden
export async function addWarden(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No org' }

  const worker_id = (formData.get('worker_id') as string)
  if (!worker_id) return { error: 'Worker is required' }

  const warden_type = (formData.get('warden_type') as string)
  if (!warden_type) return { error: 'Warden type is required' }

  const site_id = (formData.get('site_id') as string) || null
  const area = (formData.get('area') as string)?.trim() || null

  const { error } = await supabase
    .from('emergency_wardens')
    .insert({
      organisation_id: orgId,
      worker_id,
      warden_type,
      site_id: site_id || null,
      area,
      is_active: true,
    })

  if (error) return { error: error.message }

  revalidatePath('/emergency/wardens')
  redirect('/emergency/wardens')
}

// 6. Add a Muster Point
export async function addMusterPoint(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No org' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Name is required' }

  const site_id = (formData.get('site_id') as string)
  if (!site_id) return { error: 'Site is required' }

  const location_description = (formData.get('location_description') as string)?.trim() || null
  const capacity = formData.get('capacity') ? parseInt(formData.get('capacity') as string, 10) : null
  const is_primary = formData.get('is_primary') === 'true'

  const { error } = await supabase
    .from('muster_points')
    .insert({
      organisation_id: orgId,
      site_id,
      name,
      location_description,
      capacity,
      is_primary,
    })

  if (error) return { error: error.message }

  revalidatePath('/emergency/muster-points')
  redirect('/emergency/muster-points')
}

// 7. Activate Emergency
export async function activateEmergency(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No org' }

  const emergency_type = (formData.get('emergency_type') as string)?.trim()
  if (!emergency_type) return { error: 'Emergency type is required' }

  const site_id = (formData.get('site_id') as string) || null
  const description = (formData.get('description') as string)?.trim() || null
  const plan_id = (formData.get('plan_id') as string) || null

  const { data: activation, error } = await supabase
    .from('emergency_activations')
    .insert({
      organisation_id: orgId,
      emergency_type,
      site_id: site_id || null,
      description,
      plan_id: plan_id || null,
      activated_at: new Date().toISOString(),
      activated_by: user.id,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/emergency/activations')
  redirect(`/emergency/activations/${activation.id}`)
}

// 8. Set All Clear
export async function setAllClear(activationId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('emergency_activations')
    .update({
      all_clear_at: new Date().toISOString(),
      status: 'all_clear',
    })
    .eq('id', activationId)

  if (error) return { error: error.message }

  revalidatePath(`/emergency/activations/${activationId}`)
  revalidatePath('/emergency/activations')
  return {}
}
