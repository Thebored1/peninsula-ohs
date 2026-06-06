'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createReportDefinition(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Report name is required' }

  const description = (formData.get('description') as string)?.trim() || null
  const report_type = (formData.get('report_type') as string) || 'custom'

  const { error } = await supabase.from('report_definitions').insert({
    organisation_id: profile.organisation_id,
    name,
    description,
    report_type,
    config: {},
    is_active: true,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/reports/builder')
  redirect('/reports/builder')
}

export async function exportKPIData(orgId: string): Promise<{ rows: string[][], error?: string }> {
  const supabase = await createClient()

  const [{ data: kpis }, { data: snapshots }] = await Promise.all([
    supabase
      .from('kpi_definitions')
      .select('id, name, short_name, unit, indicator_type, benchmark_direction')
      .eq('is_active', true)
      .order('display_order'),
    supabase
      .from('kpi_snapshots')
      .select('kpi_definition_id, value, period_type, period_start, period_end, calculated_at')
      .eq('organisation_id', orgId)
      .eq('is_current', true),
  ])

  if (!kpis) return { rows: [], error: 'Failed to load KPI definitions' }

  const snapshotMap = new Map<string, typeof snapshots extends (infer T)[] | null ? T : never>()
  for (const s of (snapshots ?? [])) {
    if (!snapshotMap.has(s.kpi_definition_id)) {
      snapshotMap.set(s.kpi_definition_id, s)
    }
  }

  const header = ['KPI Name', 'Short Name', 'Unit', 'Indicator Type', 'Benchmark Direction', 'Current Value', 'Period Type', 'Period Start', 'Period End', 'Calculated At']
  const dataRows = kpis.map((kpi) => {
    const snap = snapshotMap.get(kpi.id)
    return [
      kpi.name ?? '',
      kpi.short_name ?? '',
      kpi.unit ?? '',
      kpi.indicator_type ?? '',
      kpi.benchmark_direction ?? '',
      snap?.value != null ? String(snap.value) : '',
      snap?.period_type ?? '',
      snap?.period_start ?? '',
      snap?.period_end ?? '',
      snap?.calculated_at ?? '',
    ]
  })

  return { rows: [header, ...dataRows] }
}
