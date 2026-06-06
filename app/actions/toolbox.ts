'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getOrgId } from '@/lib/supabase/get-org-id'

// ─── Templates ───────────────────────────────────────────────────────────────

export async function createTemplate(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const categoryId = (formData.get('category_id') as string) || null
  const description = (formData.get('description') as string)?.trim() || null
  const estimatedMinutesRaw = formData.get('estimated_duration_minutes') as string
  const estimatedMinutes = estimatedMinutesRaw ? parseInt(estimatedMinutesRaw, 10) : 10

  const { data: template, error } = await supabase
    .from('toolbox_talk_templates')
    .insert({
      organisation_id: orgId,
      title,
      category_id: categoryId || null,
      description,
      estimated_duration_minutes: estimatedMinutes,
      is_active: true,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Parse and insert discussion points
  const pointsJson = formData.get('points_json') as string | null
  if (pointsJson) {
    try {
      const points = JSON.parse(pointsJson) as Array<{
        point_text: string
        point_type?: string
      }>
      const validPoints = points
        .map((p, idx) => ({ ...p, point_text: p.point_text?.trim() }))
        .filter(p => p.point_text)
        .map((p, idx) => ({
          template_id: template.id,
          point_number: idx + 1,
          point_text: p.point_text,
          point_type: p.point_type ?? 'key_point',
        }))
      if (validPoints.length > 0) {
        await supabase.from('toolbox_talk_template_points').insert(validPoints)
      }
    } catch {
      // non-fatal — template was created, points parsing failed
    }
  }

  revalidatePath('/toolbox/templates')
  redirect(`/toolbox/templates/${template.id}`)
}

export async function updateTemplate(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const id = (formData.get('id') as string)?.trim()
  if (!id) return { error: 'Template ID is required' }

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const categoryId = (formData.get('category_id') as string) || null
  const description = (formData.get('description') as string)?.trim() || null
  const estimatedMinutesRaw = formData.get('estimated_duration_minutes') as string
  const estimatedMinutes = estimatedMinutesRaw ? parseInt(estimatedMinutesRaw, 10) : 10
  const isActive = formData.get('is_active') !== 'false'

  const { error } = await supabase
    .from('toolbox_talk_templates')
    .update({
      title,
      category_id: categoryId || null,
      description,
      estimated_duration_minutes: estimatedMinutes,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  // Replace points if provided
  const pointsJson = formData.get('points_json') as string | null
  if (pointsJson) {
    try {
      const points = JSON.parse(pointsJson) as Array<{
        point_text: string
        point_type?: string
      }>
      // Delete existing points and re-insert
      await supabase.from('toolbox_talk_template_points').delete().eq('template_id', id)

      const validPoints = points
        .map(p => ({ ...p, point_text: p.point_text?.trim() }))
        .filter(p => p.point_text)
        .map((p, idx) => ({
          template_id: id,
          point_number: idx + 1,
          point_text: p.point_text,
          point_type: p.point_type ?? 'key_point',
        }))
      if (validPoints.length > 0) {
        await supabase.from('toolbox_talk_template_points').insert(validPoints)
      }
    } catch {
      // non-fatal
    }
  }

  revalidatePath('/toolbox/templates')
  revalidatePath(`/toolbox/templates/${id}`)
  redirect(`/toolbox/templates/${id}`)
}

// ─── Deliveries ───────────────────────────────────────────────────────────────

export async function deliverTalk(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const templateId = (formData.get('template_id') as string) || null
  const siteId = (formData.get('site_id') as string) || null
  const location = (formData.get('location') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null
  const deliveredAt = (formData.get('delivered_at') as string) || new Date().toISOString()

  const { data: delivery, error } = await supabase
    .from('toolbox_talk_deliveries')
    .insert({
      organisation_id: orgId,
      template_id: templateId || null,
      title,
      site_id: siteId || null,
      delivered_by: user.id,
      delivered_at: deliveredAt,
      location,
      notes,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Parse and insert attendees
  const attendeesJson = formData.get('attendees_json') as string | null
  if (attendeesJson) {
    try {
      const attendees = JSON.parse(attendeesJson) as Array<{
        name: string
        worker_id?: string
      }>
      const validAttendees = attendees
        .map(a => ({ ...a, name: a.name?.trim() }))
        .filter(a => a.name)
        .map(a => ({
          delivery_id: delivery.id,
          attendee_name: a.name,
          worker_id: a.worker_id || null,
        }))
      if (validAttendees.length > 0) {
        await supabase.from('toolbox_talk_attendees').insert(validAttendees)
      }
    } catch {
      // non-fatal
    }
  }

  revalidatePath('/toolbox')
  redirect(`/toolbox/${delivery.id}`)
}

// ─── Schedules ────────────────────────────────────────────────────────────────

export async function scheduleTalk(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const templateId = (formData.get('template_id') as string)?.trim()
  if (!templateId) return { error: 'Template is required' }

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const scheduledDate = (formData.get('scheduled_date') as string)?.trim()
  if (!scheduledDate) return { error: 'Scheduled date is required' }

  const siteId = (formData.get('site_id') as string) || null
  const assignedTo = (formData.get('assigned_to') as string) || null

  const { error } = await supabase
    .from('toolbox_talk_schedules')
    .insert({
      organisation_id: orgId,
      template_id: templateId,
      title,
      scheduled_date: scheduledDate,
      site_id: siteId || null,
      assigned_to: assignedTo || null,
      status: 'pending',
      created_by: user.id,
    })

  if (error) return { error: error.message }

  revalidatePath('/toolbox/schedule')
  redirect('/toolbox/schedule')
}

// ─── Attendee acknowledgement ─────────────────────────────────────────────────

export async function markAttendeePresent(attendeeId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('toolbox_talk_attendees')
    .update({
      acknowledged_at: new Date().toISOString(),
      signature_obtained: true,
    })
    .eq('id', attendeeId)

  if (error) return { error: error.message }

  revalidatePath('/toolbox')
  return {}
}
