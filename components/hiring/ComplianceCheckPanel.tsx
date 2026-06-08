'use client'

import type { ComplianceCheckResult } from '@/app/actions/hiring'
import { Button, InlineNotification } from '@carbon/react'
import { CheckmarkFilled, WarningFilled, ErrorFilled } from '@carbon/icons-react'

interface Props {
  results: ComplianceCheckResult[]
  passed: boolean
  province: string | null
  onAcknowledge: (overrides: string[]) => void
  isPending: boolean
}

const PROVINCE_NAMES: Record<string, string> = {
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec',
  SK: 'Saskatchewan', MB: 'Manitoba', NS: 'Nova Scotia', NB: 'New Brunswick',
  PE: 'Prince Edward Island', NL: 'Newfoundland & Labrador',
}

export function ComplianceCheckPanel({ results, passed, province, onAcknowledge, isPending }: Props) {
  const errors = results.filter(r => r.severity === 'error')
  const warnings = results.filter(r => r.severity === 'warning')
  const infos = results.filter(r => r.severity === 'info')

  const provinceName = province ? (PROVINCE_NAMES[province] ?? province) : null

  return (
    <div>
      {provinceName && (
        <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '1rem' }}>
          Compliance checks for <strong>{provinceName} ({province})</strong>
        </p>
      )}

      {errors.length > 0 && (
        <InlineNotification
          kind="error"
          title={`${errors.length} compliance error${errors.length !== 1 ? 's' : ''} must be resolved`}
          subtitle="Fix the items below before continuing."
          style={{ marginBottom: '1rem', maxWidth: '100%' }}
          hideCloseButton
        />
      )}

      {warnings.length > 0 && errors.length === 0 && (
        <InlineNotification
          kind="warning"
          title={`${warnings.length} warning${warnings.length !== 1 ? 's' : ''} — review before continuing`}
          subtitle="You may acknowledge these warnings and proceed."
          style={{ marginBottom: '1rem', maxWidth: '100%' }}
          hideCloseButton
        />
      )}

      {passed && errors.length === 0 && warnings.length === 0 && (
        <InlineNotification
          kind="success"
          title="All compliance checks passed"
          subtitle="No issues found. You may proceed."
          style={{ marginBottom: '1rem', maxWidth: '100%' }}
          hideCloseButton
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {results.map((result, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              border: `1px solid ${
                result.severity === 'error' ? '#ffd7d9' :
                result.severity === 'warning' ? '#fde8c8' : '#e0e0e0'
              }`,
              backgroundColor: result.severity === 'error' ? '#fff1f1' :
                result.severity === 'warning' ? '#fdf6dd' : '#f4f4f4',
            }}
          >
            <div style={{ flexShrink: 0, marginTop: '1px' }}>
              {result.severity === 'error' && <ErrorFilled size={16} style={{ color: '#da1e28' }} />}
              {result.severity === 'warning' && <WarningFilled size={16} style={{ color: '#b08800' }} />}
              {result.severity === 'info' && <CheckmarkFilled size={16} style={{ color: '#24a148' }} />}
            </div>
            <div>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#161616', marginBottom: '0.25rem' }}>
                {result.rule_label}
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#525252', lineHeight: 1.5 }}>
                {result.message}
              </p>
            </div>
          </div>
        ))}
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {errors.length === 0 && (
            <Button
              kind="primary"
              disabled={isPending}
              onClick={() => onAcknowledge(warnings.map(w => w.rule_key))}
            >
              {isPending ? 'Saving…' : warnings.length > 0 ? 'Acknowledge & Continue' : 'Continue'}
            </Button>
          )}
          {errors.length > 0 && (
            <p style={{ fontSize: '0.875rem', color: '#da1e28' }}>
              Resolve all errors in Steps 1–3 before continuing.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
