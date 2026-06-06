import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Grid, Column, Tile, Tag, Breadcrumb, BreadcrumbItem } from '@carbon/react'
import { markAttendeePresent } from '@/app/actions/toolbox'

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
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

export default async function ToolboxDeliveryPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: delivery } = await supabase
    .from('toolbox_talk_deliveries')
    .select(`
      id, delivery_number, title, location, notes, delivered_at, created_at,
      photo_url, photo_file_name, linked_incident_id,
      sites(name),
      user_profiles!toolbox_talk_deliveries_delivered_by_fkey(first_name, last_name),
      toolbox_talk_templates(
        id, title, estimated_duration_minutes,
        toolbox_talk_categories(name, colour_code),
        toolbox_talk_template_points(id, point_number, point_text, point_type)
      )
    `)
    .eq('id', id)
    .single()

  if (!delivery) notFound()

  const { data: attendees } = await supabase
    .from('toolbox_talk_attendees')
    .select('id, attendee_name, acknowledged_at, signature_obtained, worker_id')
    .eq('delivery_id', id)
    .order('created_at', { ascending: true })

  const siteRaw = delivery.sites
  const site = Array.isArray(siteRaw)
    ? (siteRaw[0] as { name: string } | undefined)
    : (siteRaw as { name: string } | null)

  const delivererRaw = delivery.user_profiles
  const deliverer = Array.isArray(delivererRaw)
    ? (delivererRaw[0] as { first_name: string; last_name: string } | undefined)
    : (delivererRaw as { first_name: string; last_name: string } | null)

  const templateRaw = delivery.toolbox_talk_templates as unknown as {
    id: string
    title: string
    estimated_duration_minutes: number
    toolbox_talk_categories: { name: string; colour_code: string } | null
    toolbox_talk_template_points: Array<{
      id: string
      point_number: number
      point_text: string
      point_type: string
    }>
  } | null

  const category = templateRaw?.toolbox_talk_categories
  const points = (templateRaw?.toolbox_talk_template_points ?? []).sort((a, b) => a.point_number - b.point_number)

  const signedCount = (attendees ?? []).filter(a => a.signature_obtained).length
  const totalCount = (attendees ?? []).length

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
        <BreadcrumbItem isCurrentPage>{delivery.delivery_number ?? id.slice(0, 8)}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#525252', fontFamily: 'monospace' }}>
            {delivery.delivery_number ?? '—'}
          </p>
          {category && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.125rem 0.625rem',
              borderRadius: '12px',
              backgroundColor: `${category.colour_code}22`,
              color: category.colour_code,
              fontSize: '0.75rem',
              fontWeight: 600,
            }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: category.colour_code, flexShrink: 0,
              }} />
              {category.name}
            </span>
          )}
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>
          {delivery.title}
        </h1>
        <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.25rem' }}>
          Delivered {formatDateTime(delivery.delivered_at)}
        </p>
      </div>

      <Grid condensed>
        <Column sm={4} md={8} lg={12}>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
            {[
              { label: 'Attendees', value: totalCount },
              { label: 'Signed', value: signedCount },
              { label: 'Discussion Points', value: points.length },
            ].map(item => (
              <Tile key={item.label} style={{ padding: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', fontWeight: 300, color: '#161616', lineHeight: 1 }}>{item.value}</p>
                <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.25rem' }}>{item.label}</p>
              </Tile>
            ))}
          </div>

          {/* Notes */}
          {delivery.notes && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Notes</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#525252', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {delivery.notes}
                </p>
              </div>
            </Tile>
          )}

          {/* Discussion Points from template */}
          {points.length > 0 && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Discussion Points</h2>
                <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                  {points.length} point{points.length !== 1 ? 's' : ''}
                </span>
              </div>
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
                      minWidth: '1.5rem',
                      height: '1.5rem',
                      borderRadius: '50%',
                      backgroundColor: pointTypeColor[pt.point_type] ?? '#525252',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      flexShrink: 0,
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
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.32px',
                        marginBottom: '0.375rem',
                      }}>
                        {pointTypeLabel[pt.point_type] ?? pt.point_type}
                      </span>
                      <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.5 }}>{pt.point_text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Tile>
          )}

          {/* Attendees */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Attendees</h2>
              <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                {signedCount} / {totalCount} signed
              </span>
            </div>
            {totalCount === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6f6f6f', fontSize: '0.875rem' }}>
                No attendees recorded for this talk.
              </div>
            ) : (
              <div>
                {(attendees ?? []).map((a, idx) => (
                  <div
                    key={a.id}
                    style={{
                      padding: '0.875rem 1.5rem',
                      borderBottom: idx < (attendees ?? []).length - 1 ? '1px solid #e0e0e0' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '2rem', height: '2rem', borderRadius: '50%',
                        backgroundColor: '#e0e0e0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700, color: '#525252', flexShrink: 0,
                      }}>
                        {a.attendee_name.charAt(0).toUpperCase()}
                      </div>
                      <p style={{ fontSize: '0.875rem', color: '#161616' }}>{a.attendee_name}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {a.signature_obtained ? (
                        <>
                          <Tag type="green" size="sm">Acknowledged</Tag>
                          {a.acknowledged_at && (
                            <span style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>
                              {formatDateTime(a.acknowledged_at)}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <Tag type="gray" size="sm">Pending</Tag>
                          <form action={async () => {
                            'use server'
                            await markAttendeePresent(a.id)
                          }}>
                            <button
                              type="submit"
                              style={{
                                fontSize: '0.75rem',
                                color: '#0f62fe',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.25rem 0',
                                textDecoration: 'underline',
                              }}
                            >
                              Mark present
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Tile>
        </Column>

        {/* Right sidebar */}
        <Column sm={4} md={8} lg={4}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <DetailRow label="Reference">
                <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                  {delivery.delivery_number ?? '—'}
                </span>
              </DetailRow>
              {site && (
                <DetailRow label="Site">{site.name}</DetailRow>
              )}
              {delivery.location && (
                <DetailRow label="Location">{delivery.location}</DetailRow>
              )}
              <DetailRow label="Delivered By">
                {deliverer ? `${deliverer.first_name} ${deliverer.last_name}` : '—'}
              </DetailRow>
              <DetailRow label="Delivered At">
                {formatDateTime(delivery.delivered_at)}
              </DetailRow>
              {templateRaw && (
                <DetailRow label="Template">
                  <a href={`/toolbox/templates/${templateRaw.id}`} style={{ color: '#0f62fe', textDecoration: 'none', fontSize: '0.875rem' }}>
                    {templateRaw.title}
                  </a>
                </DetailRow>
              )}
              {templateRaw?.estimated_duration_minutes && (
                <DetailRow label="Duration">
                  {templateRaw.estimated_duration_minutes} min
                </DetailRow>
              )}
              <DetailRow label="Recorded">
                {formatDate(delivery.created_at)}
              </DetailRow>
            </div>
          </Tile>
        </Column>
      </Grid>
    </div>
  )
}
