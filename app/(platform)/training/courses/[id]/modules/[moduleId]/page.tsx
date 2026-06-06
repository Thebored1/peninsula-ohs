import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem } from '@carbon/react'
import Link from 'next/link'
import { CompleteModuleButton } from '@/components/training/CompleteModuleButton'

interface PageProps {
  params: Promise<{ id: string; moduleId: string }>
}

function toEmbedUrl(url: string): string | null {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return null
}

export default async function ModuleViewerPage({ params }: PageProps) {
  const { id: courseId, moduleId } = await params
  const supabase = await createClient()

  // Fetch the module
  const { data: module } = await supabase
    .from('training_course_modules')
    .select('id, module_number, title, description, content_type, content_url, content_file_name, duration_minutes, is_mandatory, course_id')
    .eq('id', moduleId)
    .single()

  if (!module) notFound()
  const mod = module!

  // Fetch the course
  const { data: course } = await supabase
    .from('training_courses')
    .select('id, name, organisation_id')
    .eq('id', courseId)
    .single()

  if (!course) notFound()

  // Fetch all modules for nav
  const { data: allModules } = await supabase
    .from('training_course_modules')
    .select('id, module_number, title')
    .eq('course_id', courseId)
    .order('module_number')

  const modules = allModules ?? []
  const currentIndex = modules.findIndex((m) => m.id === moduleId)
  const prevModule = currentIndex > 0 ? modules[currentIndex - 1] : null
  const nextModule = currentIndex < modules.length - 1 ? modules[currentIndex + 1] : null

  // Get effective user for completion status (dev bypass)
  const { data: { user } } = await supabase.auth.getUser()
  let effectiveUserId: string | null = user?.id ?? null
  if (!effectiveUserId) {
    const { data: first } = await supabase.from('user_profiles').select('id').limit(1).single()
    effectiveUserId = first?.id ?? null
  }

  let completion = null
  if (effectiveUserId) {
    const { data } = await supabase
      .from('training_module_completions')
      .select('id')
      .eq('module_id', moduleId)
      .eq('worker_id', effectiveUserId)
      .maybeSingle()
    completion = data
  }

  // Render content area based on content_type
  function renderContent() {
    const type = mod.content_type
    const url = mod.content_url ?? ''

    if (type === 'reading') {
      // Description is always shown below; nothing extra here
      return null
    }

    if (type === 'document') {
      return (
        <iframe
          src={url}
          style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '2px' }}
          title={mod.title}
        />
      )
    }

    if (type === 'video') {
      const embedUrl = url ? toEmbedUrl(url) : null
      if (embedUrl) {
        return (
          <iframe
            src={embedUrl}
            style={{ width: '100%', aspectRatio: '16/9', border: 'none' }}
            allowFullScreen
            title={mod.title}
          />
        )
      }
      return (
        <video src={url} controls style={{ width: '100%' }} />
      )
    }

    if (type === 'external_url') {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#0f62fe', fontSize: '1rem', marginBottom: '1rem' }}
        >
          Open External Resource ↗
        </a>
      )
    }

    if (type === 'quiz' || type === 'checklist') {
      return (
        <div style={{ padding: '1rem', background: '#f4f4f4', borderLeft: '4px solid #0f62fe', marginBottom: '1rem' }}>
          <p>Use the content below to complete this {type}. Click &ldquo;Mark as Complete&rdquo; when done.</p>
        </div>
      )
    }

    return null
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '56rem' }}>
      <Breadcrumb>
        <BreadcrumbItem href="/training/courses">Courses</BreadcrumbItem>
        <BreadcrumbItem href={`/training/courses/${courseId}`}>{course.name}</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Module {mod.module_number}: {mod.title}</BreadcrumbItem>
      </Breadcrumb>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '2rem 0 1.5rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.25rem' }}>MODULE {mod.module_number}</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616' }}>{mod.title}</h1>
          {mod.duration_minutes && (
            <p style={{ fontSize: '0.875rem', color: '#525252', marginTop: '0.25rem' }}>{mod.duration_minutes} min read</p>
          )}
        </div>
        <CompleteModuleButton moduleId={mod.id} courseId={courseId} isCompleted={!!completion} />
      </div>

      {/* Content area */}
      {renderContent()}

      {/* Module description (always shown) */}
      {mod.description && (
        <div style={{ marginTop: '1.5rem', fontSize: '1rem', lineHeight: 1.6, color: '#161616' }}>
          {mod.description.split('\n').map((line: string, i: number) => (
            <p key={i} style={{ marginBottom: '0.75rem' }}>{line}</p>
          ))}
        </div>
      )}

      {/* Prev / Next navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e0e0e0' }}>
        {prevModule
          ? <Link href={`/training/courses/${courseId}/modules/${prevModule.id}`} style={{ color: '#0f62fe', textDecoration: 'none', fontSize: '0.875rem' }}>← Module {prevModule.module_number}: {prevModule.title}</Link>
          : <span />
        }
        {nextModule
          ? <Link href={`/training/courses/${courseId}/modules/${nextModule.id}`} style={{ color: '#0f62fe', textDecoration: 'none', fontSize: '0.875rem' }}>Module {nextModule.module_number}: {nextModule.title} →</Link>
          : <Link href={`/training/courses/${courseId}`} style={{ color: '#0f62fe', textDecoration: 'none', fontSize: '0.875rem' }}>← Back to Course</Link>
        }
      </div>
    </div>
  )
}
