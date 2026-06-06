-- Fatigue & Shift Monitoring Module
CREATE TABLE IF NOT EXISTS fatigue_rule_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);
CREATE TABLE IF NOT EXISTS fatigue_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id UUID NOT NULL REFERENCES fatigue_rule_sets(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('max_hours_per_day','max_hours_per_week','min_rest_between_shifts','max_consecutive_days','max_hours_per_fortnight')),
  threshold_value NUMERIC NOT NULL,
  alert_threshold_value NUMERIC,
  unit TEXT NOT NULL DEFAULT 'hours',
  severity TEXT NOT NULL DEFAULT 'high' CHECK (severity IN ('info','warning','high','critical')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS shift_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES user_profiles(id),
  site_id UUID REFERENCES sites(id),
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_start TIMESTAMPTZ NOT NULL,
  shift_end TIMESTAMPTZ,
  hours_worked NUMERIC,
  shift_type TEXT DEFAULT 'standard' CHECK (shift_type IN ('standard','overtime','on_call','night')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);
CREATE TABLE IF NOT EXISTS fatigue_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES user_profiles(id),
  rule_id UUID REFERENCES fatigue_rules(id),
  alert_type TEXT NOT NULL,
  actual_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  shift_log_id UUID REFERENCES shift_logs(id),
  acknowledged_by UUID REFERENCES user_profiles(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
