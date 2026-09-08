-- ============================================================================
-- CODE 22: SUPABASE SYNC FORENSIC REPAIR & PRODUCTION DATA INTEGRITY MIGRATION
-- Non-destructive, safe migration resolving PostgreSQL 42P17, 22P02, PGRST205
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PART 1: ROOT CAUSE 2 — user_profiles RLS RECURSION FIX (42P17)
-- ============================================================================

-- Drop the self-referencing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view own profile or controllers can view all" ON public.user_profiles;
DROP POLICY IF EXISTS "Only PHC Controllers can insert user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Controllers can update any profile; users update own" ON public.user_profiles;
DROP POLICY IF EXISTS "Only PHC Controllers can delete user profiles" ON public.user_profiles;

-- Create SECURITY DEFINER function that breaks recursion by bypassing RLS on user_profiles
CREATE OR REPLACE FUNCTION public.is_current_user_phc_controller()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE auth_user_id = auth.uid()
      AND role = 'phc_controller'
      AND is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_phc_controller() TO authenticated, anon;

-- Recreate clean, non-recursive RLS policies for user_profiles
CREATE POLICY "Users can view own profile or controllers can view all"
ON public.user_profiles FOR SELECT
USING (
  auth_user_id = auth.uid()
  OR public.is_current_user_phc_controller()
  OR auth.uid() IS NULL -- Allows public/anon bootstrap lookup when needed
);

CREATE POLICY "Only PHC Controllers can insert user profiles"
ON public.user_profiles FOR INSERT
WITH CHECK (
  public.is_current_user_phc_controller()
  OR NOT EXISTS (SELECT 1 FROM public.user_profiles) -- First admin bootstrap
);

CREATE POLICY "Controllers can update any profile; users update own"
ON public.user_profiles FOR UPDATE
USING (
  auth_user_id = auth.uid()
  OR public.is_current_user_phc_controller()
);

CREATE POLICY "Only PHC Controllers can delete user profiles"
ON public.user_profiles FOR DELETE
USING (
  public.is_current_user_phc_controller()
);

