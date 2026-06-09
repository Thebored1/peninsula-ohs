import type { CheckRequest, CheckResult, ProviderAdapter, SubmitCheckResponse } from './types'

export const stubAdapter: ProviderAdapter = {
  async submitCheck(req: CheckRequest): Promise<SubmitCheckResponse> {
    return {
      externalId: `stub-${req.externalOrderId}`,
      estimatedCompletionAt: new Date(Date.now() + 5_000).toISOString(),
    }
  },

  async cancelCheck(): Promise<void> {
    // no-op
  },

  verifyWebhookSignature(_payload: string, signature: string, _secret: string): boolean {
    return signature === 'stub-valid-signature'
  },

  normaliseResult(rawPayload: unknown): CheckResult {
    const payload = rawPayload as Record<string, unknown>
    return {
      externalReference: (payload.external_id as string) ?? 'stub-unknown',
      summary: (payload.result as CheckResult['summary']) ?? 'clear',
      detail: { stub: true, raw: payload },
      completedAt: new Date().toISOString(),
    }
  },
}
