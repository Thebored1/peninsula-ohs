import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem } from '@carbon/react'
import { ConductForm } from './ConductForm'
import { saveResponses } from '@/app/actions/inspections'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ConductInspectionPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: inspection } = await supabase
    .from('inspections')
    .select(`
      id, inspection_number, status, template_id,
      inspection_templates(name, passing_score_threshold),
      inspection_types(name)
    `)
    .eq('id', id)
    .single()

  if (!inspection) notFound()

  // Can't conduct a submitted or cancelled inspection
  if (['submitted', 'cancelled'].includes(inspection.status)) {
    redirect(`/inspections/${id}`)
  }

  // Fetch questions organised by section
  const { data: questions } = await supabase
    .from('inspection_template_questions')
    .select(`
      id, question_text, help_text, question_type, is_required, is_scored,
      weight, options, fail_condition, action_required_on_fail, suggested_action, order_index,
      inspection_template_sections(id, title, order_index)
    `)
    .eq('template_id', inspection.template_id)
    .eq('is_active', true)
    .order('order_index')

  // Fetch existing responses
  const { data: existingResponses } = await supabase
    .from('inspection_responses')
    .select('question_id, response_value, response_numeric, is_na, notes')
    .eq('inspection_id', id)

  const responseMap: Record<
    string,
    { response_value: string | null; response_numeric: number | null; is_na: boolean; notes: string | null }
  > = {}
  for (const r of existingResponses ?? []) {
    responseMap[r.question_id] = {
      response_value: r.response_value,
      response_numeric: r.response_numeric,
      is_na: r.is_na,
      notes: r.notes,
    }
  }

  const tplRaw = inspection.inspection_templates
  const tpl = Array.isArray(tplRaw) ? tplRaw[0] ?? null : tplRaw

  // Group questions by section
  type Section = {
    id: string | null
    title: string | null
    order: number
    questions: typeof questions
  }

  const sectionMap: Map<string | null, Section> = new Map()
  for (const q of questions ?? []) {
    const secRaw = q.inspection_template_sections
    const sec = Array.isArray(secRaw) ? secRaw[0] ?? null : secRaw
    const secId = (sec as { id: string } | null)?.id ?? null
    const secTitle = (sec as { title: string } | null)?.title ?? null
    const secOrder = (sec as { order_index: number } | null)?.order_index ?? 999

    if (!sectionMap.has(secId)) {
      sectionMap.set(secId, { id: secId, title: secTitle, order: secOrder, questions: [] })
    }
    sectionMap.get(secId)!.questions!.push(q)
  }

  const sections = Array.from(sectionMap.values()).sort((a, b) => a.order - b.order)

  async function handleSave(
    inspectionId: string,
    responses: Parameters<typeof saveResponses>[1]
  ) {
    'use server'
    return saveResponses(inspectionId, responses)
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/inspections">Inspections</BreadcrumbItem>
        <BreadcrumbItem href={`/inspections/${id}`}>
          {inspection.inspection_number ?? id.slice(0, 8)}
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Conduct</BreadcrumbItem>
      </Breadcrumb>

      <h1
        style={{
          fontSize: '1.75rem',
          fontWeight: 400,
          color: '#161616',
          marginBottom: '0.5rem',
        }}
      >
        {(tpl as { name: string } | null)?.name ?? 'Conduct Inspection'}
      </h1>
      <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '2rem' }}>
        {(questions ?? []).length} question{(questions ?? []).length !== 1 ? 's' : ''} to complete
      </p>

      <ConductForm
        inspectionId={id}
        sections={sections as Parameters<typeof ConductForm>[0]['sections']}
        responseMap={responseMap}
        saveAction={handleSave}
        returnUrl={`/inspections/${id}`}
      />
    </div>
  )
}
