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

  // New fields
  const supplierName = formData.get('supplier_name') as string | null
  const manufacturerName = formData.get('manufacturer_name') as string | null
  const storageLocation = formData.get('storage_location') as string | null
  const currentQuantityRaw = formData.get('current_quantity') as string | null
  const currentQuantity = currentQuantityRaw && currentQuantityRaw !== '' ? parseFloat(currentQuantityRaw) : null
  const exposureTwaRaw = formData.get('exposure_standard_twa') as string | null
  const exposureTwa = exposureTwaRaw && exposureTwaRaw !== '' ? parseFloat(exposureTwaRaw) : null
  const exposureStelRaw = formData.get('exposure_standard_stel') as string | null
  const exposureStel = exposureStelRaw && exposureStelRaw !== '' ? parseFloat(exposureStelRaw) : null
  const exposureUnit = (formData.get('exposure_standard_unit') as string) || 'ppm'
  const emergencyFirstAid = formData.get('emergency_first_aid') as string | null
  const emergencySpill = formData.get('emergency_spill') as string | null
  const emergencyFire = formData.get('emergency_fire') as string | null
  const sdsFileUrl = formData.get('sds_file_url') as string | null
  const sdsFileName = formData.get('sds_file_name') as string | null
  const sdsIssueDateRaw = formData.get('sds_issue_date') as string | null
  const sdsReviewDateRaw = formData.get('sds_review_date') as string | null

  // Parse dates in dd/mm/yyyy format from Carbon DatePicker
  function parseDate(raw: string | null): string | null {
    if (!raw?.trim()) return null
    // Try ISO first
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim()
    // dd/mm/yyyy
    const parts = raw.trim().split('/')
    if (parts.length === 3) {
      const [d, m, y] = parts
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    return null
  }

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
      // New fields
      supplier_name: supplierName?.trim() || null,
      manufacturer_name: manufacturerName?.trim() || null,
      storage_location: storageLocation?.trim() || null,
      current_quantity: currentQuantity,
      exposure_standard_twa: exposureTwa,
      exposure_standard_stel: exposureStel,
      exposure_standard_unit: exposureUnit,
      emergency_first_aid: emergencyFirstAid?.trim() || null,
      emergency_spill: emergencySpill?.trim() || null,
      emergency_fire: emergencyFire?.trim() || null,
      sds_file_url: sdsFileUrl?.trim() || null,
      sds_file_name: sdsFileName?.trim() || null,
      sds_issue_date: parseDate(sdsIssueDateRaw),
      sds_review_date: parseDate(sdsReviewDateRaw),
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

  // New fields
  const supplierName = formData.get('supplier_name') as string | null
  const manufacturerName = formData.get('manufacturer_name') as string | null
  const storageLocation = formData.get('storage_location') as string | null
  const currentQuantityRaw = formData.get('current_quantity') as string | null
  const currentQuantity = currentQuantityRaw && currentQuantityRaw !== '' ? parseFloat(currentQuantityRaw) : null
  const exposureTwaRaw = formData.get('exposure_standard_twa') as string | null
  const exposureTwa = exposureTwaRaw && exposureTwaRaw !== '' ? parseFloat(exposureTwaRaw) : null
  const exposureStelRaw = formData.get('exposure_standard_stel') as string | null
  const exposureStel = exposureStelRaw && exposureStelRaw !== '' ? parseFloat(exposureStelRaw) : null
  const exposureUnit = (formData.get('exposure_standard_unit') as string) || 'ppm'
  const emergencyFirstAid = formData.get('emergency_first_aid') as string | null
  const emergencySpill = formData.get('emergency_spill') as string | null
  const emergencyFire = formData.get('emergency_fire') as string | null
  const sdsFileUrl = formData.get('sds_file_url') as string | null
  const sdsFileName = formData.get('sds_file_name') as string | null
  const sdsIssueDateRaw = formData.get('sds_issue_date') as string | null
  const sdsReviewDateRaw = formData.get('sds_review_date') as string | null

  function parseDate(raw: string | null): string | null {
    if (!raw?.trim()) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim()
    const parts = raw.trim().split('/')
    if (parts.length === 3) {
      const [d, m, y] = parts
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    return null
  }

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
      // New fields
      supplier_name: supplierName?.trim() || null,
      manufacturer_name: manufacturerName?.trim() || null,
      storage_location: storageLocation?.trim() || null,
      current_quantity: currentQuantity,
      exposure_standard_twa: exposureTwa,
      exposure_standard_stel: exposureStel,
      exposure_standard_unit: exposureUnit,
      emergency_first_aid: emergencyFirstAid?.trim() || null,
      emergency_spill: emergencySpill?.trim() || null,
      emergency_fire: emergencyFire?.trim() || null,
      sds_file_url: sdsFileUrl?.trim() || null,
      sds_file_name: sdsFileName?.trim() || null,
      sds_issue_date: parseDate(sdsIssueDateRaw),
      sds_review_date: parseDate(sdsReviewDateRaw),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/chemicals/${id}`)
  revalidatePath('/chemicals')
  redirect(`/chemicals/${id}`)
}
