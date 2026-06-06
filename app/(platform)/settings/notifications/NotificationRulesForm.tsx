'use client'

import { useTransition } from 'react'
import { Toggle } from '@carbon/react'
import { updateNotificationRule } from '@/app/actions/settings'

interface Rule {
  id: string
  trigger_event: string
  is_active: boolean
  channels: string[]
  template_name: string | null
}

interface Props {
  rules: Rule[]
}

const CHANNEL_STYLES: Record<string, { background: string; color: string }> = {
  in_app: { background: '#0f62fe', color: '#ffffff' },
  email:  { background: '#007d79', color: '#ffffff' },
  sms:    { background: '#6929c4', color: '#ffffff' },
  push:   { background: '#6f6f6f', color: '#ffffff' },
}

export function NotificationRulesForm({ rules }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleToggle(id: string, currentActive: boolean) {
    startTransition(async () => {
      await updateNotificationRule(id, !currentActive)
    })
  }

  return (
    <div>
      {rules.map((rule, idx) => (
        <div
          key={rule.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            borderBottom: idx < rules.length - 1 ? '1px solid #f4f4f4' : 'none',
            gap: '1rem',
          }}
        >
          {/* Event + template */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
                color: '#161616',
                background: '#f4f4f4',
                padding: '0.125rem 0.375rem',
                borderRadius: '2px',
                display: 'inline-block',
                marginBottom: '0.25rem',
              }}
            >
              {rule.trigger_event}
            </span>
            {rule.template_name && (
              <p style={{ fontSize: '0.75rem', color: '#6f6f6f', margin: 0, marginTop: '0.125rem' }}>
                {rule.template_name}
              </p>
            )}
          </div>

          {/* Channel tags */}
          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, flexWrap: 'wrap' }}>
            {rule.channels.map((ch) => {
              const style = CHANNEL_STYLES[ch] ?? { background: '#e0e0e0', color: '#161616' }
              return (
                <span
                  key={ch}
                  style={{
                    ...style,
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    letterSpacing: '0.32px',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '0.75rem',
                    textTransform: 'uppercase' as const,
                  }}
                >
                  {ch === 'in_app' ? 'In-App' : ch.toUpperCase()}
                </span>
              )
            })}
          </div>

          {/* Active toggle */}
          <div style={{ flexShrink: 0 }}>
            <Toggle
              id={`rule-toggle-${rule.id}`}
              size="sm"
              toggled={rule.is_active}
              labelText=""
              labelA="Off"
              labelB="On"
              disabled={isPending}
              onToggle={() => handleToggle(rule.id, rule.is_active)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
