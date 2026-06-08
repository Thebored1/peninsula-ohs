-- =============================================================
-- HIRING MODULE: Employee Onboarding Checklists — Schema
-- =============================================================
-- Tables: onboarding_templates, onboarding_template_tasks,
--         onboarding_assignments, onboarding_task_completions
-- =============================================================

-- ─── ONBOARDING TEMPLATES ─────────────────────────────────────────────────────

CREATE TABLE onboarding_templates (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  description       text,
  employment_types  text[],     -- NULL = applies to all; or ['full_time','part_time']
  site_id           uuid        REFERENCES sites(id),
  is_active         boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid        REFERENCES auth.users(id)
);

CREATE INDEX idx_ot_org      ON onboarding_templates(organisation_id);
CREATE INDEX idx_ot_active   ON onboarding_templates(is_active) WHERE is_active = true;

-- ─── ONBOARDING TEMPLATE TASKS ────────────────────────────────────────────────

CREATE TABLE onboarding_template_tasks (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  template_id           uuid        NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
  task_title            text        NOT NULL,
  task_description      text,
  task_type             text        NOT NULL DEFAULT 'task'
                                    CHECK (task_type IN (
                                      'acknowledge_document',
                                      'complete_training',
                                      'task',
                                      'meeting',
                                      'check_in',
                                      'other'
                                    )),
  due_days_from_start   integer,
  document_id           uuid        REFERENCES documents(id),
  training_course_id    uuid        REFERENCES training_courses(id),
  is_required           boolean     NOT NULL DEFAULT true,
  display_order         integer     NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid        REFERENCES auth.users(id)
);

CREATE INDEX idx_ott_template  ON onboarding_template_tasks(template_id);
CREATE INDEX idx_ott_org       ON onboarding_template_tasks(organisation_id);

-- ─── ONBOARDING ASSIGNMENTS ───────────────────────────────────────────────────

CREATE TABLE onboarding_assignments (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id         uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  hire_id                 uuid        NOT NULL REFERENCES hires(id),
  worker_id               uuid        NOT NULL REFERENCES user_profiles(id),
  template_id             uuid        NOT NULL REFERENCES onboarding_templates(id),
  status                  text        NOT NULL DEFAULT 'assigned'
                                      CHECK (status IN ('assigned','in_progress','completed','cancelled')),
  start_date              date,
  target_completion_date  date,
  completed_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  created_by              uuid        REFERENCES auth.users(id)
);

CREATE INDEX idx_oa_hire       ON onboarding_assignments(hire_id);
CREATE INDEX idx_oa_worker     ON onboarding_assignments(worker_id);
CREATE INDEX idx_oa_org_status ON onboarding_assignments(organisation_id, status);

-- ─── ONBOARDING TASK COMPLETIONS ──────────────────────────────────────────────

CREATE TABLE onboarding_task_completions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  assignment_id     uuid        NOT NULL REFERENCES onboarding_assignments(id) ON DELETE CASCADE,
  template_task_id  uuid        NOT NULL REFERENCES onboarding_template_tasks(id),
  worker_id         uuid        NOT NULL REFERENCES user_profiles(id),
  status            text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','in_progress','completed','skipped','waived')),
  due_date          date,
  completed_at      timestamptz,
  completed_by      uuid        REFERENCES auth.users(id),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid        REFERENCES auth.users(id),

  UNIQUE (assignment_id, template_task_id)
);

CREATE INDEX idx_otc_assignment ON onboarding_task_completions(assignment_id);
CREATE INDEX idx_otc_worker     ON onboarding_task_completions(worker_id);
CREATE INDEX idx_otc_status     ON onboarding_task_completions(status);
