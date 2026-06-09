# EXXIO Platform — Incomplete Features

> **MVP Status:** The current build (16 modules, 175 tables, 130+ functions) is sufficient for MVP launch.
> The items below are post-MVP enhancements prioritised by OHS compliance impact.

---

## Priority 1 — High Impact (next sprint)

### Training Management *(Modules 12 & 13 — never created)*

The migration sequence jumps from `module11` to `module14`, indicating two modules were planned but not built. Training is a mandatory requirement under most OHS jurisdictions (e.g. WHS Act, ISO 45001).

**Missing tables:**
- `training_courses` — course catalogue (name, type, delivery method, duration, provider)
- `training_records` — worker completion records (passed/failed, score, expiry date, certificate ref)
- `training_schedules` — scheduled/recurring training sessions
- `training_requirements` — role or site-level mandatory training rules
- `training_evidence` — certificates and attachments
- `competency_types` — competency definitions (licence, certificate, induction)
- `worker_competencies` — worker-to-competency mapping with expiry tracking
- `toolbox_talks` — safety briefing records (topic, attendees, date, site)
- `toolbox_talk_attendees` — attendance records

**Missing functions:**
- `generate_training_number()` — reference number sequence
- `check_training_expiry()` — flag upcoming/expired training
- `notify_training_due()` — notification trigger for expiring competencies
- `mark_overdue_training()` — scheduled overdue marking

**Missing triggers:**
- On `training_records` INSERT/UPDATE: check expiry, notify assignee
- On `worker_competencies` UPDATE: sync a `has_expired_competencies` flag on `user_profiles`

**Missing RLS:**
- Workers can view their own records
- Supervisors can view their team's records
- HSE officers can view all records within their site

**Missing seed data:**
- Common induction types (site induction, HSE induction, emergency warden)
- Common competency types (First Aid, Working at Heights, Forklift licence, EWP)

---

## Priority 2 — Medium Impact (post-launch)

### PPE Inventory & Issuance Tracking

`ppe_types` (14 types) and `permit_ppe_requirements` exist, but there is no stock management or issuance history.

**Missing tables:**
- `ppe_inventory` — stock levels per PPE type per site (quantity on hand, reorder threshold)
- `ppe_issuances` — records of PPE issued to workers (issued_at, returned_at, condition)
- `ppe_inspection_records` — periodic inspection of PPE items (pass/fail, inspector, next due)

**Missing functions:**
- `check_ppe_low_stock()` — notify when stock falls below reorder threshold
- `mark_ppe_overdue_inspection()` — scheduled check for PPE items due for inspection

---

### Emergency Response Planning

No emergency management capability exists in the current schema.

**Missing tables:**
- `emergency_plans` — emergency response plans per site (type: fire, chemical spill, medical, evacuation)
- `emergency_plan_versions` — version history for plans
- `muster_points` — defined assembly areas per site
- `emergency_contacts` — site-level emergency contact directory (fire brigade, ambulance, poison control)
- `emergency_drills` — drill records (type, date, duration, participants, outcome)
- `emergency_drill_participants` — attendance at drills

**Missing seed data:**
- Standard emergency types (fire, chemical spill, medical emergency, evacuation, lockdown)

---

### Contractor Management

Contractors currently have no dedicated entity — they would need to reuse `user_profiles`, losing contractor-specific context.

**Missing tables:**
- `contractors` — contractor company records (ABN/business number, insurance expiry, approved status)
- `contractor_workers` — individual contractor workers linked to a contractor company
- `contractor_inductions` — site induction records for contractor workers
- `contractor_documents` — insurance certificates, licences, SWMS on file
- `contractor_site_access` — approved site access periods per contractor

---

## Priority 3 — Lower Impact (future roadmap)

### Job Safety Analysis (JSA) / Safe Work Method Statements (SWMS)

Currently these can only be stored as unstructured documents. There are no structured fields for step-by-step hazard/control capture.

**Missing tables:**
- `jsa_templates` — reusable JSA/SWMS templates
- `jsa_records` — completed JSA instances linked to permits or work orders
- `jsa_steps` — individual work steps within a JSA
- `jsa_step_hazards` — hazards identified per step
- `jsa_step_controls` — controls applied per step
- `jsa_sign_offs` — worker acknowledgement signatures

---

### Fatigue & Fitness for Duty

`workforce_hours_logs` tracks hours but there is no rules engine or fitness-for-duty check.

**Missing tables:**
- `fatigue_rules` — configurable thresholds (max hours/day, min rest period, max consecutive days)
- `fatigue_alerts` — breaches of fatigue rules linked to a worker
- `fitness_for_duty_checks` — pre-shift assessments (alcohol, fatigue self-assessment, medical flag)

**Missing functions:**
- `check_fatigue_breach()` — evaluate `workforce_hours_logs` against `fatigue_rules`

---

### Safety Observations / Behaviour-Based Safety (BBS)

Hazard reports partially cover this. A dedicated safety observation module supports proactive safety culture programs.

**Missing tables:**
- `safety_observations` — positive and negative observations (observer, subject, behaviour, category)
- `observation_categories` — configurable behaviour categories
- `bbs_programs` — named BBS programs with targets and date ranges
- `bbs_program_observations` — observations linked to a BBS program

---

### Toolbox Talk Attendance (standalone, outside training module)

If Training Management (Priority 1) is deferred, a lightweight standalone toolbox talk record is useful for supervisors.

> Note: If the full Training module is built, toolbox talks should live there as a `training_type`, not as a separate module.

---

## Infrastructure Gaps

### Missing notification templates

The following events have triggers or functions but no corresponding entry in `notification_templates`:
- Training record expiring soon
- Competency expired
- PPE inspection overdue
- Emergency drill due

### Missing webhook event types

The following events are not currently in `webhook_event_types`:
- `training.completed`
- `training.expired`
- `competency.expired`
- `contractor.induction_expired`

### Missing KPI definitions

The current 8 KPI definitions do not include:
- Training compliance rate (% workers with current required training)
- PPE compliance rate
- Contractor induction compliance rate
- Near miss frequency rate (separate from LTIFR/TRIFR)

---

## Summary Table

| Feature | Priority | Est. Tables | Migrations Needed |
|---|---|---|---|
| Training Management | P1 | ~9 | 4 (schema, triggers, rls, seed) |
| PPE Inventory & Issuance | P2 | 3 | 4 |
| Emergency Response Planning | P2 | 6 | 4 |
| Contractor Management | P2 | 5 | 4 |
| JSA / SWMS | P3 | 6 | 4 |
| Fatigue & Fitness for Duty | P3 | 3 | 4 |
| Safety Observations / BBS | P3 | 4 | 4 |
| Notification/webhook/KPI gaps | — | 0 (data only) | 1 seed patch |
