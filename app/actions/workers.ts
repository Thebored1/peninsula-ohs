'use server'

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function adminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function createWorkerProfile(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const email = (formData.get('email') as string | null)?.trim()
  const firstName = (formData.get('first_name') as string | null)?.trim()
  const lastName = (formData.get('last_name') as string | null)?.trim()

  if (!email) return { error: 'Email is required' }
  if (!firstName) return { error: 'First name is required' }
  if (!lastName) return { error: 'Last name is required' }

  const admin = adminClient()

  // Create an auth user (no email sent, no password set — worker will use password reset to activate)
  const { data: userData, error: authError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  })

  if (authError) return { error: authError.message }

  const workerId = userData.user.id
  const hireDateRaw = (formData.get('hire_date') as string | null) || null

  const { error: profileError } = await admin.from('user_profiles').insert({
    id: workerId,
    organisation_id: profile.organisation_id,
    first_name: firstName,
    last_name: lastName,
    email,
    phone: (formData.get('phone') as string | null)?.trim() || null,
    mobile: (formData.get('mobile') as string | null)?.trim() || null,
    job_title: (formData.get('job_title') as string | null)?.trim() || null,
    employment_type: (formData.get('employment_type') as string | null) || null,
    employee_id: (formData.get('employee_id') as string | null)?.trim() || null,
    hire_date: hireDateRaw || null,
    primary_site_id: (formData.get('primary_site_id') as string | null) || null,
    primary_department_id: (formData.get('primary_department_id') as string | null) || null,
    notes: (formData.get('notes') as string | null)?.trim() || null,
    is_active: true,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(workerId)
    return { error: profileError.message }
  }

  revalidatePath('/workers')
  redirect(`/workers/${workerId}`)
}

export async function updateWorkerProfile(id: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const firstName = (formData.get('first_name') as string | null)?.trim()
  const lastName = (formData.get('last_name') as string | null)?.trim()
  if (!firstName) return { error: 'First name is required' }
  if (!lastName) return { error: 'Last name is required' }

  const hireDateRaw = (formData.get('hire_date') as string | null) || null

  const { error } = await supabase
    .from('user_profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      phone: (formData.get('phone') as string | null)?.trim() || null,
      mobile: (formData.get('mobile') as string | null)?.trim() || null,
      job_title: (formData.get('job_title') as string | null)?.trim() || null,
      employment_type: (formData.get('employment_type') as string | null) || null,
      employee_id: (formData.get('employee_id') as string | null)?.trim() || null,
      hire_date: hireDateRaw || null,
      primary_site_id: (formData.get('primary_site_id') as string | null) || null,
      primary_department_id: (formData.get('primary_department_id') as string | null) || null,
      notes: (formData.get('notes') as string | null)?.trim() || null,
      is_active: formData.get('is_active') !== 'false',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/workers/${id}`)
  revalidatePath('/workers')
  redirect(`/workers/${id}`)
}
