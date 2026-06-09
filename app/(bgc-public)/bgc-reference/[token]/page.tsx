import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ReferenceQuestionnaireForm, { type Question } from './ReferenceQuestionnaireForm'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function ReferencePage({ params }: { params: { token: string } }) {
  const crypto = require('crypto') as typeof import('crypto')
  const tokenHash = crypto.createHash('sha256').update(params.token).digest('hex')

  const admin = getAdminClient()

  const { data: request } = await admin
    .from('bgc_reference_requests')
    .select(`
      id, status, referee_name, expires_at,
      bgc_packages(candidate_first_name, candidate_last_name, position_title),
      bgc_reference_templates(
        bgc_reference_questions(id, question_text, question_type, options, is_required, display_order)
      )
    `)
    .eq('token_hash', tokenHash)
    .single()

  if (!request) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <h1 style={{ fontSize: 24, color: '#161616', marginBottom: 12 }}>Link not found</h1>
        <p style={{ color: '#525252' }}>This reference link does not exist or has already been used.</p>
      </div>
    )
  }

  if (request.status === 'completed') {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h1 style={{ fontSize: 24, color: '#161616', marginBottom: 12 }}>Already completed</h1>
        <p style={{ color: '#525252' }}>You have already submitted a reference for this candidate. Thank you.</p>
      </div>
    )
  }

  if (request.expires_at && new Date(request.expires_at) < new Date()) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <h1 style={{ fontSize: 24, color: '#161616', marginBottom: 12 }}>Link expired</h1>
        <p style={{ color: '#525252' }}>This reference link has expired. Please contact the employer if you still wish to provide a reference.</p>
      </div>
    )
  }

  const pkgRaw = request.bgc_packages as unknown as Array<{ candidate_first_name: string; candidate_last_name: string; position_title: string }> | null
  const pkg = pkgRaw?.[0] ?? null
  const templateRaw = request.bgc_reference_templates as unknown as Array<{ bgc_reference_questions: Question[] }> | null
  const questions = (templateRaw?.[0]?.bgc_reference_questions ?? [])
    .sort((a, b) => a.display_order - b.display_order)

  return (
    <ReferenceQuestionnaireForm
      token={params.token}
      requestId={request.id}
      refereeName={request.referee_name}
      candidateName={pkg ? `${pkg.candidate_first_name} ${pkg.candidate_last_name}` : 'the candidate'}
      positionTitle={pkg?.position_title ?? 'the role'}
      questions={questions}
    />
  )
}
