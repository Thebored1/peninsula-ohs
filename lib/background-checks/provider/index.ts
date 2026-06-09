import type { ProviderAdapter } from './types'
import { certnAdapter } from './certn'
import { stubAdapter } from './stub'

const ADAPTERS: Record<string, ProviderAdapter> = {
  certn: certnAdapter,
  stub:  stubAdapter,
}

export function getProviderAdapter(providerCode: string): ProviderAdapter {
  const adapter = ADAPTERS[providerCode]
  if (!adapter) throw new Error(`No adapter registered for provider: ${providerCode}`)
  return adapter
}

export type { CheckRequest, CheckResult, BgcCheckType, SubmitCheckResponse, ProviderAdapter } from './types'
