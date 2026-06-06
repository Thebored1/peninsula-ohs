import { Breadcrumb, BreadcrumbItem, Grid, Column } from '@carbon/react'
import { CourseForm } from './CourseForm'

export default async function NewCoursePage() {
  return (
    <div style={{ padding: '2rem' }}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Breadcrumb style={{ marginBottom: '1.5rem' }}>
            <BreadcrumbItem href="/training">Training</BreadcrumbItem>
            <BreadcrumbItem href="/training/courses">Course Library</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>New Course</BreadcrumbItem>
          </Breadcrumb>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>New Course</h1>
            <p style={{ fontSize: '0.875rem', color: '#525252' }}>Define a training course or certification</p>
          </div>
        </Column>
      </Grid>
      <CourseForm />
    </div>
  )
}
