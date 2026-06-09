// =============================================================
// PENINSULA OHS — Demo Data Seed Script
// Run: node --env-file=.env.local scripts/seed-demo.mjs
// Reset: delete org "Peninsula Demo Pty Ltd" in Supabase, then re-run
// =============================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env vars. Run: node --env-file=.env.local scripts/seed-demo.mjs')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_ORG_NAME = 'Peninsula Demo Pty Ltd'
const DEMO_PASSWORD = 'DemoPass123!'

function die(label, error) {
  console.error(`\n✗ ${label}:`, error?.message ?? error)
  process.exit(1)
}

async function ins(table, rows, label) {
  const arr = Array.isArray(rows) ? rows : [rows]
  const { error } = await sb.from(table).insert(arr)
  if (error) die(label ?? `insert ${table}`, error)
  console.log(`  ✓ ${label ?? table} (${arr.length})`)
}

async function fid(table, col, val) {
  const { data, error } = await sb.from(table).select('id').eq(col, val).single()
  if (error || !data) die(`lookup ${table}.${col}=${val}`, error ?? 'not found')
  return data.id
}

async function fidN(table, col, val) {
  const { data } = await sb.from(table).select('id').eq(col, val).maybeSingle()
  return data?.id ?? null
}

// ================================================================
// MAIN
// ================================================================
async function main() {
  console.log('\n🏗  Peninsula OHS — Demo Data Seed\n')

  const DEMO_EMAILS = [
    'sarah@peninsula.health',
    'david@peninsula.health',
    'james@peninsula.health',
    'michael@peninsula.health',
    'emma@peninsula.health',
  ]

  // Sweep GoTrue + DB for any previous partial seed
  {
    // Step 1: collect user IDs still in the DB before cleanup
    const { data: existing } = await sb
      .from('organisations').select('id').eq('name', DEMO_ORG_NAME).maybeSingle()

    let staleIds = []
    if (existing) {
      const { data: profiles } = await sb
        .from('user_profiles').select('id').eq('organisation_id', existing.id)
      staleIds = (profiles ?? []).map(p => p.id)
    }

    // Step 2: also check GoTrue directly for any email-matching users
    const { data: allUsers } = await sb.auth.admin.listUsers({ perPage: 1000 })
    const apiStale = (allUsers?.users ?? []).filter(u => DEMO_EMAILS.includes(u.email))
    for (const u of apiStale) if (!staleIds.includes(u.id)) staleIds.push(u.id)

    // Step 3: delete auth users via Admin API first (flushes GoTrue email cache)
    if (staleIds.length) {
      console.log(`ℹ  Purging ${staleIds.length} demo auth user(s) via API...`)
      for (const id of staleIds) {
        const { error: delErr } = await sb.auth.admin.deleteUser(id)
        if (delErr) console.log(`  ⚠  delete ${id}: ${delErr.message}`)
      }
      // Give GoTrue time to propagate the deletions before re-registering
      await new Promise(r => setTimeout(r, 3000))
    }

    // Step 4: clean up remaining DB data via stored procedure
    if (existing) {
      console.log('ℹ  Cleaning up previous seed DB data...')
      const { error: cleanErr } = await sb.rpc('cleanup_demo_org', { p_org_name: DEMO_ORG_NAME })
      if (cleanErr) die('cleanup_demo_org', cleanErr)
      console.log('  ✓ Previous seed cleared\n')
    }
  }

  // ============================================================
  // PHASE 1 — Auth Users
  // ============================================================
  console.log('Phase 1 — Auth users')

  const USERS = [
    { email: DEMO_EMAILS[0], first: 'Sarah',   last: 'Chen',    role: 'System Admin', title: 'Safety Manager',      emp: 'full_time' },
    { email: DEMO_EMAILS[1], first: 'David',   last: 'Patel',   role: 'Executive',    title: 'General Manager',     emp: 'full_time' },
    { email: DEMO_EMAILS[2], first: 'James',   last: 'Nguyen',  role: 'HSE Officer',  title: 'HSE Officer',         emp: 'full_time' },
    { email: DEMO_EMAILS[3], first: 'Michael', last: 'Torres',  role: 'Supervisor',   title: 'Site Supervisor',     emp: 'full_time' },
    { email: DEMO_EMAILS[4], first: 'Emma',    last: 'Wilson',  role: 'Worker',       title: 'Construction Worker', emp: 'full_time' },
  ]

  const uid = {}
  for (const u of USERS) {
    const { data, error } = await sb.auth.admin.createUser({
      email: u.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: u.first, last_name: u.last },
    })
    if (error) die(`createUser ${u.email}`, error)
    uid[u.email] = data.user.id
    console.log(`  ✓ ${u.email}`)
  }

  const [adminId, execId, hseId, supId, workerId] = [
    uid['sarah@peninsula.health'],
    uid['david@peninsula.health'],
    uid['james@peninsula.health'],
    uid['michael@peninsula.health'],
    uid['emma@peninsula.health'],
  ]

  // ============================================================
  // PHASE 2 — Organisation
  // ============================================================
  console.log('\nPhase 2 — Organisation')

  const orgId = crypto.randomUUID()
  const { error: orgErr } = await sb.from('organisations').insert({
    id: orgId,
    name: DEMO_ORG_NAME,
    slug: 'peninsula-demo',
    subdomain: 'demo',
    industry: 'construction',
    timezone: 'Australia/Sydney',
    contact_email: 'sarah@peninsula.health',
    onboarding_completed_at: new Date().toISOString(),
    created_by: adminId,
  })
  if (orgErr) die('insert organisations', orgErr)
  console.log(`  ✓ ${DEMO_ORG_NAME}`)

  // ============================================================
  // PHASE 3 — Sites, Departments, Work Areas, Profiles, Roles
  // ============================================================
  console.log('\nPhase 3 — Sites, departments, users')

  const sHQId   = crypto.randomUUID()
  const sWHId   = crypto.randomUUID()
  const sCSId   = crypto.randomUUID()

  await ins('sites', [
    { id: sHQId, organisation_id: orgId, name: 'Head Office – Sydney',        code: 'HQ-SYD', site_type: 'office',             address: { street: '100 George Street', suburb: 'Sydney',         state: 'NSW', postcode: '2000', country: 'Australia' }, created_by: adminId },
    { id: sWHId, organisation_id: orgId, name: 'Westside Warehouse',          code: 'WH-WST', site_type: 'warehouse',           address: { street: '45 Industrial Drive', suburb: 'Wetherill Park', state: 'NSW', postcode: '2164', country: 'Australia' }, created_by: adminId },
    { id: sCSId, organisation_id: orgId, name: 'Northern Construction Site',  code: 'CS-NTH', site_type: 'construction_site',   address: { street: 'Lot 12 Pacific Highway', suburb: 'Gosford',   state: 'NSW', postcode: '2250', country: 'Australia' }, created_by: adminId },
  ], 'sites (3)')

  // Departments — store IDs keyed by siteId+code
  const dId = {}
  const depts = [
    ['Safety',       'SAFE', sHQId],
    ['Operations',   'OPS',  sHQId],
    ['HR',           'HR',   sHQId],
    ['Safety',       'SAFE', sWHId],
    ['Operations',   'OPS',  sWHId],
    ['Maintenance',  'MAINT',sWHId],
    ['Safety',       'SAFE', sCSId],
    ['Construction', 'CONS', sCSId],
    ['Maintenance',  'MAINT',sCSId],
  ]
  for (const [name, code, siteId] of depts) {
    const id = crypto.randomUUID()
    dId[`${siteId}:${code}`] = id
    const { error } = await sb.from('departments').insert({ id, organisation_id: orgId, site_id: siteId, name, code, created_by: adminId })
    if (error) die(`dept ${code}@${siteId}`, error)
  }
  console.log('  ✓ departments (9)')

  const dSafHQ  = dId[`${sHQId}:SAFE`]
  const dOpsHQ  = dId[`${sHQId}:OPS`]
  const dSafWH  = dId[`${sWHId}:SAFE`]
  const dOpsWH  = dId[`${sWHId}:OPS`]
  const dMaiWH  = dId[`${sWHId}:MAINT`]
  const dSafCS  = dId[`${sCSId}:SAFE`]
  const dConsCS = dId[`${sCSId}:CONS`]
  const dMaiCS  = dId[`${sCSId}:MAINT`]

  const waFloorId = crypto.randomUUID()
  const waNorthId = crypto.randomUUID()
  const waSouthId = crypto.randomUUID()

  await ins('work_areas', [
    { id: waFloorId, organisation_id: orgId, site_id: sWHId, department_id: dOpsWH, name: 'Main Floor',    code: 'WH-MF', location_details: 'Ground-level warehouse floor', created_by: adminId },
    { id: waNorthId, organisation_id: orgId, site_id: sCSId, department_id: dConsCS, name: 'North Zone',  code: 'CS-NZ', location_details: 'Northern excavation and framing area', created_by: adminId },
    { id: waSouthId, organisation_id: orgId, site_id: sCSId, department_id: dConsCS, name: 'South Zone',  code: 'CS-SZ', location_details: 'Southern concrete pour area', created_by: adminId },
  ], 'work_areas (3)')

  // User profiles
  await ins('user_profiles', [
    { id: adminId,  organisation_id: orgId, first_name: 'Sarah',   last_name: 'Chen',   email: 'sarah@peninsula.health',      job_title: 'Safety Manager',      employment_type: 'full_time', primary_site_id: sHQId,  primary_department_id: dSafHQ,  hire_date: '2023-03-15' },
    { id: execId,   organisation_id: orgId, first_name: 'David',   last_name: 'Patel',  email: 'david@peninsula.health',       job_title: 'General Manager',     employment_type: 'full_time', primary_site_id: sHQId,  primary_department_id: dOpsHQ,  hire_date: '2022-01-10' },
    { id: hseId,    organisation_id: orgId, first_name: 'James',   last_name: 'Nguyen', email: 'james@peninsula.health',        job_title: 'HSE Officer',         employment_type: 'full_time', primary_site_id: sCSId,  primary_department_id: dSafCS,  hire_date: '2023-06-01' },
    { id: supId,    organisation_id: orgId, first_name: 'Michael', last_name: 'Torres', email: 'michael@peninsula.health', job_title: 'Site Supervisor',     employment_type: 'full_time', primary_site_id: sCSId,  primary_department_id: dConsCS, hire_date: '2023-09-01' },
    { id: workerId, organisation_id: orgId, first_name: 'Emma',    last_name: 'Wilson', email: 'emma@peninsula.health',     job_title: 'Construction Worker', employment_type: 'full_time', primary_site_id: sCSId,  primary_department_id: dConsCS, hire_date: '2024-02-14' },
  ], 'user_profiles (5)')

  // Roles
  const roleId = {}
  for (const name of ['System Admin', 'Executive', 'HSE Officer', 'Supervisor', 'Worker']) {
    const { data, error } = await sb.from('roles').select('id').eq('name', name).eq('is_system_role', true).single()
    if (error) die(`find role ${name}`, error)
    roleId[name] = data.id
  }
  await ins('user_roles', [
    { user_id: adminId,  role_id: roleId['System Admin'], organisation_id: orgId, granted_by: adminId },
    { user_id: execId,   role_id: roleId['Executive'],    organisation_id: orgId, granted_by: adminId },
    { user_id: hseId,    role_id: roleId['HSE Officer'],  organisation_id: orgId, granted_by: adminId },
    { user_id: supId,    role_id: roleId['Supervisor'],   organisation_id: orgId, granted_by: adminId },
    { user_id: workerId, role_id: roleId['Worker'],       organisation_id: orgId, granted_by: adminId },
  ], 'user_roles (5)')

  // ============================================================
  // PHASE 4 — Compliance Calendar
  // ============================================================
  console.log('\nPhase 4 — Compliance Calendar')

  const cotLeg = await fid('compliance_obligation_types', 'name', 'Legislation')
  const cotStd = await fid('compliance_obligation_types', 'name', 'Standard')

  const obl1 = crypto.randomUUID()
  const obl2 = crypto.randomUUID()
  const obl3 = crypto.randomUUID()

  await ins('compliance_obligations', [
    { id: obl1, organisation_id: orgId, title: 'Annual WHS Management System Audit', description: 'Annual internal audit per WHS Act 2011', obligation_type_id: cotLeg, regulatory_body: 'Safe Work Australia', standard_reference: 'WHS Act 2011 s.43', site_id: sHQId,  frequency: 'annual',    next_due_date: '2026-12-31', owner_id: hseId,  status: 'active', is_critical: true,  created_by: hseId },
    { id: obl2, organisation_id: orgId, title: 'Monthly Equipment Inspections',      description: 'Monthly inspection of all plant and equipment', obligation_type_id: cotStd, regulatory_body: 'SafeWork NSW', standard_reference: 'AS 4024.1', site_id: sCSId, frequency: 'monthly',   next_due_date: '2026-07-31', owner_id: supId,  status: 'active', is_critical: false, created_by: hseId },
    { id: obl3, organisation_id: orgId, title: 'Quarterly Emergency Evacuation Drill',description: 'Quarterly drill at all active sites', obligation_type_id: cotLeg, regulatory_body: 'SafeWork NSW', standard_reference: 'WHS Reg 2017 s.43', frequency: 'quarterly', next_due_date: '2026-09-30', owner_id: hseId,  status: 'active', is_critical: true,  created_by: hseId },
  ], 'compliance_obligations (3)')

  await ins('compliance_tasks', [
    { obligation_id: obl1, organisation_id: orgId, title: 'Schedule WHS Audit — Q4 2026',             due_date: '2026-11-30', assigned_to: hseId,  status: 'pending', created_by: hseId },
    { obligation_id: obl2, organisation_id: orgId, title: 'Equipment Inspection — July 2026',         due_date: '2026-07-31', assigned_to: supId,  status: 'pending', created_by: hseId },
    { obligation_id: obl3, organisation_id: orgId, title: 'Emergency Evacuation Drill — Q3 2026',     due_date: '2026-09-30', assigned_to: hseId,  status: 'pending', created_by: hseId },
  ], 'compliance_tasks (3)')

  // ============================================================
  // PHASE 5 — Documents
  // ============================================================
  console.log('\nPhase 5 — Documents')

  const dtPolicy   = await fid('document_types', 'code', 'policy')
  const dtSOP      = await fid('document_types', 'code', 'sop')
  const dtSWMS     = await fid('document_types', 'code', 'swms')
  const dtEmergency= await fid('document_types', 'code', 'emergency')
  const dsPublished= await fid('document_statuses', 'code', 'published')
  const dsApproved = await fid('document_statuses', 'code', 'approved')

  await ins('documents', [
    { organisation_id: orgId, site_id: sHQId,  name: 'WHS Safety Policy',                   description: 'Company-wide WHS policy statement', category: 'policy',     storage_path: 'demo/docs/whs-policy-v2.pdf',           file_name: 'WHS Safety Policy v2.pdf',            file_size: 245000, mime_type: 'application/pdf', document_type_id: dtPolicy,    status_id: dsPublished, is_controlled_document: true, published_at: '2026-01-15T00:00:00Z', published_by: adminId, current_version: 2, created_by: adminId },
    { organisation_id: orgId, site_id: sCSId,  name: 'Confined Space Entry Procedure',       description: 'Safe work procedure for confined space entry', category: 'procedure', storage_path: 'demo/docs/confined-space-sop.pdf',      file_name: 'Confined Space Entry SOP.pdf',        file_size: 312000, mime_type: 'application/pdf', document_type_id: dtSOP,      status_id: dsPublished, is_controlled_document: true, published_at: '2026-02-01T00:00:00Z', published_by: hseId,   current_version: 1, created_by: hseId },
    { organisation_id: orgId, site_id: sCSId,  name: 'SWMS – Scaffolding Erection',          description: 'Safe work method statement for scaffolding erection and dismantling', category: 'procedure', storage_path: 'demo/docs/swms-scaffolding.pdf', file_name: 'SWMS Scaffolding Erection.pdf', file_size: 198000, mime_type: 'application/pdf', document_type_id: dtSWMS, status_id: dsApproved,  is_controlled_document: true, current_version: 1, created_by: hseId },
    { organisation_id: orgId,                  name: 'Emergency Evacuation Plan',             description: 'Organisation-wide emergency procedures and muster points', category: 'procedure', storage_path: 'demo/docs/evacuation-plan-v3.pdf',     file_name: 'Emergency Evacuation Plan v3.pdf',    file_size: 456000, mime_type: 'application/pdf', document_type_id: dtEmergency, status_id: dsPublished, is_controlled_document: true, published_at: '2026-01-20T00:00:00Z', published_by: adminId, current_version: 3, created_by: adminId },
  ], 'documents (4)')

  // ============================================================
  // PHASE 6 — Training & Workforce
  // ============================================================
  console.log('\nPhase 6 — Training')

  const tc1 = crypto.randomUUID()
  const tc2 = crypto.randomUUID()

  await ins('training_courses', [
    { id: tc1, organisation_id: orgId, code: 'SITE-IND-01', name: 'Site Safety Induction',    description: 'Mandatory induction for all workers and contractors', course_type: 'classroom', duration_hours: 4,  validity_period_months: 12, is_certification: true,  is_active: true, created_by: adminId },
    { id: tc2, organisation_id: orgId, code: 'WORK-HL-01',  name: 'Working at Heights',       description: 'Safe work at heights including harness use and inspection', course_type: 'blended', duration_hours: 8, validity_period_months: 24, is_certification: true, is_active: true, created_by: hseId },
  ], 'training_courses (2)')

  await ins('training_records', [
    { organisation_id: orgId, worker_id: hseId,    course_id: tc1, completed_date: '2026-01-10', expiry_date: '2027-01-10', delivery_method: 'classroom', provider: 'Peninsula OHS',       trainer_name: 'Sarah Chen',    status: 'current', created_by: adminId },
    { organisation_id: orgId, worker_id: supId,    course_id: tc1, completed_date: '2026-01-15', expiry_date: '2027-01-15', delivery_method: 'classroom', provider: 'Peninsula OHS',       trainer_name: 'Sarah Chen',    status: 'current', created_by: adminId },
    { organisation_id: orgId, worker_id: workerId, course_id: tc1, completed_date: '2026-02-01', expiry_date: '2027-02-01', delivery_method: 'classroom', provider: 'Peninsula OHS',       trainer_name: 'James Nguyen',  status: 'current', created_by: adminId },
    { organisation_id: orgId, worker_id: supId,    course_id: tc2, completed_date: '2025-11-20', expiry_date: '2027-11-20', delivery_method: 'blended',   provider: 'Heights Pro Training', trainer_name: 'Rob Davies',    status: 'current', created_by: adminId },
    { organisation_id: orgId, worker_id: workerId, course_id: tc2, completed_date: '2025-12-05', expiry_date: '2027-12-05', delivery_method: 'blended',   provider: 'Heights Pro Training', trainer_name: 'Rob Davies',    status: 'current', created_by: adminId },
  ], 'training_records (5)')

  // Health surveillance
  console.log('\nPhase 6b — Health Surveillance')

  const hstAudio = await fid('health_surveillance_types', 'code', 'audiometry')
  const hstSpiro = await fid('health_surveillance_types', 'code', 'spirometry')

  await ins('worker_health_profiles', [
    { user_id: supId,    organisation_id: orgId, overall_status: 'fit',                   has_active_restrictions: false, last_check_date: '2026-03-10', next_check_due: '2027-03-10' },
    { user_id: workerId, organisation_id: orgId, overall_status: 'fit_with_restrictions',  has_active_restrictions: true,  last_check_date: '2026-03-12', next_check_due: '2026-09-12' },
  ], 'worker_health_profiles (2)')

  await ins('health_check_records', [
    { user_id: supId,    organisation_id: orgId, surveillance_type_id: hstAudio, result: 'fit',                  check_date: '2026-03-10', next_check_due: '2027-03-10', provider_name: 'Peninsula Occupational Health', is_baseline: false, restrictions_issued: false, recorded_by: hseId },
    { user_id: workerId, organisation_id: orgId, surveillance_type_id: hstAudio, result: 'fit',                  check_date: '2026-03-12', next_check_due: '2027-03-12', provider_name: 'Peninsula Occupational Health', is_baseline: true,  restrictions_issued: false, recorded_by: hseId },
    { user_id: workerId, organisation_id: orgId, surveillance_type_id: hstSpiro, result: 'fit_with_restrictions', check_date: '2026-03-12', next_check_due: '2026-09-12', provider_name: 'Peninsula Occupational Health', result_notes: 'Mild airways sensitivity – avoid silica dust without P2 respirator', restrictions_issued: true, is_baseline: false, recorded_by: hseId },
  ], 'health_check_records (3)')

  // PPE issuance
  console.log('\nPhase 6c — PPE Issuance')

  const ppeHardHat = await fid('ppe_types', 'code', 'hard_hat')
  const ppeBoots   = await fid('ppe_types', 'code', 'safety_boots')
  const ppeHarness = await fid('ppe_types', 'code', 'fall_harness')

  const pi1 = crypto.randomUUID()
  const pi2 = crypto.randomUUID()
  const pi3 = crypto.randomUUID()

  await ins('ppe_items', [
    { id: pi1, organisation_id: orgId, ppe_type_id: ppeHardHat, item_code: 'HH-001', brand: 'Protector', model: 'ProTec HD',         size: 'Universal', quantity_total: 20, quantity_available: 17, site_id: sCSId, created_by: adminId },
    { id: pi2, organisation_id: orgId, ppe_type_id: ppeBoots,   item_code: 'SB-007', brand: 'Steel Blue', model: 'Torquay 625',     size: '10',        quantity_total:  5, quantity_available:  4, site_id: sCSId, created_by: adminId },
    { id: pi3, organisation_id: orgId, ppe_type_id: ppeHarness, item_code: 'SH-003', brand: 'Miller',     model: 'Revolution H500', size: 'L',         quantity_total:  8, quantity_available:  7, site_id: sCSId, expiry_date: '2028-06-01', created_by: adminId },
  ], 'ppe_items (3)')

  await ins('ppe_issuances', [
    { organisation_id: orgId, worker_id: supId,    ppe_item_id: pi1, issued_date: '2026-01-15', issued_by: adminId, condition_on_issue: 'new',  status: 'issued', created_by: adminId },
    { organisation_id: orgId, worker_id: workerId, ppe_item_id: pi1, issued_date: '2026-02-01', issued_by: adminId, condition_on_issue: 'new',  status: 'issued', created_by: adminId },
    { organisation_id: orgId, worker_id: supId,    ppe_item_id: pi3, issued_date: '2026-01-15', issued_by: adminId, condition_on_issue: 'good', status: 'issued', created_by: adminId },
  ], 'ppe_issuances (3)')

  // ============================================================
  // PHASE 7 — Assets & Equipment
  // ============================================================
  console.log('\nPhase 7 — Assets')

  const atMach = await fid('asset_types', 'code', 'machinery')
  const atVeh  = await fid('asset_types', 'code', 'vehicle')
  const atFire = await fid('asset_types', 'code', 'fire_safety')
  const atFA   = await fid('asset_types', 'code', 'first_aid')
  const asOp   = await fid('asset_statuses', 'code', 'operational')
  const asMai  = await fid('asset_statuses', 'code', 'under_maintenance')
  const mtPrev = await fid('maintenance_types', 'code', 'preventive')
  const mtCorr = await fid('maintenance_types', 'code', 'corrective')

  const aFork = crypto.randomUUID()
  const aVeh  = crypto.randomUUID()
  const aExc  = crypto.randomUUID()
  const aFA   = crypto.randomUUID()
  const aFire = crypto.randomUUID()

  await ins('assets', [
    { id: aFork, organisation_id: orgId, site_id: sWHId, department_id: dMaiWH, name: 'Toyota Forklift 2.5T',          asset_type_id: atMach, serial_number: 'TY-FK-25-0023',      asset_tag: 'WH-FL-01', manufacturer: 'Toyota',   model: '8FGF25',       year_of_manufacture: 2021, status_id: asOp,  purchase_date: '2021-06-01', replacement_cost: 45000.00,  inspection_frequency: 'daily',   next_inspection_due: '2026-06-10', next_maintenance_due: '2026-07-01', risk_classification: 'medium', created_by: adminId },
    { id: aVeh,  organisation_id: orgId, site_id: sCSId, department_id: dConsCS, name: 'Site Vehicle – Toyota Hilux',   asset_type_id: atVeh,  serial_number: 'HLX-2024-A47',       asset_tag: 'CS-VH-01', manufacturer: 'Toyota',   model: 'Hilux SR5 4x4', year_of_manufacture: 2024, status_id: asOp,  purchase_date: '2024-01-10', replacement_cost: 68000.00,  inspection_frequency: 'weekly',  next_inspection_due: '2026-06-15', next_maintenance_due: '2026-08-01', risk_classification: 'medium', created_by: adminId },
    { id: aExc,  organisation_id: orgId, site_id: sCSId, department_id: dConsCS, name: '50T Hydraulic Excavator',        asset_type_id: atMach, serial_number: 'KOM-PC300-2022-018', asset_tag: 'CS-EX-01', manufacturer: 'Komatsu',  model: 'PC300LC-8',    year_of_manufacture: 2022, status_id: asMai, purchase_date: '2022-08-15', replacement_cost: 380000.00, inspection_frequency: 'daily',   next_inspection_due: '2026-06-12', next_maintenance_due: '2026-06-15', risk_classification: 'high',   created_by: adminId },
    { id: aFA,   organisation_id: orgId, site_id: sCSId, department_id: dSafCS,  name: 'First Aid Kit Cabinet – Office', asset_type_id: atFA,   asset_tag: 'CS-FA-01',                                                                                                              status_id: asOp,  inspection_frequency: 'monthly', next_inspection_due: '2026-07-01',                                                risk_classification: 'low',    created_by: adminId },
    { id: aFire, organisation_id: orgId, site_id: sCSId, department_id: dSafCS,  name: 'Fire Extinguisher Bank – Entry', asset_type_id: atFire, asset_tag: 'CS-FE-01',                                                                                                              status_id: asOp,  inspection_frequency: 'monthly', next_inspection_due: '2026-07-01', next_maintenance_due: '2026-12-01', risk_classification: 'low',    created_by: adminId },
  ], 'assets (5)')

  await ins('asset_maintenance_records', [
    { asset_id: aFork, organisation_id: orgId, maintenance_type_id: mtPrev, performed_by_user_id: adminId,   performed_at: '2026-05-01T08:00:00Z', next_maintenance_due: '2026-07-01', duration_hours: 3,   description: '1000hr preventive service – oil/filter change, fork inspection, safety checks', labour_cost: 350.00, total_cost: 520.00,   created_by: adminId },
    { asset_id: aExc,  organisation_id: orgId, maintenance_type_id: mtCorr, performed_by_user_id: adminId,   performed_at: '2026-06-08T07:30:00Z', next_maintenance_due: '2026-06-15', duration_hours: 6,   description: 'Hydraulic hose replacement – bucket cylinder', findings: 'Main hose failed at fitting. Two others showing wear.', parts_cost: 890.00, labour_cost: 720.00, total_cost: 1610.00, created_by: supId },
    { asset_id: aVeh,  organisation_id: orgId, maintenance_type_id: mtPrev, performed_by_name: 'Toyota Service Centre Gosford', performed_at: '2026-04-15T09:00:00Z', next_maintenance_due: '2026-08-01', duration_hours: 2, description: '15,000km service – oil, filter, tyre rotation, brake check', contractor_company: 'Toyota Service Gosford', labour_cost: 280.00, total_cost: 480.00, created_by: adminId },
  ], 'asset_maintenance_records (3)')

  // LOTO
  console.log('\nPhase 7b — LOTO Procedures')

  const ltElec = await fid('loto_energy_types', 'name', 'Electrical')
  const ltHyd  = await fid('loto_energy_types', 'name', 'Hydraulic')

  const loto1 = crypto.randomUUID()
  const loto2 = crypto.randomUUID()

  await ins('loto_procedures', [
    { id: loto1, organisation_id: orgId, title: '50T Excavator – Hydraulic System Isolation',         description: 'Complete isolation procedure for excavator prior to maintenance', asset_description: 'Komatsu PC300LC-8 Excavator', site_id: sCSId, status: 'approved', revision_number: 1, approved_by: hseId, approved_at: '2026-02-15T10:00:00Z', next_review_date: '2027-02-15', created_by: hseId },
    { id: loto2, organisation_id: orgId, title: 'Warehouse Main Switchboard – Electrical Lockout',    description: 'Lockout procedure for the main 3-phase switchboard', asset_description: 'Main switchboard – Warehouse Building A',   site_id: sWHId, status: 'approved', revision_number: 2, approved_by: hseId, approved_at: '2026-01-20T09:00:00Z', next_review_date: '2027-01-20', created_by: adminId },
  ], 'loto_procedures (2)')

  await ins('loto_isolation_points', [
    { procedure_id: loto1, sequence_number: 1, energy_type_id: ltElec, location_description: 'Engine compartment – main isolator switch',   isolation_method: 'Isolate and lock with personal lock. Apply red DANGER tag.', lock_device_type: 'padlock',              verification_method: 'Attempt engine start to verify zero energy' },
    { procedure_id: loto1, sequence_number: 2, energy_type_id: ltHyd,  location_description: 'Hydraulic accumulator – pressure relief valve', isolation_method: 'Open relief valve to bleed hydraulic pressure to zero.',      lock_device_type: 'valve lockout',        verification_method: 'Confirm gauge reads 0 bar' },
    { procedure_id: loto2, sequence_number: 1, energy_type_id: ltElec, location_description: 'Main switchboard – circuit breaker CB-01',     isolation_method: 'Switch to OFF. Apply lockout hasps for all workers.',         lock_device_type: 'circuit breaker lockout', verification_method: 'Multimeter – zero volts at all load terminals' },
  ], 'loto_isolation_points (3)')

  // Chemicals
  console.log('\nPhase 7c — Chemicals')

  const ccFlam = await fid('chemical_categories',    'code', 'flammable')
  const cpLiq  = await fid('chemical_physical_states','code', 'liquid')
  const cpPaste= await fid('chemical_physical_states','code', 'paste')

  await ins('chemicals', [
    { organisation_id: orgId, site_id: sCSId, category_id: ccFlam, physical_state_id: cpLiq,  name: 'Diesel Fuel (automotive)',       cas_number: '68334-30-5', is_hazardous: true, storage_class: 'Class 3 Flammable', quantity_unit: 'L', current_quantity: 500, storage_location: 'Bunded fuel storage compound – north of site',      supplier_name: 'Caltex Australia',          emergency_first_aid: 'Wash with soap and water. Seek medical attention if ingested.', emergency_spill: 'Contain with absorbent material. Do not enter stormwater.', emergency_fire: 'Use foam, dry chem or CO2. Do NOT use water.',   sds_issue_date: '2024-01-01', sds_review_date: '2029-01-01', is_active: true, created_by: hseId },
    { organisation_id: orgId, site_id: sCSId, category_id: ccFlam, physical_state_id: cpLiq,  name: 'Hydraulic Oil (46 grade)',        cas_number: '64742-65-0', is_hazardous: true, storage_class: 'Class 9 Miscellaneous',  quantity_unit: 'L', current_quantity: 200, storage_location: 'Maintenance workshop – chemical storage cabinet',    supplier_name: 'Castrol Industrial',         emergency_first_aid: 'Wash skin with soap and water. Flush eyes 15 min.',          emergency_spill: 'Absorb with sand or dry earth. Dispose as hazardous waste.', sds_issue_date: '2025-03-01', sds_review_date: '2030-03-01', is_active: true, created_by: hseId },
    { organisation_id: orgId, site_id: sCSId,                       physical_state_id: cpPaste, name: 'Concrete Sealant (Sikafloor 2540W)',                        is_hazardous: true,                                      quantity_unit: 'L', current_quantity:  50, storage_location: 'Materials shed – locked chemicals cabinet',          supplier_name: 'Sika Australia',             emergency_first_aid: 'Remove contaminated clothing. Wash skin. If swallowed do NOT induce vomiting.', emergency_spill: 'Collect and seal in labelled containers. Dispose as chemical waste.', sds_issue_date: '2025-01-15', sds_review_date: '2030-01-15', is_active: true, created_by: hseId },
    { organisation_id: orgId, site_id: sWHId,                       physical_state_id: cpLiq,  name: 'Cleaning Solvent (IPA 70%)',                                 is_hazardous: true, storage_class: 'Class 3 Flammable',  quantity_unit: 'L', current_quantity:  10, storage_location: 'Warehouse maintenance bay – flammables cabinet',    supplier_name: 'Chem-Supply Australia',      sds_issue_date: '2024-06-01', sds_review_date: '2029-06-01', is_active: true, created_by: adminId },
  ], 'chemicals (4)')

  // ============================================================
  // PHASE 8 — JSA, Permits, Risks
  // ============================================================
  console.log('\nPhase 8 — JSA / JHA')

  const jsa1 = crypto.randomUUID()
  const jsa2 = crypto.randomUUID()

  await ins('jsas', [
    { id: jsa1, organisation_id: orgId, title: 'Scaffolding Erection – Level 4 Building Facade', job_description: 'Erect and dismantle system scaffolding on north facade', location: 'North Zone – Building Facade', site_id: sCSId, status: 'approved', revision_number: 1, prepared_by: hseId, approved_by: hseId, approved_at: '2026-04-01T09:00:00Z', valid_from: '2026-04-01', valid_until: '2026-07-31', created_by: hseId },
    { id: jsa2, organisation_id: orgId, title: 'Excavation Work – Foundation Trenches',          job_description: 'Machine and manual excavation for foundation trenches to 3m depth', location: 'South Zone – Foundation area', site_id: sCSId, status: 'approved', revision_number: 1, prepared_by: hseId, approved_by: hseId, approved_at: '2026-05-01T09:00:00Z', valid_from: '2026-05-01', valid_until: '2026-08-31', created_by: hseId },
  ], 'jsas (2)')

  const jsaS1 = crypto.randomUUID()
  const jsaS2 = crypto.randomUUID()
  const jsaS3 = crypto.randomUUID()

  await ins('jsa_steps', [
    { id: jsaS1, jsa_id: jsa1, step_number: 1, description: 'Conduct pre-task inspection of scaffold components and tools' },
    { id: jsaS2, jsa_id: jsa1, step_number: 2, description: 'Erect base plates and standards at ground level' },
    { id: jsaS3, jsa_id: jsa2, step_number: 1, description: 'Mark out trench alignment and check for underground services via Dial Before You Dig' },
  ], 'jsa_steps (3)')

  const jsaH1 = crypto.randomUUID()
  const jsaH2 = crypto.randomUUID()

  await ins('jsa_step_hazards', [
    { id: jsaH1, step_id: jsaS1, hazard_description: 'Damaged or defective scaffold components causing structural failure', hazard_type: 'mechanical',   likelihood: 2, consequence: 5 },
    { id: jsaH2, step_id: jsaS3, hazard_description: 'Striking underground utility services (gas, electrical, telecom)',    hazard_type: 'environmental', likelihood: 2, consequence: 5 },
  ], 'jsa_step_hazards (2)')

  // Permits
  console.log('\nPhase 8b — Permits to Work')

  const ptHot  = await fid('permit_types',    'code', 'hot_work')
  const ptCS   = await fid('permit_types',    'code', 'confined_space')
  const ptHgt  = await fid('permit_types',    'code', 'working_at_heights')
  const psDraft= await fid('permit_statuses', 'code', 'draft')
  const psAct  = await fid('permit_statuses', 'code', 'active')
  const psClosed=await fid('permit_statuses', 'code', 'closed')

  const perm1 = crypto.randomUUID()
  const perm2 = crypto.randomUUID()
  const perm3 = crypto.randomUUID()

  await ins('permits', [
    { id: perm1, organisation_id: orgId, site_id: sCSId, department_id: dConsCS, work_area_id: waSouthId, permit_type_id: ptHot,  status_id: psAct,   title: 'Hot Work – Structural Steel Welding',           work_description: 'Welding structural steel for Level 2 floor framing', exact_location: 'South Zone – Grid lines D4–D8', valid_from: '2026-06-09T07:00:00Z', valid_until: '2026-06-09T17:00:00Z', applicant_id: supId,  responsible_person_id: supId,  created_by: supId },
    { id: perm2, organisation_id: orgId, site_id: sCSId, department_id: dMaiCS,                           permit_type_id: ptCS,   status_id: psClosed, title: 'Confined Space Entry – Stormwater Pit Inspection', work_description: 'CCTV inspection and minor repairs in stormwater pit', exact_location: 'North Zone – Stormwater Pit SP-03', valid_from: '2026-05-20T08:00:00Z', valid_until: '2026-05-20T14:00:00Z', applicant_id: hseId,  responsible_person_id: hseId,  work_completed_at: '2026-05-20T13:30:00Z', closure_notes: 'Inspection complete. Crack in pit wall noted for next dry season.', created_by: hseId },
    { id: perm3, organisation_id: orgId, site_id: sCSId, department_id: dConsCS, work_area_id: waNorthId, permit_type_id: ptHgt,  status_id: psDraft,  title: 'Working at Heights – Facade Retention Anchors',   work_description: 'Installation of facade retention anchors at Level 6 – 18m height', exact_location: 'North Zone – Building facade levels 5–6', valid_from: '2026-06-15T07:00:00Z', valid_until: '2026-06-15T17:00:00Z', applicant_id: supId,  responsible_person_id: supId,  created_by: supId },
  ], 'permits (3)')

  // Risks
  console.log('\nPhase 8c — Risk Register')

  const rcPhys = await fid('risk_categories', 'code', 'physical')
  const rcChem = await fid('risk_categories', 'code', 'chemical')
  const rcMech = await fid('risk_categories', 'code', 'mechanical')
  const rcErgo = await fid('risk_categories', 'code', 'ergonomic')

  const r1 = crypto.randomUUID()
  const r2 = crypto.randomUUID()
  const r3 = crypto.randomUUID()
  const r4 = crypto.randomUUID()

  await ins('risks', [
    { id: r1, organisation_id: orgId, site_id: sCSId, department_id: dConsCS, work_area_id: waNorthId, category_id: rcPhys, title: 'Working at Heights – Fall from Scaffold',       hazard_description: 'Workers on scaffold above 2m without adequate fall protection could sustain fatal injuries from a fall', location_activity: 'Scaffolding on building facade – all levels above 2m', people_at_risk: ['workers','supervisors'],           likelihood_score: 3, consequence_score: 5, existing_controls_summary: 'Edge protection on all scaffold levels; mandatory harness above 4m; daily scaffold inspection', residual_likelihood_score: 2, residual_consequence_score: 5, owner_id: hseId,  review_frequency: 'quarterly', next_review_date: '2026-09-09', status: 'active', created_by: hseId },
    { id: r2, organisation_id: orgId, site_id: sCSId, department_id: dConsCS,                          category_id: rcChem, title: 'Chemical Exposure – Concrete Dust (Silica)',    hazard_description: 'Inhalation of respirable crystalline silica from cutting and grinding can cause silicosis – progressive, irreversible lung disease', location_activity: 'Concrete cutting and drilling tasks across site', people_at_risk: ['workers','contractors','nearby_workers'], likelihood_score: 4, consequence_score: 4, existing_controls_summary: 'Wet cutting methods; P2 respirator requirement; respiratory surveillance program', residual_likelihood_score: 2, residual_consequence_score: 4, owner_id: hseId,  review_frequency: 'quarterly', next_review_date: '2026-09-09', status: 'active', created_by: hseId },
    { id: r3, organisation_id: orgId, site_id: sWHId, department_id: dOpsWH,  work_area_id: waFloorId, category_id: rcMech, title: 'Forklift – Pedestrian Collision in Warehouse',  hazard_description: 'Forklift operations could result in collision with pedestrians, causing serious or fatal injuries', location_activity: 'All forklift operating zones in warehouse', people_at_risk: ['workers','visitors','contractors'],       likelihood_score: 3, consequence_score: 4, existing_controls_summary: 'Designated pedestrian walkways; speed limits; spotter requirement for blind corners; pre-start checks', residual_likelihood_score: 2, residual_consequence_score: 4, owner_id: adminId, review_frequency: 'quarterly', next_review_date: '2026-09-09', status: 'active', created_by: adminId },
    { id: r4, organisation_id: orgId, site_id: sCSId, department_id: dConsCS,                          category_id: rcErgo, title: 'Manual Handling – Reinforcing Steel',            hazard_description: 'Repetitive manual handling of heavy reinforcing steel may cause musculoskeletal injuries', location_activity: 'All manual handling tasks on construction site', people_at_risk: ['workers'],                                 likelihood_score: 4, consequence_score: 3, existing_controls_summary: 'Team lifting protocols; mechanical assist; manual handling training; task rotation', residual_likelihood_score: 2, residual_consequence_score: 3, owner_id: supId,  review_frequency: 'annually',  next_review_date: '2027-06-09', status: 'active', created_by: hseId },
  ], 'risks (4)')

  await ins('risk_controls', [
    { risk_id: r1, organisation_id: orgId, control_type: 'engineer', description: 'Install compliant scaffold edge protection (toeboard + mid-rail + top-rail) on all scaffold lifts', is_implemented: true, implementation_date: '2026-04-01', assigned_to: supId,  effectiveness_rating: 4, created_by: hseId },
    { risk_id: r1, organisation_id: orgId, control_type: 'ppe',      description: 'Full-body harness with double-action lanyard mandatory for all work above 4m. Harnesses inspected pre-use.', is_implemented: true, implementation_date: '2026-04-01', assigned_to: supId, effectiveness_rating: 4, created_by: hseId },
    { risk_id: r2, organisation_id: orgId, control_type: 'engineer', description: 'Wet cutting/grinding for all concrete work. No dry cut permitted.', is_implemented: true, implementation_date: '2026-03-01', assigned_to: hseId,  effectiveness_rating: 5, created_by: hseId },
    { risk_id: r2, organisation_id: orgId, control_type: 'ppe',      description: 'P2 respirator required for all concrete cutting and grinding. Fit-tested respirators in use.', is_implemented: true, implementation_date: '2026-03-01', assigned_to: supId, effectiveness_rating: 4, created_by: hseId },
    { risk_id: r3, organisation_id: orgId, control_type: 'admin',    description: 'Pedestrian walkways marked with yellow paint and barriers. Forklift exclusion zones during peak pedestrian times.', is_implemented: true, implementation_date: '2026-01-15', assigned_to: adminId, effectiveness_rating: 4, created_by: adminId },
    { risk_id: r4, organisation_id: orgId, control_type: 'admin',    description: 'Manual handling risk assessment for all tasks over 16kg. Team lift protocols for loads over 20kg.', is_implemented: true, implementation_date: '2026-02-01', assigned_to: supId, effectiveness_rating: 3, created_by: hseId },
  ], 'risk_controls (6)')

  // ============================================================
  // PHASE 9 — Inspections & Audits
  // ============================================================
  console.log('\nPhase 9 — Inspections')

  const itSite = await fid('inspection_types', 'code', 'site_walkthrough')
  const itEquip= await fid('inspection_types', 'code', 'equipment_prestart')

  const tmpl1 = crypto.randomUUID()
  const tmpl2 = crypto.randomUUID()

  await ins('inspection_templates', [
    { id: tmpl1, organisation_id: orgId, inspection_type_id: itSite,  name: 'Construction Site Walkthrough',  description: 'General safety walkthrough of the construction site',   is_published: true, version: 1, passing_score_threshold: 75.00, estimated_duration_minutes:  45, created_by: hseId },
    { id: tmpl2, organisation_id: orgId, inspection_type_id: itEquip, name: 'Equipment Pre-Start Check',      description: 'Pre-operational safety check for heavy plant and machinery', is_published: true, version: 1, passing_score_threshold: 90.00, estimated_duration_minutes: 15, created_by: hseId },
  ], 'inspection_templates (2)')

  const sec1 = crypto.randomUUID()
  await sb.from('inspection_template_sections').insert({ id: sec1, template_id: tmpl1, title: 'General Site Conditions', order_index: 0 })

  const q1 = crypto.randomUUID()
  const q2 = crypto.randomUUID()
  const q3 = crypto.randomUUID()

  await ins('inspection_template_questions', [
    { id: q1, template_id: tmpl1, section_id: sec1, question_text: 'Are all work areas free from trip hazards and obstacles?', question_type: 'pass_fail', is_required: true,  is_scored: true,  weight: 1, action_required_on_fail: true,  suggested_action: 'Clear hazards immediately', order_index: 0 },
    { id: q2, template_id: tmpl1, section_id: sec1, question_text: 'Is adequate PPE being worn by all personnel on site?',     question_type: 'pass_fail', is_required: true,  is_scored: true,  weight: 2, action_required_on_fail: true,  suggested_action: 'Issue PPE and document non-compliance', order_index: 1 },
    { id: q3, template_id: tmpl1, section_id: sec1, question_text: 'Overall site safety observations',                         question_type: 'text',      is_required: false, is_scored: false, weight: 1, action_required_on_fail: false, order_index: 2 },
  ], 'inspection_template_questions (3)')

  const insp1 = crypto.randomUUID()
  const insp2 = crypto.randomUUID()
  const insp3 = crypto.randomUUID()

  await ins('inspections', [
    { id: insp1, organisation_id: orgId, site_id: sCSId, department_id: dSafCS,  work_area_id: waNorthId, template_id: tmpl1, inspection_type_id: itSite,  conducted_by: hseId,  started_at: '2026-06-05T08:00:00Z', completed_at: '2026-06-05T09:00:00Z', submitted_at: '2026-06-05T09:15:00Z', submitted_by: hseId,  status: 'submitted', result: 'conditional_pass', score: 83.33, total_questions: 3, required_questions: 2, answered_questions: 3, failed_questions: 1, is_overdue: false, has_open_actions: false, notes: 'One PPE issue observed – addressed on the spot. Site in good order.', created_by: hseId },
    { id: insp2, organisation_id: orgId, site_id: sWHId,                          asset_id: aFork,         template_id: tmpl2, inspection_type_id: itEquip, conducted_by: supId,  started_at: '2026-06-09T07:00:00Z', completed_at: '2026-06-09T07:15:00Z', submitted_at: '2026-06-09T07:20:00Z', submitted_by: supId,  status: 'submitted', result: 'pass',             score: 100.00, total_questions: 0, required_questions: 0, answered_questions: 0, failed_questions: 0, is_overdue: false, has_open_actions: false, notes: 'Forklift in good condition. All fluid levels correct.', created_by: supId },
    { id: insp3, organisation_id: orgId, site_id: sCSId, template_id: tmpl1, inspection_type_id: itSite, status: 'scheduled', total_questions: 0, required_questions: 0, answered_questions: 0, failed_questions: 0, is_overdue: false, has_open_actions: false, created_by: hseId },
  ], 'inspections (3)')

  await ins('inspection_responses', [
    { inspection_id: insp1, question_id: q1, organisation_id: orgId, response_value: 'pass', is_failed: false, notes: 'All walkways clear. Waste skips were full but cleared during inspection.', created_by: hseId },
    { inspection_id: insp1, question_id: q2, organisation_id: orgId, response_value: 'fail', is_failed: true,  notes: 'Two workers near concrete pour not wearing safety glasses. Corrected on site.', created_by: hseId },
    { inspection_id: insp1, question_id: q3, organisation_id: orgId, response_value: null,   is_failed: false, notes: 'Good overall site conditions. Lunch area needs additional shade cloth.', created_by: hseId },
  ], 'inspection_responses (3)')

  console.log('\nPhase 9b — Audits')

  const atInt  = await fid('audit_types', 'code', 'internal_safety')
  const atComp = await fid('audit_types', 'code', 'compliance')
  const afoConf= await fid('audit_finding_outcomes', 'code', 'conformance')
  const afoMnNC= await fid('audit_finding_outcomes', 'code', 'minor_nc')
  const afoObs = await fid('audit_finding_outcomes', 'code', 'observation')

  const aud1 = crypto.randomUUID()
  const aud2 = crypto.randomUUID()

  await ins('audits', [
    { id: aud1, organisation_id: orgId, audit_type_id: atInt,  title: 'Annual Internal WHS Management System Audit 2026', scope: 'Full WHS management system – incidents, training, risk management, contractor management', objectives: 'Assess conformance with WHS Act 2011 and internal procedures; identify improvement areas', standard_reference: 'AS/NZS ISO 45001:2018', site_ids: [sHQId, sCSId, sWHId], lead_auditor_id: hseId, auditor_ids: [adminId], auditee_ids: [], planned_start_date: '2026-05-01', planned_end_date: '2026-05-15', actual_start_date: '2026-05-02', actual_end_date: '2026-05-14', status: 'completed', total_criteria: 3, assessed_criteria: 3, conformance_count: 1, minor_nc_count: 1, major_nc_count: 0, observation_count: 1, ofi_count: 0, overall_rating: 'Satisfactory', executive_summary: 'WHS management system generally well-implemented. One minor NC relating to contractor induction records.', created_by: hseId },
    { id: aud2, organisation_id: orgId, audit_type_id: atComp, title: 'Construction Site Compliance Audit – Q2 2026', scope: 'Compliance with SafeWork NSW permit conditions and WHS Regulation 2017', objectives: 'Verify PCBU duty of care, high-risk work licences, and permit conditions', standard_reference: 'WHS Regulation 2017', site_ids: [sCSId], lead_auditor_id: adminId, auditor_ids: [], auditee_ids: [], planned_start_date: '2026-06-15', planned_end_date: '2026-06-30', status: 'in_progress', total_criteria: 0, assessed_criteria: 0, conformance_count: 0, minor_nc_count: 0, major_nc_count: 0, observation_count: 0, ofi_count: 0, created_by: adminId },
  ], 'audits (2)')

  const asec1 = crypto.randomUUID()
  const asec2 = crypto.randomUUID()

  await ins('audit_sections', [
    { id: asec1, audit_id: aud1, organisation_id: orgId, title: 'Incident Management', order_index: 0 },
    { id: asec2, audit_id: aud1, organisation_id: orgId, title: 'Training & Competency', order_index: 1 },
  ], 'audit_sections (2)')

  const ac1 = crypto.randomUUID()
  const ac2 = crypto.randomUUID()
  const ac3 = crypto.randomUUID()

  await ins('audit_criteria', [
    { id: ac1, audit_id: aud1, section_id: asec1, organisation_id: orgId, reference_number: '6.1.3', criterion_text: 'Organisation has a documented and implemented incident reporting procedure accessible to all workers', order_index: 0 },
    { id: ac2, audit_id: aud1, section_id: asec1, organisation_id: orgId, reference_number: '6.1.4', criterion_text: 'All incidents are investigated and CAPAs are tracked to closure', order_index: 1 },
    { id: ac3, audit_id: aud1, section_id: asec2, organisation_id: orgId, reference_number: '7.2.1', criterion_text: 'Contractor induction records are current and accessible for all contractors on site', order_index: 0 },
  ], 'audit_criteria (3)')

  await ins('audit_findings', [
    { audit_id: aud1, criterion_id: ac1, outcome_id: afoConf, organisation_id: orgId, finding_text: 'Incident reporting procedure documented in Safety Policy Section 4.2. 12 incidents reported in 2026 YTD via platform.', assessed_by: hseId, assessed_at: '2026-05-08T10:00:00Z' },
    { audit_id: aud1, criterion_id: ac2, outcome_id: afoObs,  organisation_id: orgId, finding_text: 'Three open CAPAs from incidents are approaching due dates. Recommend formalising an escalation process.', recommendation: 'Implement automated reminders and escalation for CAPAs approaching due date.', assessed_by: hseId, assessed_at: '2026-05-08T10:30:00Z' },
    { audit_id: aud1, criterion_id: ac3, outcome_id: afoMnNC, organisation_id: orgId, finding_text: 'Two BuildRight contractors on site without current induction records in the system. Records held in paper form only.', root_cause: 'Induction records not transferred to digital system.', recommendation: 'Upload all contractor records within 30 days. Implement mandatory digital registration.', assessed_by: hseId, assessed_at: '2026-05-10T14:00:00Z' },
  ], 'audit_findings (3)')

  // ============================================================
  // PHASE 10 — Incidents, Investigations, Hazards, Actions
  // ============================================================
  console.log('\nPhase 10 — Incidents')

  const itInj  = await fid('incident_types', 'code', 'injury_illness')
  const itNM   = await fid('incident_types', 'code', 'near_miss')
  const itProp = await fid('incident_types', 'code', 'property_equipment')
  const sevSer = await fid('severity_levels', 'level_number', 3)
  const sevMod = await fid('severity_levels', 'level_number', 2)
  const sevMin = await fid('severity_levels', 'level_number', 1)

  const inc1 = crypto.randomUUID()
  const inc2 = crypto.randomUUID()
  const inc3 = crypto.randomUUID()

  await ins('incidents', [
    { id: inc1, organisation_id: orgId, site_id: sCSId, department_id: dConsCS, work_area_id: waSouthId, incident_type_id: itInj,  severity_level_id: sevSer, title: 'Laceration – Hand Injury on Reinforcing Steel',    description: 'Worker sustained a deep laceration to the left hand while positioning reinforcing steel bar. The cut rebar end was exposed and not protected. Worker transported to Gosford Hospital for sutures.', incident_date: '2026-05-22', incident_time: '10:35', exact_location: 'South Zone – Footing pour area, Grid D6', immediate_actions_taken: 'First aid applied. Ambulance called. Area cordoned off pending investigation.', was_injury_involved: true, regulatory_reportable: true, regulatory_due_date: '2026-05-24', status: 'closed',              submitted_by: supId,   submitted_at: '2026-05-22T11:00:00Z', triaged_by: hseId,   triaged_at: '2026-05-22T12:00:00Z', assigned_to: hseId,  assigned_at: '2026-05-22T12:30:00Z', closed_by: adminId, closed_at: '2026-06-05T09:00:00Z', closure_notes: 'CAPAs complete. Cut-resistant gloves issued. Rebar end caps installed.', created_by: supId },
    { id: inc2, organisation_id: orgId, site_id: sCSId, department_id: dConsCS, work_area_id: waNorthId, incident_type_id: itNM,   severity_level_id: sevMod, title: 'Near Miss – Falling Object from Level 3 Scaffold',  description: 'A scaffold swivel coupler (approx 1.2 kg) fell from Level 3 scaffold and landed in the pedestrian exclusion zone below. No persons were present at the time. Fitting not properly secured after previous day\'s work.', incident_date: '2026-05-29', incident_time: '08:15', exact_location: 'North Zone – Below Level 3 scaffold, north facade', immediate_actions_taken: 'Area barricaded. All scaffold fittings inspected. Toolbox talk held with scaffold crew.', was_injury_involved: false, regulatory_reportable: false, status: 'under_investigation', submitted_by: supId,   submitted_at: '2026-05-29T08:30:00Z', triaged_by: hseId,   triaged_at: '2026-05-29T09:00:00Z', assigned_to: hseId,  assigned_at: '2026-05-29T09:30:00Z', created_by: supId },
    { id: inc3, organisation_id: orgId, site_id: sWHId, department_id: dOpsWH,  work_area_id: waFloorId, incident_type_id: itProp, severity_level_id: sevMin, title: 'Vehicle Damage – Forklift Struck Warehouse Racking', description: 'Forklift operator clipped end of racking bay while reversing, bending the upright post. Racking unloaded. Structural engineer inspection booked.', incident_date: '2026-06-02', incident_time: '14:50', exact_location: 'Warehouse Main Floor – Racking Row C, Bay 12', immediate_actions_taken: 'Forklift stopped. Adjacent racking bays unloaded. Structural engineer inspection scheduled.', was_injury_involved: false, regulatory_reportable: false, status: 'triaged', submitted_by: supId, submitted_at: '2026-06-02T15:00:00Z', triaged_by: adminId, triaged_at: '2026-06-02T16:00:00Z', created_by: supId },
  ], 'incidents (3)')

  // Investigation
  const inv1 = crypto.randomUUID()

  await ins('investigations', [
    { id: inv1, incident_id: inc1, organisation_id: orgId, investigator_id: hseId, status: 'complete', rca_method: 'five_whys', start_date: '2026-05-22', target_completion_date: '2026-06-05', actual_completion_date: '2026-06-04', background: 'Worker positioning rebar for a footing pour. Standard work gloves worn. Cut end of rebar left exposed without protective end cap.', investigation_summary: 'Root cause: failure to implement rebar end cap requirement from the SWMS. Contributing: inadequate supervisor oversight; end caps unavailable at point of use.', lessons_learned: 'Rebar end cap compliance must be verified during pre-pour inspections. Cut-resistant gloves mandatory for all rebar handling.', created_by: hseId },
  ], 'investigations (1)')

  await ins('rca_five_whys', [
    { investigation_id: inv1, organisation_id: orgId, problem_statement: 'Worker sustained laceration from exposed rebar end while manually placing reinforcing steel', why_1: 'Why did the worker contact the exposed rebar end?', because_1: 'The rebar end was not protected with an end cap', why_2: 'Why was the rebar end not protected?', because_2: 'End caps were not available at the point of use', why_3: 'Why were end caps not available?', because_3: 'End caps were stored in the materials shed and not restocked to the work area', why_4: 'Why were end caps not restocked?', because_4: 'There is no process for restocking consumable safety materials to point-of-use', identified_root_cause: 'No process exists to ensure safety consumables are available at point-of-use. The SWMS requirement to use end caps was not supported by a materials management process.', created_by: hseId },
  ], 'rca_five_whys (1)')

  // Hazard reports
  console.log('\nPhase 10b — Hazard Reports')

  await ins('hazard_reports', [
    { organisation_id: orgId, site_id: sWHId, department_id: dOpsWH, work_area_id: waFloorId, title: 'Slippery Floor Near Loading Dock',             description: 'Water pooling on the loading dock floor creates a slip hazard – condensation forms each morning. No anti-slip matting. Several near-slip events have occurred.', location_details: 'Loading dock – roller door entry, 3m × 5m area', severity_perception: 'high', reported_by: workerId, reported_at: '2026-06-01T07:30:00Z', status: 'under_review' },
    { organisation_id: orgId, site_id: sCSId, department_id: dMaiCS,  work_area_id: waNorthId, title: 'Exposed Electrical Wiring – Temporary Site Power', description: 'Exposed LV wiring at temporary DB board in north zone. Insulation damaged approx 500mm from the board. Risk of electric shock if contact made.',          location_details: 'North Zone – Temporary DB board at grid C2',           severity_perception: 'high', reported_by: supId,    reported_at: '2026-06-03T09:00:00Z', status: 'actioned',     reviewed_by: hseId, reviewed_at: '2026-06-03T10:00:00Z', review_notes: 'Immediate action required.', action_taken: 'Electrician called immediately. Temporary DB isolated. Cabling replaced same day.' },
    { organisation_id: orgId, site_id: sCSId, department_id: dSafCS,                           title: 'Inadequate Lighting in Stairwell Access',          description: 'Temporary stairwell on south side has inadequate lighting for early morning and evening access. Lux levels below construction minimum.',                  location_details: 'South Zone – Temporary stairwell, west side',           severity_perception: 'medium', reported_by: workerId, reported_at: '2026-06-05T06:45:00Z', status: 'submitted' },
  ], 'hazard_reports (3)')

  // Actions (CAPA)
  console.log('\nPhase 10c — Actions (CAPA)')

  const act1 = crypto.randomUUID()
  const act2 = crypto.randomUUID()
  const act3 = crypto.randomUUID()
  const act4 = crypto.randomUUID()

  await ins('actions', [
    { id: act1, organisation_id: orgId, site_id: sCSId, department_id: dConsCS, action_type: 'corrective', priority: 'high',     source_type: 'incident', source_id: inc1, source_reference: 'Laceration Incident May 2026',        title: 'Issue Cut-Resistant Gloves to All Rebar Workers',          description: 'Procure and issue Level C cut-resistant gloves to all rebar workers. Amend SWMS to mandate cut-resistant gloves.', assigned_to: adminId,  assigned_by: hseId,  assigned_at: '2026-05-23T09:00:00Z', due_date: '2026-05-30', status: 'verified',     verification_required: true, is_bulk_closed: false, verification_assigned_to: hseId,    completion_notes: 'Level C gloves issued to all 8 rebar workers. SWMS updated.', completed_at: '2026-05-28T16:00:00Z', completed_by: adminId,  verified_at: '2026-05-30T10:00:00Z', verified_by: hseId,  verification_notes: 'Physical check confirms gloves in use. SWMS amendment approved.', created_by: hseId },
    { id: act2, organisation_id: orgId, site_id: sCSId, department_id: dConsCS, action_type: 'corrective', priority: 'high',     source_type: 'incident', source_id: inc1, source_reference: 'Laceration Incident May 2026',        title: 'Install Rebar End Caps – Implement Restocking Process',    description: 'Install end caps on all exposed rebar site-wide. Implement daily restocking to ensure end caps at all active work areas.', assigned_to: supId,    assigned_by: hseId,  assigned_at: '2026-05-23T09:00:00Z', due_date: '2026-06-05', status: 'closed',       verification_required: true, is_bulk_closed: false, verification_assigned_to: hseId,    completion_notes: 'All exposed rebar capped. Restocking checklist implemented.', completed_at: '2026-06-04T15:00:00Z', completed_by: supId,    verified_at: '2026-06-05T09:00:00Z', verified_by: hseId,  created_by: hseId },
    { id: act3, organisation_id: orgId, site_id: sCSId, department_id: dConsCS, action_type: 'corrective', priority: 'critical', source_type: 'incident', source_id: inc2, source_reference: 'Near Miss – Falling Object May 2026', title: 'Full Scaffold Inspection – Secure All Fittings',           description: 'Inspect all scaffold fittings on all levels. Tighten or replace all loose fittings. Implement pre-shift scaffold inspection checklist.', assigned_to: hseId,    assigned_by: adminId, assigned_at: '2026-05-29T10:00:00Z', due_date: '2026-06-02', status: 'completed',    verification_required: false, is_bulk_closed: false, completion_notes: 'Full inspection completed over 2 days. 14 fittings re-tightened. Pre-shift checklist implemented.', completed_at: '2026-05-31T17:00:00Z', completed_by: hseId, created_by: adminId },
    { id: act4, organisation_id: orgId, site_id: sCSId, department_id: dSafCS,  action_type: 'corrective', priority: 'medium',   source_type: 'audit',    source_id: aud1, source_reference: 'Annual WHS Audit 2026',            title: 'Upload All Contractor Induction Records to Platform',      description: 'Upload paper induction records for BuildRight and all active contractors. Implement mandatory digital registration for future inductions.', assigned_to: adminId,  assigned_by: hseId,  assigned_at: '2026-05-16T09:00:00Z', due_date: '2026-06-16', status: 'in_progress',  verification_required: false, is_bulk_closed: false, created_by: hseId },
  ], 'actions (4)')

  // ============================================================
  // PHASE 11 — Contractors & Emergency
  // ============================================================
  console.log('\nPhase 11 — Contractors')

  const cc1 = crypto.randomUUID()
  const cc2 = crypto.randomUUID()

  await ins('contractor_companies', [
    { id: cc1, organisation_id: orgId, company_name: 'BuildRight Pty Ltd',       abn: '12 345 678 901', primary_contact_name: 'Greg Harrigan',   primary_contact_email: 'greg@buildright.com.au',  primary_contact_phone: '0412 345 678', address: '8 Enterprise Court, Gosford NSW 2250',       prequalification_status: 'approved',              prequalification_expiry: '2027-01-31', notes: 'Primary scaffold and formwork subcontractor. Pre-qualified since 2024.', is_active: true, created_by: adminId },
    { id: cc2, organisation_id: orgId, company_name: 'ElecSafe Services Pty Ltd', abn: '98 765 432 109', primary_contact_name: 'Maria Kowalski',   primary_contact_email: 'maria@elecsafe.com.au',   primary_contact_phone: '0437 876 543', address: '22 Power Street, Parramatta NSW 2150',        prequalification_status: 'conditionally_approved', prequalification_expiry: '2026-12-31', notes: 'Electrical contractor. Conditionally approved – public liability cert expires Aug 2026.', is_active: true, created_by: adminId },
  ], 'contractor_companies (2)')

  const cw1 = crypto.randomUUID()
  const cw2 = crypto.randomUUID()
  const cw3 = crypto.randomUUID()

  await ins('contractor_workers', [
    { id: cw1, contractor_id: cc1, organisation_id: orgId, first_name: 'Tom',    last_name: 'Bridgeman', email: 'tom.bridgeman@buildright.com.au',  phone: '0411 111 001', role: 'Leading Hand – Scaffold', is_active: true, induction_status: 'inducted',     inducted_at: '2026-03-15T09:00:00Z', created_by: adminId },
    { id: cw2, contractor_id: cc1, organisation_id: orgId, first_name: 'Jake',   last_name: 'Morrison',  email: 'jake.morrison@buildright.com.au',   phone: '0411 111 002', role: 'Scaffolder',              is_active: true, induction_status: 'not_inducted', created_by: adminId },
    { id: cw3, contractor_id: cc2, organisation_id: orgId, first_name: 'Sandra', last_name: 'Park',       email: 'sandra.park@elecsafe.com.au',       phone: '0422 987 654', role: 'Licensed Electrician',    is_active: true, induction_status: 'inducted',     inducted_at: '2026-04-10T08:00:00Z', created_by: adminId },
  ], 'contractor_workers (3)')

  await ins('contractor_site_access_log', [
    { organisation_id: orgId, contractor_worker_id: cw1, site_id: sCSId, sign_in_at: '2026-06-09T07:10:00Z', purpose: 'Scaffold erection – north facade level 5', signed_in_by: supId },
    { organisation_id: orgId, contractor_worker_id: cw3, site_id: sCSId, sign_in_at: '2026-06-03T08:00:00Z', sign_out_at: '2026-06-03T14:30:00Z', purpose: 'Emergency repair – temporary DB board cable replacement', signed_in_by: hseId },
  ], 'contractor_site_access_log (2)')

  // Emergency
  console.log('\nPhase 11b — Emergency')

  // Seed emergency_types if not already present
  // Upsert global emergency_types — idempotent across re-seeds
  const { error: etErr } = await sb.from('emergency_types').upsert([
    { name: 'Fire',               colour_code: '#da1e28', display_order: 1 },
    { name: 'Bomb Threat',        colour_code: '#8d0101', display_order: 2 },
    { name: 'Medical Emergency',  colour_code: '#0f62fe', display_order: 3 },
    { name: 'Chemical Spill',     colour_code: '#f1c21b', display_order: 4 },
    { name: 'Natural Disaster',   colour_code: '#6929c4', display_order: 5 },
    { name: 'Workplace Violence', colour_code: '#9f1853', display_order: 6 },
  ], { onConflict: 'name', ignoreDuplicates: true })
  if (etErr) die('upsert emergency_types', etErr)
  const etFireId = await fid('emergency_types', 'name', 'Fire')
  console.log('  ✓ emergency_types')

  const erp1 = crypto.randomUUID()

  await ins('emergency_response_plans', [
    { id: erp1, organisation_id: orgId, title: 'Fire Emergency Response Plan – Construction Site', emergency_type_id: etFireId, site_id: sCSId, description: 'Comprehensive fire emergency procedures for the Northern Construction Site – evacuation routes, muster points, and warden responsibilities.', status: 'active', version_number: '1.2', last_reviewed_date: '2026-03-01', next_review_date: '2027-03-01', approved_by: adminId, created_by: adminId },
  ], 'emergency_response_plans (1)')

  await ins('muster_points', [
    { organisation_id: orgId, site_id: sCSId, name: 'Muster Point A – Main Gate',     description: 'Primary assembly area adjacent to main site entry', location_description: 'North of site entry gate, Pacific Highway verge', capacity: 80, is_primary: true },
    { organisation_id: orgId, site_id: sCSId, name: 'Muster Point B – Car Park',      description: 'Secondary assembly area in staff car park', location_description: 'Staff car park east end – away from site buildings', capacity: 40, is_primary: false },
    { organisation_id: orgId, site_id: sWHId, name: 'Muster Point WH – Street Front', description: 'Warehouse emergency assembly area', location_description: 'Industrial Drive frontage, 20m west of entrance', capacity: 60, is_primary: true },
  ], 'muster_points (3)')

  await ins('emergency_wardens', [
    { organisation_id: orgId, site_id: sCSId, worker_id: hseId,    warden_type: 'chief_warden',    area: 'Full site',                          is_active: true },
    { organisation_id: orgId, site_id: sCSId, worker_id: supId,    warden_type: 'area_warden',     area: 'Construction zone – north and south', is_active: true },
    { organisation_id: orgId, site_id: sCSId, worker_id: workerId, warden_type: 'first_aid_officer', area: 'Site-wide',                          is_active: true },
  ], 'emergency_wardens (3)')

  await ins('emergency_drills', [
    { organisation_id: orgId, plan_id: erp1, site_id: sCSId, title: 'Q1 2026 Evacuation Drill',          scheduled_date: '2026-03-15', actual_date: '2026-03-15', status: 'completed', drill_type: 'evacuation', participants_count: 34, duration_minutes: 8,  outcomes: 'All personnel accounted at Muster Point A within 8 minutes. No issues with routes.', findings: 'Muster Point A sign partially obscured by scaffold material. Rectified immediately.', created_by: hseId },
    { organisation_id: orgId, plan_id: erp1, site_id: sCSId, title: 'Q3 2026 Evacuation Drill (Planned)', scheduled_date: '2026-09-15',                           status: 'scheduled',  drill_type: 'evacuation', created_by: hseId },
  ], 'emergency_drills (2)')

  // ============================================================
  // PHASE 12 — Environment, Toolbox Talks, Speak-Up, Fatigue
  // ============================================================
  console.log('\nPhase 12 — Environmental Monitoring')

  const epNoise  = await fid('env_parameter_types', 'code', 'noise_level')
  const epDust   = await fid('env_parameter_types', 'code', 'dust_pm10')
  const unitDbA  = await fid('env_measurement_units', 'code', 'dB_A')
  const unitMgm3 = await fid('env_measurement_units', 'code', 'mg_m3')

  const station1 = crypto.randomUUID()
  await ins('env_monitoring_stations', [
    { id: station1, organisation_id: orgId, site_id: sCSId, name: 'Site Boundary – North Noise Monitor', station_code: 'NM-CS-N01', description: 'Boundary noise monitoring at northern site fence', location_details: 'Northern site boundary fence, 5m from Pacific Highway', station_type: 'manual', parameter_type_ids: [] },
  ], 'env_monitoring_stations (1)')

  await ins('env_monitoring_records', [
    { organisation_id: orgId, site_id: sCSId, station_id: station1, parameter_type_id: epNoise, unit_id: unitDbA,  measured_value: 78.3,  measured_at: '2026-06-05T10:00:00Z', measurement_method: 'manual', exceeds_limit: false, investigation_required: false },
    { organisation_id: orgId, site_id: sCSId,                        parameter_type_id: epDust,  unit_id: unitMgm3, measured_value:  0.045, measured_at: '2026-06-05T10:15:00Z', measurement_method: 'manual', exceeds_limit: false, investigation_required: false },
    { organisation_id: orgId, site_id: sCSId, station_id: station1, parameter_type_id: epNoise, unit_id: unitDbA,  measured_value: 85.1,  measured_at: '2026-06-07T14:00:00Z', measurement_method: 'manual', exceeds_limit: true,  limit_reference: 'EPA NSW Noise Policy 85 dB(A) daytime limit', investigation_required: true, corrective_action: 'Investigate noise source. Schedule high-noise work outside sensitive hours.' },
  ], 'env_monitoring_records (3)')

  // Toolbox Talks
  console.log('\nPhase 12b — Toolbox Talks')

  // Upsert global (non-org-scoped) toolbox categories — idempotent across re-seeds
  const { error: ttCatErr } = await sb.from('toolbox_talk_categories').upsert([
    { name: 'Heat & Environment',  colour_code: '#f1c21b', display_order: 1 },
    { name: 'Respiratory Health',  colour_code: '#da1e28', display_order: 2 },
    { name: 'Manual Handling',     colour_code: '#0f62fe', display_order: 3 },
    { name: 'Electrical Safety',   colour_code: '#6929c4', display_order: 4 },
  ], { onConflict: 'name', ignoreDuplicates: true })
  if (ttCatErr) die('upsert toolbox_talk_categories', ttCatErr)
  const ttCatHeatId = await fid('toolbox_talk_categories', 'name', 'Heat & Environment')
  const ttCatRespId = await fid('toolbox_talk_categories', 'name', 'Respiratory Health')
  console.log('  ✓ toolbox_talk_categories')

  const ttt1 = crypto.randomUUID()
  const ttt2 = crypto.randomUUID()

  await ins('toolbox_talk_templates', [
    { id: ttt1, organisation_id: orgId, title: 'Heat Stress – Working in Hot Weather',  category_id: ttCatHeatId,  description: 'Managing heat stress risks during summer conditions on construction sites', estimated_duration_minutes: 10, is_active: true, created_by: hseId },
    { id: ttt2, organisation_id: orgId, title: 'Silica Dust – Know the Risks',          category_id: ttCatRespId, description: 'Understanding silica dust risks from concrete cutting and grinding, and required controls', estimated_duration_minutes: 15, is_active: true, created_by: hseId },
  ], 'toolbox_talk_templates (2)')

  const ttd1 = crypto.randomUUID()
  const ttd2 = crypto.randomUUID()

  await ins('toolbox_talk_deliveries', [
    { id: ttd1, organisation_id: orgId, template_id: ttt1, title: 'Heat Stress – Monday Morning Brief',  site_id: sCSId, delivered_by: hseId, delivered_at: '2026-06-02T07:00:00Z', location: 'Site office – morning briefing area', notes: 'All site workers present. BOM forecast 34°C for the week. Water stations restocked.', created_by: hseId },
    { id: ttd2, organisation_id: orgId, template_id: ttt2, title: 'Silica Dust Brief – Post Incident',   site_id: sCSId, delivered_by: hseId, delivered_at: '2026-05-23T07:00:00Z', location: 'Site office', notes: 'Conducted following the laceration incident as part of a broader safety re-brief.', created_by: hseId },
  ], 'toolbox_talk_deliveries (2)')

  await ins('toolbox_talk_attendees', [
    { delivery_id: ttd1, worker_id: supId,    attendee_name: 'Michael Torres',          acknowledged_at: '2026-06-02T07:12:00Z', signature_obtained: true },
    { delivery_id: ttd1, worker_id: workerId, attendee_name: 'Emma Wilson',             acknowledged_at: '2026-06-02T07:12:00Z', signature_obtained: true },
    { delivery_id: ttd1, worker_id: null,     attendee_name: 'Tom Bridgeman (BuildRight)', acknowledged_at: '2026-06-02T07:12:00Z', signature_obtained: true },
    { delivery_id: ttd2, worker_id: supId,    attendee_name: 'Michael Torres',          acknowledged_at: '2026-05-23T07:15:00Z', signature_obtained: true },
    { delivery_id: ttd2, worker_id: workerId, attendee_name: 'Emma Wilson',             acknowledged_at: '2026-05-23T07:15:00Z', signature_obtained: true },
  ], 'toolbox_talk_attendees (5)')

  // Speak-Up
  console.log('\nPhase 12c — Speak-Up')

  const sucSafe = await fid('speak_up_categories', 'name', 'Safety Hazard')

  await ins('speak_up_reports', [
    { organisation_id: orgId, site_id: sCSId, category_id: sucSafe, description: 'There have been multiple near-misses with the forklift and workers near the loading area over the past two weeks. I don\'t think the spotter requirement is being enforced consistently. I am concerned someone will get hurt. The supervisor seems to know but nothing has changed.', date_of_incident: '2026-06-01', location: 'Warehouse loading area', severity: 'high', status: 'under_review', assigned_to: hseId },
  ], 'speak_up_reports (1)')

  // ============================================================
  // PHASE 13 — Hiring (optional — catches errors gracefully)
  // ============================================================
  console.log('\nPhase 13 — Hiring')

  const { error: hiresErr } = await sb.from('hires').insert([
    { organisation_id: orgId, candidate_first_name: 'Alex',   candidate_last_name: 'Brown', candidate_email: 'alex.brown@example.com',   candidate_phone: '0412 000 001', position_title: 'Safety Officer',   site_id: sCSId, department_id: dSafCS,  employment_type: 'full_time', status: 'in_progress', current_step: 2, created_by: adminId },
    { organisation_id: orgId, candidate_first_name: 'Jordan', candidate_last_name: 'Lee',   candidate_email: 'jordan.lee@example.com',   candidate_phone: '0422 000 002', position_title: 'Site Supervisor',  site_id: sCSId, department_id: dConsCS, employment_type: 'full_time', status: 'in_progress', current_step: 4, created_by: adminId },
  ])
  if (hiresErr) {
    console.log(`  ℹ  hires skipped: ${hiresErr.message}`)
  } else {
    console.log('  ✓ hires (2)')
  }

  // ============================================================
  // PHASE 14 — Analytics / KPIs
  // ============================================================
  console.log('\nPhase 14 — Workforce Hours & KPI Snapshots')

  await ins('workforce_hours_logs', [
    { organisation_id: orgId, site_id: sCSId, period_start: '2026-01-01', period_end: '2026-01-31', hours_worked: 12480, headcount: 78, source: 'manual', notes: 'January 2026 – construction phase 2', created_by: adminId },
    { organisation_id: orgId, site_id: sCSId, period_start: '2026-02-01', period_end: '2026-02-28', hours_worked: 11200, headcount: 70, source: 'manual', notes: 'February 2026', created_by: adminId },
    { organisation_id: orgId, site_id: sCSId, period_start: '2026-03-01', period_end: '2026-03-31', hours_worked: 13440, headcount: 84, source: 'manual', notes: 'March 2026 – increased workforce', created_by: adminId },
    { organisation_id: orgId, site_id: sCSId, period_start: '2026-04-01', period_end: '2026-04-30', hours_worked: 11360, headcount: 71, source: 'manual', notes: 'April 2026 – Easter reduction', created_by: adminId },
    { organisation_id: orgId, site_id: sCSId, period_start: '2026-05-01', period_end: '2026-05-31', hours_worked: 13920, headcount: 87, source: 'manual', notes: 'May 2026 – peak construction activity', created_by: adminId },
    { organisation_id: orgId, site_id: sWHId, period_start: '2026-05-01', period_end: '2026-05-31', hours_worked:  2560, headcount: 16, source: 'manual', notes: 'May 2026 – warehouse operations', created_by: adminId },
  ], 'workforce_hours_logs (6)')

  const kpiTrifr = await fidN('kpi_definitions', 'code', 'TRIFR')
  const kpiInsp  = await fidN('kpi_definitions', 'code', 'INSP_COMPLETION')
  const kpiAct   = await fidN('kpi_definitions', 'code', 'ACTION_CLOSURE')

  if (kpiTrifr) {
    const snaps = [
      { kpi_definition_id: kpiTrifr, organisation_id: orgId, site_id: sCSId, period_type: 'monthly', period_start: '2026-05-01', period_end: '2026-05-31', value:  7.19, numerator:  1, denominator: 139200, is_current: true  },
      { kpi_definition_id: kpiTrifr, organisation_id: orgId, site_id: sCSId, period_type: 'monthly', period_start: '2026-04-01', period_end: '2026-04-30', value:  0.00, numerator:  0, denominator: 113600, is_current: false },
      { kpi_definition_id: kpiTrifr, organisation_id: orgId, site_id: sCSId, period_type: 'monthly', period_start: '2026-03-01', period_end: '2026-03-31', value:  0.00, numerator:  0, denominator: 134400, is_current: false },
    ]
    if (kpiInsp) snaps.push({ kpi_definition_id: kpiInsp, organisation_id: orgId, period_type: 'monthly', period_start: '2026-05-01', period_end: '2026-05-31', value: 83.33, numerator: 5, denominator: 6, is_current: true })
    if (kpiAct)  snaps.push({ kpi_definition_id: kpiAct,  organisation_id: orgId, period_type: 'monthly', period_start: '2026-05-01', period_end: '2026-05-31', value: 75.00, numerator: 3, denominator: 4, is_current: true })
    await ins('kpi_snapshots', snaps, `kpi_snapshots (${snaps.length})`)
  }

  // ============================================================
  // DONE
  // ============================================================
  console.log('\n' + '='.repeat(62))
  console.log('✅  Demo data seeded successfully!\n')
  console.log('  Login (password: DemoPass123!):')
  for (const u of USERS) {
    console.log(`    ${u.email.padEnd(44)} ${u.role}`)
  }
  console.log('\n  Navigate to: /login')
  console.log('='.repeat(62) + '\n')
}

main().catch(err => {
  console.error('\nFatal error:', err)
  process.exit(1)
})
