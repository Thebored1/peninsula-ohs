import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/get-org-id'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, Tile, Tag } from '@carbon/react'

interface PageProps { params: Promise<{ id: string }> }

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default async function HireDocumentsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return <div style={{ padding: '2rem' }}><p>No organisation found.</p></div>

  const [{ data: hire }, { data: docs }] = await Promise.all([
    supabase.from('hires').select('hire_number, candidate_first_name, candidate_last_name').eq('id', id).eq('organisation_id', orgId).single(),
    supabase.from('hire_documents').select('*').eq('hire_id', id).eq('organisation_id', orgId).order('generated_at'),
  ])

  if (!hire) notFound()

  const candidateName = `${hire.candidate_first_name ?? ''} ${hire.candidate_last_name ?? ''}`.trim()

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/hiring">Hiring</BreadcrumbItem>
        <BreadcrumbItem href={`/hiring/${id}`}>{hire.hire_number ?? candidateName}</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Documents</BreadcrumbItem>
      </Breadcrumb>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.25rem' }}>Hire Documents</h1>
      <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '2rem' }}>{candidateName}</p>

      {(!docs || docs.length === 0) ? (
        <Tile style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.875rem', color: '#6f6f6f' }}>No documents generated yet. Complete Step 5 of the hiring wizard.</p>
        </Tile>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {docs.map(doc => (
            <Tile key={doc.id} style={{ padding: 0 }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.125rem' }}>
                    {doc.file_name}
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>Generated {formatDate(doc.generated_at)}</p>
                </div>
                <Tag type={doc.candidate_signed_at ? 'green' : 'gray'} size="sm">
                  {doc.candidate_signed_at ? 'Signed' : 'Awaiting signature'}
                </Tag>
              </div>
              <div style={{ padding: '1rem 1.5rem' }}>
                {doc.candidate_signed_at ? (
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#24a148', marginBottom: '0.5rem' }}>
                      ✓ Candidate signed on {formatDate(doc.candidate_signed_at)}
                    </p>
                    {doc.candidate_signature_url && (
                      <img
                        src={doc.candidate_signature_url}
                        alt="Signature"
                        style={{ maxWidth: '200px', border: '1px solid #e0e0e0', padding: '0.25rem' }}
                      />
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.875rem', color: '#525252' }}>
                    Awaiting candidate signature. Share the document with the candidate or collect signature in person.
                  </p>
                )}
              </div>
            </Tile>
          ))}
        </div>
      )}
    </div>
  )
}
