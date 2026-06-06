'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createChemical(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const name = formData.get('name') as string
  if (!name?.trim()) return { error: 'Chemical name is required' }

  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('organisation_id', profile.organisation_id)
    .limit(1)
    .maybeSingle()

  const categoryId = formData.get('category_id') as string | null
  const physicalStateId = formData.get('physical_state_id') as string | null
  const casNumber = formData.get('cas_number') as string | null
  const unNumber = formData.get('un_number') as string | null
  const chemicalFormula = formData.get('chemical_formula') as string | null
  const storageClass = formData.get('storage_class') as string | null
  const quantityUnit = (formData.get('quantity_unit') as string) || 'L'
  const isHazardous = formData.get('is_hazardous') !== 'false'
  const notes = formData.get('notes') as string | null

  const { data: chemical, error } = await supabase
    .from('chemicals')
    .insert({
      organisation_id: profile.organisation_id,
      site_id: site?.id ?? null,
      name: name.trim(),
      category_id: categoryId || null,
      physical_state_id: physicalStateId || null,
      cas_number: casNumber?.trim() || null,
      un_number: unNumber?.trim() || null,
      chemical_formula: chemicalFormula?.trim() || null,
      storage_class: storageClass?.trim() || null,
      quantity_unit: quantityUnit,
      is_hazardous: isHazardous,
      is_active: true,
      notes: notes?.trim() || null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/chemicals')
  redirect(`/chemicals/${chemical.id}`)
}

export async function updateChemical(id: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = formData.get('name') as string
  if (!name?.trim()) return { error: 'Chemical name is required' }

  const { error } = await supabase
    .from('chemicals')
    .update({
      name: name.trim(),
      category_id: (formData.get('category_id') as string | null) || null,
      physical_state_id: (formData.get('physical_state_id') as string | null) || null,
      cas_number: (formData.get('cas_number') as string | null)?.trim() || null,
      un_number: (formData.get('un_number') as string | null)?.trim() || null,
      chemical_formula: (formData.get('chemical_formula') as string | null)?.trim() || null,
      storage_class: (formData.get('storage_class') as string | null)?.trim() || null,
      quantity_unit: (formData.get('quantity_unit') as string) || 'L',
      is_hazardous: formData.get('is_hazardous') !== 'false',
      notes: (formData.get('notes') as string | null)?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/chemicals/${id}`)
  revalidatePath('/chemicals')
  redirect(`/chemicals/${id}`)
}
