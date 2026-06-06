'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createAsset(formData: FormData): Promise<{ error?: string }> {
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
  const assetTypeId = formData.get('asset_type_id') as string
  const statusId = formData.get('status_id') as string

  if (!name?.trim()) return { error: 'Asset name is required' }
  if (!assetTypeId) return { error: 'Asset type is required' }
  if (!statusId) return { error: 'Status is required' }

  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('organisation_id', profile.organisation_id)
    .limit(1)
    .maybeSingle()

  const serialNumber = formData.get('serial_number') as string | null
  const assetTag = formData.get('asset_tag') as string | null
  const manufacturer = formData.get('manufacturer') as string | null
  const model = formData.get('model') as string | null
  const yearRaw = formData.get('year_of_manufacture') as string | null
  const purchaseDate = formData.get('purchase_date') as string | null
  const warrantyExpiry = formData.get('warranty_expiry_date') as string | null
  const replacementCostRaw = formData.get('replacement_cost') as string | null
  const locationDetails = formData.get('location_details') as string | null
  const inspectionFrequency = formData.get('inspection_frequency') as string | null
  const nextInspectionDue = formData.get('next_inspection_due') as string | null
  const nextMaintenanceDue = formData.get('next_maintenance_due') as string | null
  const description = formData.get('description') as string | null
  const notes = formData.get('notes') as string | null
  const riskClassification = (formData.get('risk_classification') as string | null) || 'low'

  const { data: asset, error } = await supabase
    .from('assets')
    .insert({
      organisation_id: profile.organisation_id,
      site_id: site?.id ?? null,
      name: name.trim(),
      asset_type_id: assetTypeId,
      status_id: statusId,
      serial_number: serialNumber?.trim() || null,
      asset_tag: assetTag?.trim() || null,
      manufacturer: manufacturer?.trim() || null,
      model: model?.trim() || null,
      year_of_manufacture: yearRaw ? parseInt(yearRaw, 10) : null,
      purchase_date: purchaseDate || null,
      warranty_expiry_date: warrantyExpiry || null,
      replacement_cost: replacementCostRaw ? parseFloat(replacementCostRaw) : null,
      location_details: locationDetails?.trim() || null,
      inspection_frequency: inspectionFrequency || null,
      next_inspection_due: nextInspectionDue || null,
      next_maintenance_due: nextMaintenanceDue || null,
      description: description?.trim() || null,
      notes: notes?.trim() || null,
      risk_classification: riskClassification,
      is_active: true,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/assets')
  redirect(`/assets/${asset.id}`)
}

export async function updateAsset(id: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = formData.get('name') as string
  const assetTypeId = formData.get('asset_type_id') as string
  const statusId = formData.get('status_id') as string

  if (!name?.trim()) return { error: 'Asset name is required' }
  if (!assetTypeId) return { error: 'Asset type is required' }
  if (!statusId) return { error: 'Status is required' }

  const yearRaw = formData.get('year_of_manufacture') as string | null
  const replacementCostRaw = formData.get('replacement_cost') as string | null
  const riskClassification = (formData.get('risk_classification') as string | null) || 'low'

  const { error } = await supabase
    .from('assets')
    .update({
      name: name.trim(),
      asset_type_id: assetTypeId,
      status_id: statusId,
      serial_number: (formData.get('serial_number') as string | null)?.trim() || null,
      asset_tag: (formData.get('asset_tag') as string | null)?.trim() || null,
      manufacturer: (formData.get('manufacturer') as string | null)?.trim() || null,
      model: (formData.get('model') as string | null)?.trim() || null,
      year_of_manufacture: yearRaw ? parseInt(yearRaw, 10) : null,
      purchase_date: (formData.get('purchase_date') as string | null) || null,
      warranty_expiry_date: (formData.get('warranty_expiry_date') as string | null) || null,
      replacement_cost: replacementCostRaw ? parseFloat(replacementCostRaw) : null,
      location_details: (formData.get('location_details') as string | null)?.trim() || null,
      inspection_frequency: (formData.get('inspection_frequency') as string | null) || null,
      next_inspection_due: (formData.get('next_inspection_due') as string | null) || null,
      next_maintenance_due: (formData.get('next_maintenance_due') as string | null) || null,
      description: (formData.get('description') as string | null)?.trim() || null,
      notes: (formData.get('notes') as string | null)?.trim() || null,
      risk_classification: riskClassification,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/assets/${id}`)
  revalidatePath('/assets')
  redirect(`/assets/${id}`)
}

export async function updateAssetStatus(
  id: string,
  statusId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('assets')
    .update({ status_id: statusId, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/assets/${id}`)
  revalidatePath('/assets')
  return {}
}

export async function deactivateAsset(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('assets')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/assets')
  redirect('/assets')
}
