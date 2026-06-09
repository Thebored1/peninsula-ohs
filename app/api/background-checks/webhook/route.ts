import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getProviderAdapter } from '@/lib/background-checks/provider'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.text()
  const providerCode = request.headers.get('x-bgc-provider') ?? 'certn'
  const signature = request.headers.get('x-certn-signature') ?? request.headers.get('x-signature') ?? ''

  const admin = getAdminClient()

  // Find the order by external reference ID embedded in the payload
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const externalId = (payload.id ?? payload.check_id ?? payload.reference_id) as string | undefined
  if (!externalId) {
    return NextResponse.json({ error: 'Missing external reference id' }, { status: 400 })
  }

  // Look up the order by external_reference_id
  const { data: order } = await admin
    .from('bgc_orders')
    .select('id, organisation_id, package_id, provider_code')
    .eq('external_reference_id', externalId)
    .single()

  if (!order) {
    // Unknown order — return 200 so provider doesn't retry
    return NextResponse.json({ ok: true, note: 'order not found' })
  }

  // Verify webhook signature using the org's configured webhook secret
  const { data: orgProvider } = await admin
    .from('bgc_organisation_providers')
    .select('credentials')
    .eq('organisation_id', order.organisation_id)
    .eq('provider_code', order.provider_code ?? providerCode)
    .single()

  if (orgProvider?.credentials) {
    const creds = orgProvider.credentials as Record<string, string>
    const webhookSecret = creds.webhook_secret
    if (webhookSecret) {
      const adapter = getProviderAdapter(order.provider_code ?? providerCode)
      const valid = adapter.verifyWebhookSignature(body, signature, webhookSecret)
      if (!valid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }
  }

  // Normalise and store result
  const adapter = getProviderAdapter(order.provider_code ?? providerCode)
  const result = adapter.normaliseResult(payload)

  // Store raw encrypted payload (placeholder — encrypt before storing in production)
  await admin.from('bgc_result_raw').insert({
    order_id:          order.id,
    provider_code:     order.provider_code ?? providerCode,
    encrypted_payload: JSON.stringify(payload), // TODO: encrypt with BGC_ENCRYPTION_KEY
  })

  // Upsert normalised result
  await admin.from('bgc_results').upsert({
    organisation_id: order.organisation_id,
    order_id:        order.id,
    result_summary:  result.summary,
    result_detail:   result.detail,
    received_at:     result.completedAt,
  }, { onConflict: 'order_id' })

  // Advance order status
  await admin
    .from('bgc_orders')
    .update({ status: 'completed', completed_at: result.completedAt, updated_at: new Date().toISOString() })
    .eq('id', order.id)

  return NextResponse.json({ ok: true })
}
