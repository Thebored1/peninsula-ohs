import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid,
  Column,
  Tile,
  Tag,
  Breadcrumb,
  BreadcrumbItem,
  Button,
} from '@carbon/react'
import { publishTemplate, unpublishTemplate, deleteTemplate } from '@/app/actions/inspection-templates'

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p
        style={{
          fontSize: '0.75rem',
          color: '#6f6f6f',
          letterSpacing: '0.32px',
          marginBottom: '0.25rem',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{children}</div>
    </div>
  )
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  pass_fail: 'Pass / Fail',
  yes_no: 'Yes / No',
  numeric: 'Numeric',
  text: 'Text',
  multiple_choice: 'Multiple Choice',
  photo: 'Photo',
  signature: 'Signature',
  date_time: 'Date & Time',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TemplateDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: template } = await supabase
    .from('inspection_templates')
    .select(`
      id, name, description, instructions, version, is_published, is_active,
      passing_score_threshold, estimated_duration_minutes, created_at, updated_at,
      inspection_types(name)
    `)
    .eq('id', id)
    .single()

  if (!template) notFound()

  // Sections
  const { data: sections } = await supabase
    .from('inspection_template_sections')
    .select('id, title, description, order_index')
    .eq('template_id', id)
    .order('order_index')

  // Questions
  const { data: questions } = await supabase
    .from('inspection_template_questions')
    .select(`
      id, question_text, help_text, question_type, is_required, is_scored,
      weight, options, action_required_on_fail, suggested_action, order_index, section_id
    `)
    .eq('template_id', id)
    .eq('is_active', true)
    .order('order_index')

  // Inspection count using this template
  const { count: inspectionCount } = await supabase
    .from('inspections')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', id)

  const typeRaw = template.inspection_types
  const type = Array.isArray(typeRaw) ? typeRaw[0] ?? null : typeRaw

  // Group questions by section
  const sectionMap = new Map<string | null, typeof questions>()
  sectionMap.set(null, [])
  for (const s of sections ?? []) {
    sectionMap.set(s.id, [])
  }
  for (const q of questions ?? []) {
    const secId = q.section_id ?? null
    if (!sectionMap.has(secId)) sectionMap.set(secId, [])
    sectionMap.get(secId)!.push(q)
  }

  async function handlePublish() {
    'use server'
    await publishTemplate(id)
  }

  async function handleUnpublish() {
    'use server'
    await unpublishTemplate(id)
  }

  async function handleDelete() {
    'use server'
    await deleteTemplate(id)
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/inspections">Inspections</BreadcrumbItem>
        <BreadcrumbItem href="/inspections/templates">Templates</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{template.name}</BreadcrumbItem>
      </Breadcrumb>

      {/* Header */}
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
        }}
      >
        <div>
          <p
            style={{
              fontSize: '0.75rem',
              color: '#6f6f6f',
              letterSpacing: '0.32px',
              marginBottom: '0.25rem',
              textTransform: 'uppercase',
            }}
          >
            v{template.version}
          </p>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '0.75rem',
            }}
          >
            {template.name}
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Tag type={template.is_published ? 'green' : 'gray'} size="md">
              {template.is_published ? 'Published' : 'Draft'}
            </Tag>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {!template.is_published ? (
            <form action={handlePublish}>
              <Button type="submit" kind="primary" size="sm">
                Publish
              </Button>
            </form>
          ) : (
            <form action={handleUnpublish}>
              <Button type="submit" kind="secondary" size="sm">
                Unpublish
              </Button>
            </form>
          )}
          {(inspectionCount ?? 0) === 0 && (
            <form action={handleDelete}>
              <Button type="submit" kind="danger--ghost" size="sm">
                Delete
              </Button>
            </form>
          )}
        </div>
      </div>

      <Grid condensed>
        {/* Left: meta */}
        <Column sm={4} md={4} lg={6}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Template Details
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <DetailRow label="Inspection Type">
                {(type as { name: string } | null)?.name ?? '—'}
              </DetailRow>
              <DetailRow label="Passing Score">{template.passing_score_threshold}%</DetailRow>
              <DetailRow label="Estimated Duration">
                {template.estimated_duration_minutes
                  ? `${template.estimated_duration_minutes} min`
                  : '—'}
              </DetailRow>
              <DetailRow label="Total Questions">{(questions ?? []).length}</DetailRow>
              <DetailRow label="Sections">{(sections ?? []).length || '—'}</DetailRow>
              <DetailRow label="Inspections Conducted">{inspectionCount ?? 0}</DetailRow>
            </div>
          </Tile>

          {template.description && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Description
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>
                  {template.description}
                </p>
              </div>
            </Tile>
          )}

          {template.instructions && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Inspector Instructions
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>
                  {template.instructions}
                </p>
              </div>
            </Tile>
          )}
        </Column>

        {/* Right: questions */}
        <Column sm={4} md={4} lg={10}>
          <Tile style={{ padding: 0 }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Questions ({(questions ?? []).length})
              </h2>
            </div>

            {(questions ?? []).length === 0 ? (
              <div
                style={{
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  color: '#6f6f6f',
                  fontSize: '0.875rem',
                }}
              >
                No questions added to this template.
              </div>
            ) : (
              <div style={{ padding: '1rem 1.5rem' }}>
                {/* Sections with questions */}
                {(sections ?? []).length > 0 && (
                  <>
                    {sections!.map(sec => {
                      const secQs = sectionMap.get(sec.id) ?? []
                      return (
                        <div key={sec.id} style={{ marginBottom: '1.5rem' }}>
                          <h3
                            style={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: '#0f62fe',
                              marginBottom: '0.75rem',
                              paddingBottom: '0.25rem',
                              borderBottom: '1px solid #e0e0e0',
                            }}
                          >
                            {sec.title}
                          </h3>
                          {secQs.map((q, qi) => (
                            <QuestionRow key={q.id} index={qi + 1} question={q} />
                          ))}
                        </div>
                      )
                    })}
                    {/* Unsectioned questions */}
                    {(sectionMap.get(null) ?? []).length > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h3
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#6f6f6f',
                            marginBottom: '0.75rem',
                          }}
                        >
                          Other
                        </h3>
                        {(sectionMap.get(null) ?? []).map((q, qi) => (
                          <QuestionRow key={q.id} index={qi + 1} question={q} />
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* No sections — flat list */}
                {(sections ?? []).length === 0 &&
                  (questions ?? []).map((q, qi) => (
                    <QuestionRow key={q.id} index={qi + 1} question={q} />
                  ))}
              </div>
            )}
          </Tile>
        </Column>
      </Grid>
    </div>
  )
}

function QuestionRow({
  index,
  question,
}: {
  index: number
  question: {
    id: string
    question_text: string
    help_text: string | null
    question_type: string
    is_required: boolean
    is_scored: boolean
    weight: number
    action_required_on_fail: boolean
    suggested_action: string | null
  }
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '1rem',
        padding: '0.75rem 0',
        borderBottom: '1px solid #f4f4f4',
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          fontSize: '0.75rem',
          color: '#6f6f6f',
          minWidth: '1.5rem',
          paddingTop: '0.125rem',
        }}
      >
        {index}.
      </span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.875rem', color: '#161616', marginBottom: '0.25rem' }}>
          {question.question_text}
          {question.is_required && (
            <span style={{ color: '#da1e28', marginLeft: '0.25rem', fontSize: '0.75rem' }}>
              Required
            </span>
          )}
        </p>
        {question.help_text && (
          <p style={{ fontSize: '0.8125rem', color: '#6f6f6f' }}>{question.help_text}</p>
        )}
        {question.action_required_on_fail && question.suggested_action && (
          <p style={{ fontSize: '0.8125rem', color: '#8a3800', marginTop: '0.25rem' }}>
            ↳ On fail: {question.suggested_action}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <Tag type="blue" size="sm">
          {QUESTION_TYPE_LABELS[question.question_type] ?? question.question_type}
        </Tag>
        {question.is_scored && (
          <Tag type="teal" size="sm">
            Weight {question.weight}
          </Tag>
        )}
        {question.action_required_on_fail && (
          <Tag type="red" size="sm">
            Action on fail
          </Tag>
        )}
      </div>
    </div>
  )
}
