import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem } from '@carbon/react'
import { ModuleForm } from './ModuleForm'

interface PageProps { params: Promise<{ id: string }> }

export default async function AddModulePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('training_courses')
    .select('id, name, organisation_id')
    .eq('id', id)
    .single()

  if (!course) notFound()

  // System courses cannot have org-managed modules added
  if (!course.organisation_id) {
    return (
      <div style={{ padding: '2rem' }}>
        <Breadcrumb style={{ marginBottom: '1.5rem' }}>
          <BreadcrumbItem href="/training">Training</BreadcrumbItem>
          <BreadcrumbItem href="/training/courses">Course Library</BreadcrumbItem>
          <BreadcrumbItem href={`/training/courses/${id}`}>{course.name}</BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>Add Module</BreadcrumbItem>
        </Breadcrumb>
        <p style={{ fontSize: '0.875rem', color: '#da1e28' }}>
          System courses are read-only and cannot have modules added.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/training">Training</BreadcrumbItem>
        <BreadcrumbItem href="/training/courses">Course Library</BreadcrumbItem>
        <BreadcrumbItem href={`/training/courses/${id}`}>{course.name}</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Add Module</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>
          Add Module
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#525252' }}>{course.name}</p>
      </div>

      <ModuleForm courseId={id} courseName={course.name} />
    </div>
  )
}
