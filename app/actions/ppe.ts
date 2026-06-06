'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ---------------------------------------------------------------------------
// createPpe — issue PPE to a worker (creates a ppe_issuances record)
// ---------------------------------------------------------------------------
export async function createPpe(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const workerId = (formData.get('worker_id') as string)?.trim()
  const ppeItemId = (formData.get('ppe_item_id') as string)?.trim()
  const issuedDate = (formData.get('issued_date') as string)?.trim()

  if (!workerId) return { error: 'Worker is required' }
  if (!ppeItemId) return { error: 'PPE item is required' }
  if (!issuedDate) return { error: 'Issued date is required' }

  const expectedReturnDate = (formData.get('expected_return_date') as string)?.trim() || null
  const conditionOnIssue = (formData.get('condition_on_issue') as string)?.trim() || 'good'
  const notes = (formData.get('notes') as string)?.trim() || null

  // Decrement quantity_available on the ppe_item
  const { data: ppeItem, error: fetchError } = await supabase
    .from('ppe_items')
    .select('quantity_available')
    .eq('id', ppeItemId)
    .single()

  if (fetchError || !ppeItem) return { error: 'PPE item not found' }
  if (ppeItem.quantity_available < 1) return { error: 'No units of this PPE item are currently available' }

  const { data: issuance, error: insertError } = await supabase
    .from('ppe_issuances')
    .insert({
      organisation_id: profile.organisation_id,
      worker_id: workerId,
      ppe_item_id: ppeItemId,
      issued_date: issuedDate,
      expected_return_date: expectedReturnDate,
      issued_by: user.id,
      condition_on_issue: conditionOnIssue,
      notes,
      status: 'issued',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (insertError) return { error: insertError.message }

  // Decrement available stock
  const { error: stockError } = await supabase
    .from('ppe_items')
    .update({ quantity_available: ppeItem.quantity_available - 1 })
    .eq('id', ppeItemId)

  if (stockError) return { error: stockError.message }

  revalidatePath('/ppe')
  redirect(`/ppe/${issuance.id}`)
}

// ---------------------------------------------------------------------------
// updatePpeStatus — update the status of an issuance record
// ---------------------------------------------------------------------------
export async function updatePpeStatus(
  id: string,
  status: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  const validStatuses = ['issued', 'returned', 'lost', 'damaged'] as const
  if (!validStatuses.includes(status as typeof validStatuses[number])) {
    return { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }
  }

  const { error } = await supabase
    .from('ppe_issuances')
    .update({ status })
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id)

  if (error) return { error: error.message }

  revalidatePath(`/ppe/${id}`)
  revalidatePath('/ppe')
  return {}
}

// ---------------------------------------------------------------------------
// returnPPE — mark an issuance as returned and restore available stock
// ---------------------------------------------------------------------------
export async function returnPPE(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'User profile not found' }

  // Fetch the issuance to check current status and get the ppe_item_id
  const { data: issuance, error: fetchError } = await supabase
    .from('ppe_issuances')
    .select('status, ppe_item_id')
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id)
    .single()

  if (fetchError || !issuance) return { error: 'Issuance record not found' }
  if (issuance.status === 'returned') return { error: 'This item has already been returned' }

  const returnedDate = new Date().toISOString().split('T')[0]

  const { error: updateError } = await supabase
    .from('ppe_issuances')
    .update({
      status: 'returned',
      returned_date: returnedDate,
    })
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id)

  if (updateError) return { error: updateError.message }

  // Restore quantity_available on the ppe_item (only for returned — not lost/damaged)
  const { data: ppeItem, error: itemFetchError } = await supabase
    .from('ppe_items')
    .select('quantity_available')
    .eq('id', issuance.ppe_item_id)
    .single()

  if (!itemFetchError && ppeItem) {
    await supabase
      .from('ppe_items')
      .update({ quantity_available: ppeItem.quantity_available + 1 })
      .eq('id', issuance.ppe_item_id)
  }

  revalidatePath(`/ppe/${id}`)
  revalidatePath('/ppe')
  return {}
}
