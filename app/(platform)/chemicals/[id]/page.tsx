import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Grid, Column, Tile, Tag, Breadcrumb, BreadcrumbItem, Button,
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
      supplier_name, manufacturer_name,
      storage_location, current_quantity,
      exposure_standard_twa, exposure_standard_stel, exposure_standard_unit,
      emergency_first_aid, emergency_spill, emergency_fire,
      sds_file_url, sds_file_name, sds_issue_date, sds_review_date,
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

  function fmtDate(d: string | null | undefined) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

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
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Tag type={chem.is_hazardous ? 'red' : 'green'} size="md">
              {chem.is_hazardous ? 'Hazardous' : 'Non-hazardous'}
            </Tag>
            {chem.sds_file_url && (
              <a
                href={chem.sds_file_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <Button kind="tertiary" size="sm">
                  Download SDS{chem.sds_file_name ? ` — ${chem.sds_file_name}` : ''}
                </Button>
              </a>
            )}
          </div>
        </div>
        <a href={`/chemicals/${id}/edit`} style={{ fontSize: '0.875rem', color: '#0f62fe', textDecoration: 'none', marginTop: '0.5rem' }}>
          Edit
        </a>
      </div>

      <Grid condensed>
        {/* Chemical Details */}
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

        {/* Supplier & Manufacturer */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Supplier &amp; Manufacturer</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={4} lg={8}><DetailRow label="Supplier">{chem.supplier_name ?? '—'}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="Manufacturer">{chem.manufacturer_name ?? '—'}</DetailRow></Column>
              </Grid>
            </div>
          </Tile>
        </Column>

        {/* Storage & Inventory */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Storage &amp; Inventory</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Grid condensed>
                <Column sm={4} md={8} lg={16}>
                  <DetailRow label="Storage Location">{chem.storage_location ?? '—'}</DetailRow>
                </Column>
                {chem.current_quantity != null && (
                  <Column sm={4} md={4} lg={8}>
                    <DetailRow label="Current Quantity">
                      {Number(chem.current_quantity).toLocaleString('en-AU')} {chem.quantity_unit}
                    </DetailRow>
                  </Column>
                )}
              </Grid>
              {inventory && inventory.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', color: '#6f6f6f', letterSpacing: '0.32px', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    Inventory Records
                  </p>
                  {inventory.map((inv) => {
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
                  })}
                </div>
              )}
            </div>
          </Tile>
        </Column>

        {/* Exposure Standards */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Exposure Standards</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {(chem.exposure_standard_twa != null || chem.exposure_standard_stel != null) ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid #e0e0e0', color: '#525252', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.32px', textTransform: 'uppercase' }}>
                        Type
                      </th>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid #e0e0e0', color: '#525252', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.32px', textTransform: 'uppercase' }}>
                        Limit
                      </th>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid #e0e0e0', color: '#525252', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.32px', textTransform: 'uppercase' }}>
                        Unit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chem.exposure_standard_twa != null && (
                      <tr>
                        <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f4f4f4', color: '#161616' }}>TWA</td>
                        <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f4f4f4', color: '#161616' }}>{Number(chem.exposure_standard_twa).toLocaleString('en-AU')}</td>
                        <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f4f4f4', color: '#525252' }}>{chem.exposure_standard_unit ?? 'ppm'}</td>
                      </tr>
                    )}
                    {chem.exposure_standard_stel != null && (
                      <tr>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#161616' }}>STEL</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#161616' }}>{Number(chem.exposure_standard_stel).toLocaleString('en-AU')}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#525252' }}>{chem.exposure_standard_unit ?? 'ppm'}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontSize: '0.875rem', color: '#6f6f6f' }}>No exposure standards recorded</p>
              )}
            </div>
          </Tile>
        </Column>

        {/* SDS Info */}
        <Column sm={4} md={8} lg={8}>
          <Tile style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Safety Data Sheet</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {chem.sds_file_url && (
                <div style={{ marginBottom: '1rem' }}>
                  <a
                    href={chem.sds_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <Button kind="tertiary" size="sm">
                      Download SDS Document
                    </Button>
                  </a>
                  {chem.sds_file_name && (
                    <p style={{ fontSize: '0.75rem', color: '#6f6f6f', marginTop: '0.25rem' }}>{chem.sds_file_name}</p>
                  )}
                </div>
              )}
              <Grid condensed>
                <Column sm={4} md={4} lg={8}><DetailRow label="Issue Date">{fmtDate(chem.sds_issue_date)}</DetailRow></Column>
                <Column sm={4} md={4} lg={8}><DetailRow label="Review Due">{fmtDate(chem.sds_review_date)}</DetailRow></Column>
              </Grid>
              {/* Legacy SDS record if present */}
              {sds && (
                <Grid condensed>
                  <Column sm={4} md={4} lg={8}><DetailRow label="Version">{sds.sds_version ?? '—'}</DetailRow></Column>
                  <Column sm={4} md={4} lg={8}><DetailRow label="SDS Supplier">{sds.supplier_name ?? '—'}</DetailRow></Column>
                  <Column sm={4} md={4} lg={8}><DetailRow label="SDS Issue Date">{fmtDate(sds.issue_date)}</DetailRow></Column>
                  <Column sm={4} md={4} lg={8}><DetailRow label="SDS Expiry Date">{fmtDate(sds.expiry_date)}</DetailRow></Column>
                  {sds.ppe_required && <Column sm={4} md={8} lg={16}><DetailRow label="PPE Required">{sds.ppe_required}</DetailRow></Column>}
                </Grid>
              )}
            </div>
          </Tile>
        </Column>

        {/* Emergency Response */}
        {(chem.emergency_first_aid || chem.emergency_spill || chem.emergency_fire) && (
          <Column sm={4} md={8} lg={16}>
            <div style={{ padding: '1rem 1.5rem 0', borderBottom: '1px solid #e0e0e0', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616', paddingBottom: '1rem' }}>Emergency Response</h2>
            </div>
            <Grid condensed>
              {chem.emergency_first_aid && (
                <Column sm={4} md={8} lg={chem.emergency_spill || chem.emergency_fire ? 8 : 16}>
                  <Tile style={{ padding: 0, marginBottom: '1rem', borderLeft: '4px solid #0f62fe' }}>
                    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f62fe' }}>First Aid Measures (SDS Section 4)</h3>
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                      <p style={{ fontSize: '0.875rem', color: '#161616', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{chem.emergency_first_aid}</p>
                    </div>
                  </Tile>
                </Column>
              )}
              {chem.emergency_spill && (
                <Column sm={4} md={8} lg={chem.emergency_first_aid || chem.emergency_fire ? 8 : 16}>
                  <Tile style={{ padding: 0, marginBottom: '1rem', borderLeft: '4px solid #f1c21b' }}>
                    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8e6a00' }}>Spill Response Procedures (SDS Section 6)</h3>
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                      <p style={{ fontSize: '0.875rem', color: '#161616', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{chem.emergency_spill}</p>
                    </div>
                  </Tile>
                </Column>
              )}
              {chem.emergency_fire && (
                <Column sm={4} md={8} lg={chem.emergency_first_aid || chem.emergency_spill ? 8 : 16}>
                  <Tile style={{ padding: 0, marginBottom: '1rem', borderLeft: '4px solid #da1e28' }}>
                    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#da1e28' }}>Fire Fighting Measures (SDS Section 5)</h3>
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                      <p style={{ fontSize: '0.875rem', color: '#161616', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{chem.emergency_fire}</p>
                    </div>
                  </Tile>
                </Column>
              )}
            </Grid>
          </Column>
        )}
      </Grid>
    </div>
  )
}
