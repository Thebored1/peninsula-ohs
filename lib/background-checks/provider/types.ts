export type BgcCheckType =
  | 'identity'
  | 'criminal_standard'
  | 'criminal_vulnerable_sector'
  | 'drivers_abstract'
  | 'employment_history'
  | 'education_credential'
  | 'professional_licence'
  | 'reference_check'
  | 'credit_check'

export type BgcResultSummary =
  | 'clear'
  | 'record_found'
  | 'unable_to_determine'
  | 'refer'
  | 'pending'

export interface CheckRequest {
  externalOrderId: string
  checkType: BgcCheckType
  candidateFirstName: string
  candidateLastName: string
  candidateEmail: string
  candidateDob?: string          // ISO date YYYY-MM-DD
  candidateSin?: string          // transmitted to provider, never stored
  candidatePhone?: string
  positionTitle?: string
  province?: string
  // Employment history check extras
  previousEmployers?: Array<{ company: string; from: string; to?: string }>
  // Education check extras
  institutions?: Array<{ name: string; degree: string; year: number }>
  // Drivers abstract extras
  driversLicenceNumber?: string
  driversLicenceProvince?: string
}

export interface CheckResult {
  externalReference: string
  summary: BgcResultSummary
  detail: Record<string, unknown>
  completedAt: string            // ISO timestamp
  providerRawPayload?: unknown   // available only on webhook ingest, not stored
}

export interface SubmitCheckResponse {
  externalId: string
  estimatedCompletionAt?: string
}

export interface ProviderAdapter {
  submitCheck(req: CheckRequest, apiKey: string): Promise<SubmitCheckResponse>
  cancelCheck(externalId: string, apiKey: string): Promise<void>
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean
  normaliseResult(rawPayload: unknown): CheckResult
}