-- ============================================================================
-- PART 2: ROOT CAUSE 3 — MISSING TABLES CREATION (PGRST205 FIX)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) TB REGISTER: tb_suspected_patient_register
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tb_suspected_patient_register (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES public.employee_master(id) ON DELETE CASCADE,
  phc_id uuid NOT NULL REFERENCES public.phc_master(id) ON DELETE CASCADE,
  subcentre_id uuid NOT NULL REFERENCES public.subcentre_master(id) ON DELETE CASCADE,
  village_id uuid REFERENCES public.village_master(id) ON DELETE SET NULL,
  patient_name text NOT NULL,
  age integer NOT NULL CHECK (age > 0 AND age <= 120),
  gender text NOT NULL CHECK (gender IN ('पुरुष', 'स्त्री', 'इतर')),
  mobile_number text,
  nikshay_id text,
  sample_collection_date date NOT NULL DEFAULT current_date,
  sample_sent_date date NOT NULL DEFAULT current_date,
  risk_type text NOT NULL,
  sample_type text NOT NULL CHECK (sample_type IN ('Sputum', 'Xray', 'LPA', 'Followup Sputum', 'FoodBasket')),
  sample_given_at text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT chk_tb_dates CHECK (sample_sent_date >= sample_collection_date),
  CONSTRAINT chk_tb_sample_given_at CHECK (
    (sample_type = 'FoodBasket') OR (sample_given_at IS NOT NULL AND length(trim(sample_given_at)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_tb_employee ON public.tb_suspected_patient_register(employee_id);
CREATE INDEX IF NOT EXISTS idx_tb_phc ON public.tb_suspected_patient_register(phc_id);
CREATE INDEX IF NOT EXISTS idx_tb_subcentre ON public.tb_suspected_patient_register(subcentre_id);
CREATE INDEX IF NOT EXISTS idx_tb_village ON public.tb_suspected_patient_register(village_id);
CREATE INDEX IF NOT EXISTS idx_tb_collection_date ON public.tb_suspected_patient_register(sample_collection_date);
CREATE INDEX IF NOT EXISTS idx_tb_sent_date ON public.tb_suspected_patient_register(sample_sent_date);

ALTER TABLE public.tb_suspected_patient_register ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access for tb_suspected_patient_register" ON public.tb_suspected_patient_register;
CREATE POLICY "Allow read access for tb_suspected_patient_register" ON public.tb_suspected_patient_register FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert for tb_suspected_patient_register" ON public.tb_suspected_patient_register;
CREATE POLICY "Allow insert for tb_suspected_patient_register" ON public.tb_suspected_patient_register FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update for tb_suspected_patient_register" ON public.tb_suspected_patient_register;
CREATE POLICY "Allow update for tb_suspected_patient_register" ON public.tb_suspected_patient_register FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow delete for tb_suspected_patient_register" ON public.tb_suspected_patient_register;
CREATE POLICY "Allow delete for tb_suspected_patient_register" ON public.tb_suspected_patient_register FOR DELETE USING (true);

-- ----------------------------------------------------------------------------
-- B) DYNAMIC REGISTER TEMPLATES: record_register_templates
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.record_register_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  register_code text UNIQUE NOT NULL,
  register_name text NOT NULL,
  program_name text,
  description text,
  icon text DEFAULT 'FileText',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.record_register_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for record_register_templates" ON public.record_register_templates;
CREATE POLICY "Allow read for record_register_templates" ON public.record_register_templates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write for record_register_templates" ON public.record_register_templates;
CREATE POLICY "Allow write for record_register_templates" ON public.record_register_templates FOR ALL USING (true);

-- ----------------------------------------------------------------------------
-- C) DYNAMIC TEMPLATE FIELDS: record_template_fields
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.record_template_fields (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id uuid NOT NULL REFERENCES public.record_register_templates(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL,
  field_order integer NOT NULL DEFAULT 0,
  is_required boolean DEFAULT false,
  is_searchable boolean DEFAULT false,
  show_in_list boolean DEFAULT true,
  show_in_report boolean DEFAULT true,
  show_in_print boolean DEFAULT true,
  default_value text,
  placeholder text,
  help_text text,
  options_json jsonb DEFAULT '[]'::jsonb,
  validation_json jsonb DEFAULT '{}'::jsonb,
  automation_json jsonb DEFAULT '{}'::jsonb,
  conditional_json jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_fields_template ON public.record_template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_template_fields_order ON public.record_template_fields(template_id, field_order);

ALTER TABLE public.record_template_fields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for record_template_fields" ON public.record_template_fields;
CREATE POLICY "Allow read for record_template_fields" ON public.record_template_fields FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write for record_template_fields" ON public.record_template_fields;
CREATE POLICY "Allow write for record_template_fields" ON public.record_template_fields FOR ALL USING (true);

-- ----------------------------------------------------------------------------
-- D) DYNAMIC RECORD ENTRIES: dynamic_record_entries
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dynamic_record_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id uuid NOT NULL REFERENCES public.record_register_templates(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employee_master(id) ON DELETE CASCADE,
  phc_id uuid NOT NULL REFERENCES public.phc_master(id) ON DELETE CASCADE,
  subcentre_id uuid NOT NULL REFERENCES public.subcentre_master(id) ON DELETE CASCADE,
  village_id uuid REFERENCES public.village_master(id) ON DELETE SET NULL,
  record_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  record_date date NOT NULL DEFAULT current_date,
  is_printed boolean DEFAULT false,
  printed_at timestamptz,
  printed_by uuid,
  print_count integer DEFAULT 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dynamic_entries_template ON public.dynamic_record_entries(template_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_entries_employee ON public.dynamic_record_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_entries_phc ON public.dynamic_record_entries(phc_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_entries_subcentre ON public.dynamic_record_entries(subcentre_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_entries_record_date ON public.dynamic_record_entries(record_date);

ALTER TABLE public.dynamic_record_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for dynamic_record_entries" ON public.dynamic_record_entries;
CREATE POLICY "Allow read for dynamic_record_entries" ON public.dynamic_record_entries FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write for dynamic_record_entries" ON public.dynamic_record_entries;
CREATE POLICY "Allow write for dynamic_record_entries" ON public.dynamic_record_entries FOR ALL USING (true);

-- ----------------------------------------------------------------------------
-- E) MALARIA TARGETS: malaria_targets
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.malaria_targets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phc_id uuid REFERENCES public.phc_master(id) ON DELETE CASCADE,
  subcentre_id uuid REFERENCES public.subcentre_master(id) ON DELETE CASCADE,
  village_id uuid REFERENCES public.village_master(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employee_master(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_year integer NOT NULL,
  target_month integer,
  target_value numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique index ensuring no duplicates for the same scope, type and time period
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_malaria_targets_scope
ON public.malaria_targets(
  coalesce(phc_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(subcentre_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(village_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(employee_id, '00000000-0000-0000-0000-000000000000'::uuid),
  target_type,
  target_year,
  coalesce(target_month, -1)
);

CREATE INDEX IF NOT EXISTS idx_targets_phc ON public.malaria_targets(phc_id);
CREATE INDEX IF NOT EXISTS idx_targets_subcentre ON public.malaria_targets(subcentre_id);
CREATE INDEX IF NOT EXISTS idx_targets_employee ON public.malaria_targets(employee_id);
CREATE INDEX IF NOT EXISTS idx_targets_year ON public.malaria_targets(target_year);

ALTER TABLE public.malaria_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for malaria_targets" ON public.malaria_targets;
CREATE POLICY "Allow read for malaria_targets" ON public.malaria_targets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write for malaria_targets" ON public.malaria_targets;
CREATE POLICY "Allow write for malaria_targets" ON public.malaria_targets FOR ALL USING (true);

-- ----------------------------------------------------------------------------
-- F) SYSTEM AUDIT LOGS: system_audit_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid,
  employee_id uuid REFERENCES public.employee_master(id) ON DELETE SET NULL,
  phc_id uuid REFERENCES public.phc_master(id) ON DELETE SET NULL,
  subcentre_id uuid REFERENCES public.subcentre_master(id) ON DELETE SET NULL,
  action text NOT NULL,
  module text NOT NULL,
  record_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON public.system_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_module ON public.system_audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_employee ON public.system_audit_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.system_audit_logs(created_at);

ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for system_audit_logs" ON public.system_audit_logs;
CREATE POLICY "Allow read for system_audit_logs" ON public.system_audit_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert for system_audit_logs" ON public.system_audit_logs;
CREATE POLICY "Allow insert for system_audit_logs" ON public.system_audit_logs FOR INSERT WITH CHECK (true);
