import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { Tile, InlineNotification } from '@carbon/react'
import { NotificationRulesForm } from './NotificationRulesForm'

export const dynamic = 'force-dynamic'

export default async function NotificationRulesPage() {
  const supabase = await createClient()
  const orgId = await getOrgId()

  if (!orgId) {
    return (
      <div style={{ padding: '2rem' }}>
        <InlineNotification
          kind="error"
          title="Error"
          subtitle="Could not determine organisation. Please sign in again."
          lowContrast
        />
      </div>
    )
  }

  const [{ data: rawRules, error: rulesError }, { data: templates }] = await Promise.all([
    supabase
      .from('notification_rules')
      .select('id, trigger_event, is_active, channels, template_id, created_at')
      .or(`organisation_id.eq.${orgId},organisation_id.is.null`)
      .order('trigger_event'),
    supabase
      .from('notification_templates')
      .select('id, trigger_event, name')
      .order('trigger_event'),
  ])

  if (rulesError) {
    return (
      <div style={{ padding: '2rem' }}>
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={rulesError.message}
          lowContrast
        />
      </div>
    )
  }

  const templateMap: Record<string, string> = {}
  for (const t of templates ?? []) {
    templateMap[t.id] = t.name
  }

  const rules = (rawRules ?? []).map((r) => ({
    id: r.id,
    trigger_event: r.trigger_event,
    is_active: r.is_active,
    channels: (r.channels ?? []) as string[],
    template_name: r.template_id ? (templateMap[r.template_id] ?? null) : null,
  }))

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
          Notification Rules
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#525252' }}>
          Configure which events trigger notifications and who receives them.
        </p>
      </div>

      {rules.length === 0 ? (
        <Tile style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.875rem', color: '#6f6f6f' }}>
            No notification rules configured for this organisation.
          </p>
        </Tile>
      ) : (
        <Tile style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
              Active Rules
            </h2>
          </div>
          <NotificationRulesForm rules={rules} />
        </Tile>
      )}
    </div>
  )
}
