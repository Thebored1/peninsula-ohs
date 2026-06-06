import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { CourseEditForm } from './CourseEditForm'

interface PageProps { params: Promise<{ id: string }> }

export default async function EditCoursePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('training_courses')
    .select('*')
    .eq('id', id)
    .single()

  if (!course) notFound()

  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/training">Training</BreadcrumbItem>
            <BreadcrumbItem href="/training/courses">Course Library</BreadcrumbItem>
            <BreadcrumbItem href={`/training/courses/${id}`}>{course.name}</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>Edit</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Edit Course</h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>{course.name}</p>
          </div>
        </Column>
      </Grid>
      <CourseEditForm course={course} />
    </div>
  )
}
