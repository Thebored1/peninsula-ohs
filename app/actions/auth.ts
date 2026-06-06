'use server'

import { createClient } from '@supabase/supabase-js'

function makeSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function registerUser(data: {
  email: string
  password: string
  firstName: string
  lastName: string
  orgName: string
  industry: string
  timezone: string
}): Promise<{ error?: string }> {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Create auth user — email_confirm: true bypasses SMTP requirement
  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      first_name: data.firstName,
      last_name: data.lastName,
    },
  })

  if (createError) return { error: createError.message }

  const userId = userData.user.id

  try {
    // 2. Unique slug
    const base = makeSlug(data.orgName)
    let slug = base
    let suffix = 0
    while (true) {
      const { count } = await admin
        .from('organisations')
        .select('id', { count: 'exact', head: true })
        .eq('slug', slug)
      if (!count) break
      slug = `${base}-${++suffix}`
    }

    // 3. Create organisation
    const { data: org, error: orgError } = await admin
      .from('organisations')
      .insert({
        name: data.orgName.trim(),
        slug,
        industry: data.industry || null,
        timezone: data.timezone || 'UTC',
        created_by: userId,
      })
      .select('id')
      .single()

    if (orgError) throw new Error(orgError.message)

    // 4. Create user profile
    const { error: profileError } = await admin.from('user_profiles').insert({
      id: userId,
      organisation_id: org.id,
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      email: data.email,
    })

    if (profileError) throw new Error(profileError.message)

    // 5. Assign System Admin role
    const { data: role, error: roleError } = await admin
      .from('roles')
      .select('id')
      .eq('name', 'System Admin')
      .eq('is_system_role', true)
      .single()

    if (roleError) throw new Error(roleError.message)

    const { error: userRoleError } = await admin.from('user_roles').insert({
      user_id: userId,
      role_id: role.id,
      organisation_id: org.id,
      granted_by: userId,
    })

    if (userRoleError) throw new Error(userRoleError.message)

    return {}
  } catch (err) {
    // Roll back — delete the auth user so the email is free to retry
    await admin.auth.admin.deleteUser(userId)
    return { error: err instanceof Error ? err.message : 'Registration failed' }
  }
}
