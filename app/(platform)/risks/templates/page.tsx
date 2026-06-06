import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import Link from 'next/link'

interface TemplateRisk {
  id: string
  title: string
  template_industry: string | null
  category: string | null
  inherent_risk_level: string | null
  inherent_risk_score: number | null
  hazard_description: string | null
  controls_description: string | null
}

const INDUSTRY_ORDER = ['general', 'construction', 'retail', 'food_service']

const INDUSTRY_LABELS: Record<string, string> = {
  general: 'General',
  construction: 'Construction',
  retail: 'Retail',
  food_service: 'Food Service',
}

function getRiskLevelStyle(level: string | null): { bg: string; color: string } {
  switch (level) {
    case 'low':      return { bg: 'rgba(36,161,72,0.12)',  color: '#1a7a38' }
    case 'medium':   return { bg: 'rgba(241,194,27,0.15)', color: '#7a5f00' }
    case 'high':     return { bg: 'rgba(249,115,22,0.15)', color: '#8a3700' }
    case 'critical': return { bg: 'rgba(218,30,40,0.15)',  color: '#a81522' }
    default:         return { bg: '#f4f4f4',               color: '#525252' }
  }
}

function truncate(text: string | null, max: number): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '…' : text
}

export default async function RiskTemplatesPage() {
  const supabase = await createClient()

  const { data: risks } = await supabase
    .from('risks')
    .select('id, title, template_industry, category, inherent_risk_level, inherent_risk_score, hazard_description, controls_description')
    .eq('is_template', true)
    .order('template_industry')
    .order('title')

  const templates: TemplateRisk[] = risks ?? []

  // Group by industry, using defined order
  const grouped: Record<string, TemplateRisk[]> = {}
  for (const risk of templates) {
    const key = risk.template_industry ?? 'general'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(risk)
  }

  const orderedKeys = [
    ...INDUSTRY_ORDER.filter((k) => grouped[k]?.length),
    ...Object.keys(grouped).filter((k) => !INDUSTRY_ORDER.includes(k) && grouped[k]?.length),
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/risks">Risk Register</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Risk Templates</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>Risk Templates</h1>
        <p style={{ fontSize: '0.875rem', color: '#525252', marginTop: '0.25rem' }}>
          Start a new risk from a pre-built template. Templates are pre-populated with common hazards, controls, and risk ratings.
        </p>
      </div>

      {orderedKeys.length === 0 ? (
        <p style={{ color: '#6f6f6f', fontSize: '0.875rem' }}>No templates available.</p>
      ) : (
        orderedKeys.map((industry) => (
          <div key={industry} style={{ marginBottom: '2.5rem' }}>
            <h2 style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: '#161616',
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid #e0e0e0',
            }}>
              {INDUSTRY_LABELS[industry] ?? industry}
            </h2>

            <Grid condensed>
              {grouped[industry].map((risk) => {
                const levelStyle = getRiskLevelStyle(risk.inherent_risk_level)
                return (
                  <Column key={risk.id} sm={4} md={4} lg={4} style={{ marginBottom: '1rem' }}>
                    <div style={{
                      backgroundColor: '#fff',
                      border: '1px solid #e0e0e0',
                      padding: '1.25rem',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}>
                      {/* Title */}
                      <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#161616', lineHeight: 1.4, margin: 0 }}>
                        {risk.title}
                      </p>

                      {/* Tags row */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                        {risk.category && (
                          <span style={{
                            display: 'inline-block',
                            padding: '0.125rem 0.5rem',
                            backgroundColor: '#edf5ff',
                            color: '#0043ce',
                            fontSize: '0.75rem',
                            borderRadius: '2px',
                            fontWeight: 500,
                          }}>
                            {risk.category}
                          </span>
                        )}
                        {risk.inherent_risk_level && (
                          <span style={{
                            display: 'inline-block',
                            padding: '0.125rem 0.5rem',
                            backgroundColor: levelStyle.bg,
                            color: levelStyle.color,
                            fontSize: '0.75rem',
                            borderRadius: '2px',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}>
                            {risk.inherent_risk_level}
                            {risk.inherent_risk_score != null ? ` (${risk.inherent_risk_score})` : ''}
                          </span>
                        )}
                      </div>

                      {/* Hazard description */}
                      <p style={{ fontSize: '0.8125rem', color: '#525252', lineHeight: 1.5, margin: 0, flex: 1 }}>
                        {truncate(risk.hazard_description, 100)}
                      </p>

                      {/* CTA */}
                      <div style={{ marginTop: 'auto' }}>
                        <Link
                          href={`/risks/new?template_id=${risk.id}`}
                          style={{
                            display: 'inline-block',
                            padding: '0.375rem 0.875rem',
                            border: '1px solid #0f62fe',
                            color: '#0f62fe',
                            backgroundColor: 'transparent',
                            fontSize: '0.875rem',
                            fontWeight: 400,
                            textDecoration: 'none',
                            lineHeight: 1.5,
                          }}
                        >
                          Use This Template
                        </Link>
                      </div>
                    </div>
                  </Column>
                )
              })}
            </Grid>
          </div>
        ))
      )}
    </div>
  )
}
