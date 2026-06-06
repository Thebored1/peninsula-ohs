import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid, Column, Tile, Tag, Breadcrumb, BreadcrumbItem,
} from '@carbon/react'

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>{label}</p>
      <div style={{ fontSize: '0.875rem', color: '#161616' }}>{children}</div>
    </div>
  )
}

interface PageProps { params: Promise<{ id: string }> }

export default async function ChemicalDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: chem } = await supabase
    .from('chemicals')
    .select(`
      id, chemical_number, name, cas_number, un_number, chemical_formula,
      storage_class, quantity_unit, is_hazardous, notes, created_at,
      chemical_categories(name), chemical_physical_states(name)
    `)
    .eq('id', id)
    .single()

  if (!chem) notFound()

  const { data: sds } = await supabase
    .from('chemical_sds')
    .select('id, sds_version, issue_date, expiry_date, supplier_name, first_aid_measures, spill_response, ppe_required, is_current')
    .eq('chemical_id', id)
    .order('issue_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: inventory } = await supabase
    .from('chemical_inventory')
    .select('id, quantity_on_hand, quantity_unit, last_updated_at, chemical_storage_locations(name)')
    .eq('chemical_id', id)

  const catRaw = chem.chemical_categories
  const stateRaw = chem.chemical_physical_states
  const cat = Array.isArray(catRaw) ? (catRaw[0] as { name: string } | undefined) ?? null : (catRaw as { name: string } | null)
  const state = Array.isArray(stateRaw) ? (stateRaw[0] as { name: string } | undefined) ?? null : (stateRaw as { name: string } | null)

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumb style={{ marginBottom: '1.5rem' }}>
        <BreadcrumbItem href="/chemicals">Chemicals</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{chem.chemical_number ?? chem.name}</BreadcrumbItem>
      </Breadcrumb>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
            {chem.chemical_number ?? '—'}
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.75rem' }}>{chem.name}</h1>
          <Tag type={chem.is_hazardous ? 'red' : 'green'} size="md">
            {chem.is_hazardous ? 'Hazardous' : 'Non-hazardous'}
          </Tag>
        </div>
        <a href={`/chemicals/${id}/edit`} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none', marginTop: '0.5rem' }}>
          Edit
        </a>
      </div>

      <Grid condensed>
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Chemical Details</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}><DetailRow label="Category">{cat?.name ?? '—'}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="Physical State">{state?.name ?? '—'}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="CAS Number">{chem.cas_number ?? '—'}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="UN Number">{chem.un_number ?? '—'}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="Formula">{chem.chemical_formula ?? '—'}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="Storage Class">{chem.storage_class ?? '—'}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="Quantity Unit">{chem.quantity_unit}</DetailRow></Column>
              </Grid>
              {chem.notes && <DetailRow label="Notes">{chem.notes}</DetailRow>}
            </div>
          </Tile>
        </Column>

        <Column sm={4} md={8} lg={8}>
          {/* SDS */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Safety Data Sheet</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {!sds ? (
                <p style={{ fontSize: '0.875rem', color: '#6f6f6f' }}>No SDS on file</p>
              ) : (
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}><DetailRow label="Version">{sds.sds_version ?? '—'}</DetailRow></Column>
                  <Column sm={4} md={4} lg={8}><DetailRow label="Supplier">{sds.supplier_name ?? '—'}</DetailRow></Column>
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Issue Date">
                      {sds.issue_date ? new Date(sds.issue_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </DetailRow>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Expiry Date">
                      {sds.expiry_date ? new Date(sds.expiry_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </DetailRow>
                  </Column>
                  {sds.ppe_required && <Column sm={4} md={8} lg={16}><DetailRow label="PPE Required">{sds.ppe_required}</DetailRow></Column>}
                  {sds.first_aid_measures && <Column sm={4} md={8} lg={16}><DetailRow label="First Aid">{sds.first_aid_measures}</DetailRow></Column>}
                  {sds.spill_response && <Column sm={4} md={8} lg={16}><DetailRow label="Spill Response">{sds.spill_response}</DetailRow></Column>}
                </Grid>
              )}
            </div>
          </Tile>

          {/* Inventory */}
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Inventory</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {!inventory || inventory.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: '#6f6f6f' }}>No inventory records</p>
              ) : (
                inventory.map((inv) => {
                  const locRaw = inv.chemical_storage_locations
                  const loc = Array.isArray(locRaw) ? (locRaw[0] as { name: string } | undefined) ?? null : (locRaw as { name: string } | null)
                  return (
                    <div key={inv.id} style={{ marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
                        {Number(inv.quantity_on_hand).toFixed(2)} {inv.quantity_unit}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>{loc?.name ?? 'Unknown location'}</p>
                    </div>
                  )
                })
              )}
            </div>
          </Tile>
        </Column>
      </Grid>
    </div>
  )
}
