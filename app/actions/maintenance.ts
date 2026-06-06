'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createMaintenanceRecord(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const assetId = formData.get('asset_id') as string
  const maintenanceTypeId = formData.get('maintenance_type_id') as string
  const description = formData.get('description') as string
  const performedAt = formData.get('performed_at') as string

  if (!assetId) return { error: 'Asset is required' }
  if (!maintenanceTypeId) return { error: 'Maintenance type is required' }
  if (!description?.trim()) return { error: 'Description is required' }
  if (!performedAt) return { error: 'Date performed is required' }

  const performedByName = formData.get('performed_by_name') as string | null
  const contractorCompany = formData.get('contractor_company') as string | null
  const nextMaintenanceDue = formData.get('next_maintenance_due') as string | null
  const durationHoursRaw = formData.get('duration_hours') as string | null
  const findings = formData.get('findings') as string | null
  const partsCostRaw = formData.get('parts_cost') as string | null
  const labourCostRaw = formData.get('labour_cost') as string | null
  const notes = formData.get('notes') as string | null

  const partsCost = partsCostRaw ? parseFloat(partsCostRaw) : null
  const labourCost = labourCostRaw ? parseFloat(labourCostRaw) : null
  const totalCost =
    partsCost != null || labourCost != null
      ? (partsCost ?? 0) + (labourCost ?? 0)
      : null

  const { data: record, error } = await supabase
    .from('asset_maintenance_records')
    .insert({
      organisation_id: profile.organisation_id,
      asset_id: assetId,
      maintenance_type_id: maintenanceTypeId,
      description: description.trim(),
      performed_at: performedAt,
      performed_by_user_id: user.id,
      performed_by_name: performedByName?.trim() || null,
      contractor_company: contractorCompany?.trim() || null,
      next_maintenance_due: nextMaintenanceDue || null,
      duration_hours: durationHoursRaw ? parseFloat(durationHoursRaw) : null,
      findings: findings?.trim() || null,
      parts_cost: partsCost,
      labour_cost: labourCost,
      total_cost: totalCost,
      notes: notes?.trim() || null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Update asset's last_maintained_at and next_maintenance_due
  await supabase
    .from('assets')
    .update({
      last_maintained_at: performedAt,
      next_maintenance_due: nextMaintenanceDue || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId)

  revalidatePath('/maintenance')
  revalidatePath(`/assets/${assetId}`)
  redirect(`/maintenance/${record.id}`)
}
