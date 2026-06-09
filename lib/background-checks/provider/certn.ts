import crypto from 'crypto'
import type { CheckRequest, CheckResult, ProviderAdapter, SubmitCheckResponse } from './types'

const CERTN_API_BASE = 'https://api.certn.co/v1'

// Map our check types to Certn's check type identifiers
const CHECK_TYPE_MAP: Record<string, string> = {
  identity:                     'IDENTITY',
  criminal_standard:            'CRIMINAL_RECORD',
  criminal_vulnerable_sector:   'VULNERABLE_SECTOR',
  drivers_abstract:             'DRIVER_ABSTRACT',
  employment_history:           'EMPLOYMENT_VERIFICATION',
  education_credential:         'EDUCATION_VERIFICATION',
  professional_licence:         'PROFESSIONAL_LICENSE',
  credit_check:                 'CREDIT',
}

export const certnAdapter: ProviderAdapter = {
  async submitCheck(req: CheckRequest, apiKey: string): Promise<SubmitCheckResponse> {
    const certnCheckType = CHECK_TYPE_MAP[req.checkType]
    if (!certnCheckType) throw new Error(`Unsupported check type for Certn: ${req.checkType}`)

    const body = {
      reference_id: req.externalOrderId,
      check_type: certnCheckType,
      applicant: {
        first_name:    req.candidateFirstName,
        last_name:     req.candidateLastName,
        email:         req.candidateEmail,
        date_of_birth: req.candidateDob,
        phone:         req.candidatePhone,
        // SIN is only included when provided — never stored after this call
        ...(req.candidateSin ? { sin: req.candidateSin } : {}),
        province:      req.province,
      },
      position_title: req.positionTitle,
    }

    const response = await fetch(`${CERTN_API_BASE}/checks/`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Certn API error ${response.status}: ${error}`)
    }

    const data = await response.json() as { id: string; estimated_completion?: string }
    return {
      externalId:            data.id,
      estimatedCompletionAt: data.estimated_completion,
    }
  },

  async cancelCheck(externalId: string, apiKey: string): Promise<void> {
    await fetch(`${CERTN_API_BASE}/checks/${externalId}/cancel/`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
  },

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  },

  normaliseResult(rawPayload: unknown): CheckResult {
    const p = rawPayload as Record<string, unknown>
    const statusMap: Record<string, CheckResult['summary']> = {
      CLEAR:              'clear',
      RECORD_FOUND:       'record_found',
      UNABLE_TO_COMPLETE: 'unable_to_determine',
      REFER:              'refer',
      IN_PROGRESS:        'pending',
    }
    return {
      externalReference: p.id as string,
      summary:           statusMap[p.status as string] ?? 'unable_to_determine',
      detail: {
        certn_status:    p.status,
        certn_check_type: p.check_type,
        report_url:      p.report_url,
      },
      completedAt:       (p.completed_at as string) ?? new Date().toISOString(),
    }
  },
}
