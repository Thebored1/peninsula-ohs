import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Grid, Column, Tile, Tag, Breadcrumb, BreadcrumbItem, Button } from '@carbon/react'

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{
        fontSize: '0.75rem',
        color: '#6f6f6f',
        letterSpacing: '0.32px',
        marginBottom: '0.25rem',
        textTransform: 'uppercase',
        fontWeight: 600,
      }}>
        {label}
      </p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{children}</div>
    </div>
  )
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TemplateDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: template } = await supabase
    .from('toolbox_talk_templates')
    .select(`
      id, title, description, estimated_duration_minutes, is_active, created_at, updated_at,
      toolbox_talk_categories(name, colour_code),
      toolbox_talk_template_points(id, point_number, point_text, point_type)
    `)
    .eq('id', id)
    .single()

  if (!template) notFound()

  const { data: recentDeliveries } = await supabase
    .from('toolbox_talk_deliveries')
    .select('id, delivery_number, title, delivered_at, sites(name)')
    .eq('template_id', id)
    .order('delivered_at', { ascending: false })
    .limit(5)

  const catRaw = template.toolbox_talk_categories
  const category = Array.isArray(catRaw)
    ? (catRaw[0] as { name: string; colour_code: string } | undefined)
    : (catRaw as { name: string; colour_code: string } | null)

  const points = (template.toolbox_talk_template_points ?? []).sort((a, b) => a.point_number - b.point_number)

  const pointTypeLabel: Record<string, string> = {
    key_point: 'Key Point',
    discussion_question: 'Discussion',
    action_item: 'Action',
  }
  const pointTypeColor: Record<string, string> = {
    key_point: '#0f62fe',
    discussion_question: '#6929c4',
    action_item: '#da1e28',
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/toolbox">Toolbox Talks</BreadcrumbItem>
        <BreadcrumbItem href="/toolbox/templates">Templates</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{template.title}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            {category && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.125rem 0.625rem', borderRadius: '12px',
                backgroundColor: `${category.colour_code}22`, color: category.colour_code,
                fontSize: '0.75rem', fontWeight: 600,
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: category.colour_code, flexShrink: 0 }} />
                {category.name}
              </span>
            )}
            <Tag type={template.is_active ? 'green' : 'gray'} size="sm">
              {template.is_active ? 'Active' : 'Inactive'}
            </Tag>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>
            {template.title}
          </h1>
          {template.description && (
            <p style={{ fontSize: '0.875rem', color: '#525252', marginTop: '0.5rem', maxWidth: '48rem', lineHeight: 1.5 }}>
              {template.description}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <Button kind="ghost" href={`/toolbox/templates/${id}/edit`} size="sm">Edit</Button>
          <Button kind="primary" href={`/toolbox/new?template=${id}`} size="sm">Use Template</Button>
        </div>
      </div>

      <Grid condensed>
        <Column sm={4} md={8} lg={12}>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
            {[
              { label: 'Duration', value: `${template.estimated_duration_minutes ?? 10} min` },
              { label: 'Points', value: String(points.length) },
              { label: 'Deliveries', value: String(recentDeliveries?.length ?? 0) },
            ].map(item => (
              <Tile key={item.label} style={{ padding: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', fontWeight: 300, color: '#161616', lineHeight: 1 }}>{item.value}</p>
                <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.25rem' }}>{item.label}</p>
              </Tile>
            ))}
          </div>

          {/* Discussion Points */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Discussion Points</h2>
              <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                {points.length} point{points.length !== 1 ? 's' : ''}
              </span>
            </div>
            {points.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No discussion points added to this template.
              </div>
            ) : (
              <div>
                {points.map((pt, idx) => (
                  <div
                    key={pt.id}
                    style={{
                      padding: '1rem 1.5rem',
                      borderBottom: idx < points.length - 1 ? '1px solid #e0e0e0' : 'none',
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{
                      minWidth: '1.5rem', height: '1.5rem', borderRadius: '50%',
                      backgroundColor: pointTypeColor[pt.point_type] ?? '#525252',
                      color: '#ffffff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {pt.point_number}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '2px',
                        backgroundColor: `${pointTypeColor[pt.point_type] ?? '#525252'}18`,
                        color: pointTypeColor[pt.point_type] ?? '#525252',
                        fontSize: '0.6875rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.32px',
                        marginBottom: '0.375rem',
                      }}>
                        {pointTypeLabel[pt.point_type] ?? pt.point_type}
                      </span>
                      <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.5 }}>{pt.point_text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Tile>

          {/* Recent deliveries */}
          {(recentDeliveries ?? []).length > 0 && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Recent Deliveries</h2>
                <a href="/toolbox" style={{ fontSize: '0.75rem', color: '#0f62fe', textDecoration: 'none' }}>View all</a>
              </div>
              <div>
                {(recentDeliveries ?? []).map((d, idx) => {
                  const siteRaw = d.sites
                  const site = Array.isArray(siteRaw)
                    ? (siteRaw[0] as { name: string } | undefined)
                    : (siteRaw as { name: string } | null)
                  return (
                    <div
                      key={d.id}
                      style={{
                        padding: '0.875rem 1.5rem',
                        borderBottom: idx < (recentDeliveries ?? []).length - 1 ? '1px solid #e0e0e0' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <a href={`/toolbox/${d.id}`} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}>
                          {d.title}
                        </a>
                        {site && (
                          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.125rem' }}>{site.name}</p>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#6f6f6f', flexShrink: 0 }}>
                        {formatDate(d.delivered_at)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Tile>
          )}
        </Column>

        <Column sm={4} md={8} lg={4}>
          <Tile style={{ padding: 0 }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <DetailRow label="Status">
                <Tag type={template.is_active ? 'green' : 'gray'} size="sm">
                  {template.is_active ? 'Active' : 'Inactive'}
                </Tag>
              </DetailRow>
              {category && (
                <DetailRow label="Category">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      backgroundColor: category.colour_code, flexShrink: 0, display: 'inline-block',
                    }} />
                    {category.name}
                  </span>
                </DetailRow>
              )}
              <DetailRow label="Duration">
                {template.estimated_duration_minutes ?? 10} minutes
              </DetailRow>
              <DetailRow label="Created">
                {formatDate(template.created_at)}
              </DetailRow>
              {template.updated_at && template.updated_at !== template.created_at && (
                <DetailRow label="Updated">
                  {formatDate(template.updated_at)}
                </DetailRow>
              )}
            </div>
          </Tile>
        </Column>
      </Grid>
    </div>
  )
}
