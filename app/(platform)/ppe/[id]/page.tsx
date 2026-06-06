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
import { returnPPE, updatePpeStatus } from '@/app/actions/ppe'

type TagType = 'gray' | 'blue' | 'teal' | 'purple' | 'cyan' | 'magenta' | 'red' | 'green'

function statusTag(status: string): TagType {
  const map: Record<string, TagType> = {
    issued: 'blue',
    returned: 'green',
    lost: 'red',
    damaged: 'magenta',
  }
  return map[status] ?? 'gray'
}

function conditionTag(condition: string | null): TagType {
  const map: Record<string, TagType> = {
    new: 'green',
    good: 'teal',
    fair: 'cyan',
    poor: 'red',
  }
  return map[condition ?? ''] ?? 'gray'
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function isOverdue(expectedReturnDate: string | null, status: string): boolean {
  if (status !== 'issued' || !expectedReturnDate) return false
  return new Date(expectedReturnDate) < new Date()
}

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

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PpeDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: issuance } = await supabase
    .from('ppe_issuances')
    .select(
      `id, issued_date, expected_return_date, returned_date,
       condition_on_issue, condition_on_return, notes, status, created_at,
       worker:worker_id(id, first_name, last_name, email, job_title),
       ppe_item:ppe_item_id(id, brand, model, size, item_code, quantity_total, quantity_available,
         ppe_type:ppe_type_id(name, category)),
       issued_by_profile:issued_by(first_name, last_name, email),
       created_by_profile:created_by(first_name, last_name)`
    )
    .eq('id', id)
    .single()

  if (!issuance) notFound()

  const worker = Array.isArray(issuance.worker)
    ? (issuance.worker[0] as { id: string; first_name: string; last_name: string; email: string; job_title: string | null } | undefined) ?? null
    : (issuance.worker as { id: string; first_name: string; last_name: string; email: string; job_title: string | null } | null)

  const ppeItem = Array.isArray(issuance.ppe_item)
    ? (issuance.ppe_item[0] as { id: string; brand: string | null; model: string | null; size: string | null; item_code: string | null; quantity_total: number; quantity_available: number; ppe_type: { name: string; category: string } | { name: string; category: string }[] | null } | undefined) ?? null
    : (issuance.ppe_item as { id: string; brand: string | null; model: string | null; size: string | null; item_code: string | null; quantity_total: number; quantity_available: number; ppe_type: { name: string; category: string } | { name: string; category: string }[] | null } | null)

  const ppeTypeRaw = ppeItem?.ppe_type ?? null
  const ppeType = Array.isArray(ppeTypeRaw)
    ? (ppeTypeRaw[0] as { name: string; category: string } | undefined) ?? null
    : (ppeTypeRaw as { name: string; category: string } | null)

  const issuedByProfile = Array.isArray(issuance.issued_by_profile)
    ? (issuance.issued_by_profile[0] as { first_name: string; last_name: string; email: string } | undefined) ?? null
    : (issuance.issued_by_profile as { first_name: string; last_name: string; email: string } | null)

  const workerName = worker ? `${worker.first_name} ${worker.last_name}` : '—'
  const ppeName = ppeType?.name ?? '—'
  const itemLabel = [ppeItem?.brand, ppeItem?.model, ppeItem?.size].filter(Boolean).join(' ')
  const overdue = isOverdue(issuance.expected_return_date, issuance.status)

  async function handleReturn() {
    'use server'
    await returnPPE(id)
  }

  async function handleMarkLost() {
    'use server'
    await updatePpeStatus(id, 'lost')
  }

  async function handleMarkDamaged() {
    'use server'
    await updatePpeStatus(id, 'damaged')
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/ppe">PPE Issuances</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{workerName}</BreadcrumbItem>
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
            PPE Issuance
          </p>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 400,
              color: '#161616',
              marginBottom: '0.75rem',
            }}
          >
            {ppeName}
            {itemLabel ? ` — ${itemLabel}` : ''}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Tag type={statusTag(issuance.status)} size="md">
              {issuance.status?.replace(/_/g, ' ')}
            </Tag>
            {overdue && (
              <Tag type="red" size="md">
                Overdue
              </Tag>
            )}
          </div>
        </div>

        {issuance.status === 'issued' && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <form action={handleReturn}>
              <Button kind="primary" type="submit" size="sm">
                Mark Returned
              </Button>
            </form>
            <form action={handleMarkDamaged}>
              <Button kind="ghost" type="submit" size="sm">
                Mark Damaged
              </Button>
            </form>
            <form action={handleMarkLost}>
              <Button kind="danger--ghost" type="submit" size="sm">
                Mark Lost
              </Button>
            </form>
          </div>
        )}
      </div>

      <Grid condensed>
        {/* Left: Issuance details */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                Issuance Details
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Worker">
                    <div>{workerName}</div>
                    {worker?.job_title && (
                      <div style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.125rem' }}>
                        {worker.job_title}
                      </div>
                    )}
                    {worker?.email && (
                      <div style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.125rem' }}>
                        {worker.email}
                      </div>
                    )}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Status">
                    <Tag type={statusTag(issuance.status)} size="sm">
                      {issuance.status?.replace(/_/g, ' ')}
                    </Tag>
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Issued Date">{formatDate(issuance.issued_date)}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Expected Return">
                    {issuance.expected_return_date ? (
                      <span
                        style={
                          overdue
                            ? { color: '#da1e28', fontWeight: 600 }
                            : {}
                        }
                      >
                        {formatDate(issuance.expected_return_date)}
                        {overdue && ' (Overdue)'}
                      </span>
                    ) : (
                      '—'
                    )}
                  </DetailRow>
                </Column>
                {issuance.returned_date && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Returned Date">{formatDate(issuance.returned_date)}</DetailRow>
                  </Column>
                )}
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Condition on Issue">
                    <Tag type={conditionTag(issuance.condition_on_issue)} size="sm">
                      {issuance.condition_on_issue ?? '—'}
                    </Tag>
                  </DetailRow>
                </Column>
                {issuance.condition_on_return && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Condition on Return">
                      <Tag type={conditionTag(issuance.condition_on_return)} size="sm">
                        {issuance.condition_on_return}
                      </Tag>
                    </DetailRow>
                  </Column>
                )}
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Issued By">
                    {issuedByProfile
                      ? `${issuedByProfile.first_name} ${issuedByProfile.last_name}`
                      : '—'}
                  </DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Recorded">
                    {formatDate(issuance.created_at)}
                  </DetailRow>
                </Column>
              </Grid>
            </div>
          </Tile>

          {/* Notes */}
          {issuance.notes && (
            <Tile style={{ padding: 0, marginBottom: '1rem' }}>
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                  Notes
                </h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#161616', lineHeight: 1.6 }}>
                  {issuance.notes}
                </p>
              </div>
            </Tile>
          )}
        </Column>

        {/* Right: PPE Item details */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                PPE Item
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Type">{ppeType?.name ?? '—'}</DetailRow>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <DetailRow label="Category">
                    {ppeType?.category
                      ? ppeType.category.replace(/_/g, ' ')
                      : '—'}
                  </DetailRow>
                </Column>
                {ppeItem?.item_code && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Item Code">
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                        {ppeItem.item_code}
                      </span>
                    </DetailRow>
                  </Column>
                )}
                {ppeItem?.brand && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Brand">{ppeItem.brand}</DetailRow>
                  </Column>
                )}
                {ppeItem?.model && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Model">{ppeItem.model}</DetailRow>
                  </Column>
                )}
                {ppeItem?.size && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Size">{ppeItem.size}</DetailRow>
                  </Column>
                )}
                {ppeItem && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Stock">
                      <span>
                        {ppeItem.quantity_available} available / {ppeItem.quantity_total} total
                      </span>
                    </DetailRow>
                  </Column>
                )}
              </Grid>
            </div>
          </Tile>

          {/* Worker profile link */}
          {worker && (
            <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                Worker
              </p>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', marginBottom: '0.25rem' }}>
                {workerName}
              </p>
              {worker.job_title && (
                <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '0.25rem' }}>
                  {worker.job_title}
                </p>
              )}
              {worker.email && (
                <p style={{ fontSize: '0.875rem', color: '#525252', marginBottom: '1rem' }}>
                  {worker.email}
                </p>
              )}
              <a
                href={`/workers/${worker.id}`}
                style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none' }}
              >
                View worker profile
              </a>
            </Tile>
          )}
        </Column>
      </Grid>
    </div>
  )
}
