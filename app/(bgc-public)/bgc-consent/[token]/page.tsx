import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ConsentForm from './ConsentForm'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function ConsentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const crypto = require('crypto') as typeof import('crypto')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const admin = getAdminClient()

  const { data: tokenRow } = await admin
    .from('bgc_consent_tokens')
    .select('package_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .single()

  if (!tokenRow || tokenRow.used_at) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <h1 style={{ fontSize: 24, color: '#161616', marginBottom: 12 }}>Link not available</h1>
        <p style={{ color: '#525252' }}>
          This consent link has already been used or does not exist.
          Please contact the employer if you believe this is an error.
        </p>
      </div>
    )
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <h1 style={{ fontSize: 24, color: '#161616', marginBottom: 12 }}>Link expired</h1>
        <p style={{ color: '#525252' }}>
          This consent link has expired. Please contact the employer to request a new link.
        </p>
      </div>
    )
  }

  const packageId = tokenRow.package_id as string

  const { data: pkg } = await admin
    .from('bgc_packages')
    .select(`
      candidate_first_name,
      candidate_last_name,
      candidate_email,
      position_title,
      province,
      bgc_orders(check_type, status)
    `)
    .eq('id', packageId)
    .single()

  if (!pkg) return notFound()

  const { data: template } = await admin
    .from('bgc_consent_templates')
    .select('id, version, name, body_html')
    .is('organisation_id', null)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const checkTypes = ((pkg.bgc_orders as Array<{ check_type: string }>) ?? []).map(o => o.check_type)

  const checkTypeLabels: Record<string, string> = {
    identity:                    'Identity Verification',
    criminal_standard:           'Criminal Record Check',
    criminal_vulnerable_sector:  'Vulnerable Sector Check',
    drivers_abstract:            'Driver\'s Abstract',
    employment_history:          'Employment History Verification',
    education_credential:        'Education & Credential Verification',
    professional_licence:        'Professional Licence Verification',
    reference_check:             'Professional Reference Checks',
    credit_check:                'Credit Check',
  }

  const consentHtml = (template?.body_html ?? '')
    .replace('{{check_type_list}}', checkTypes.map(ct => `<li>${checkTypeLabels[ct] ?? ct}</li>`).join(''))
    .replace(/\{\{organisation_name\}\}/g, 'your employer')
    .replace(/\{\{position_title\}\}/g, pkg.position_title ?? 'the role')

  return (
    <ConsentForm
      token={token}
      packageId={packageId}
      candidateName={`${pkg.candidate_first_name} ${pkg.candidate_last_name}`}
      positionTitle={pkg.position_title ?? ''}
      checkTypes={checkTypes}
      checkTypeLabels={checkTypeLabels}
      consentHtml={consentHtml}
      templateVersion={template?.version ?? 1}
    />
  )
}
