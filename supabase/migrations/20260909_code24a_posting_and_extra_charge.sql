-- ============================================================================
-- CODE 24A: EMPLOYEE POSTING HISTORY & EXTRA CHARGE MANAGEMENT
-- Supports cross-device employee posting and additional charge assignment
-- ============================================================================

-- 1. EMPLOYEE POSTING HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.employee_posting_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employee_master(id) ON DELETE CASCADE,
  subcentre_id uuid NOT NULL REFERENCES public.subcentre_master(id) ON DELETE CASCADE,
  designation text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  order_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. EMPLOYEE EXTRA CHARGE TABLE (अतिरिक्त कार्यभार)
CREATE TABLE IF NOT EXISTS public.employee_extra_charge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employee_master(id) ON DELETE CASCADE,
  subcentre_id uuid NOT NULL REFERENCES public.subcentre_master(id) ON DELETE CASCADE,
  assigned_by text,
  order_number text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_posting_history_employee ON public.employee_posting_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_posting_history_subcentre ON public.employee_posting_history(subcentre_id);
CREATE INDEX IF NOT EXISTS idx_posting_history_active ON public.employee_posting_history(is_active);

CREATE INDEX IF NOT EXISTS idx_extra_charge_employee ON public.employee_extra_charge(employee_id);
CREATE INDEX IF NOT EXISTS idx_extra_charge_subcentre ON public.employee_extra_charge(subcentre_id);
CREATE INDEX IF NOT EXISTS idx_extra_charge_active ON public.employee_extra_charge(is_active);

-- Enable RLS
ALTER TABLE public.employee_posting_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_extra_charge ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_posting_history
DROP POLICY IF EXISTS "Allow read for employee_posting_history" ON public.employee_posting_history;
CREATE POLICY "Allow read for employee_posting_history"
ON public.employee_posting_history FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow modify for employee_posting_history" ON public.employee_posting_history;
CREATE POLICY "Allow modify for employee_posting_history"
ON public.employee_posting_history FOR ALL
USING (public.is_current_user_phc_controller());

-- RLS Policies for employee_extra_charge
DROP POLICY IF EXISTS "Allow read for employee_extra_charge" ON public.employee_extra_charge;
CREATE POLICY "Allow read for employee_extra_charge"
ON public.employee_extra_charge FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow modify for employee_extra_charge" ON public.employee_extra_charge;
CREATE POLICY "Allow modify for employee_extra_charge"
ON public.employee_extra_charge FOR ALL
USING (public.is_current_user_phc_controller());

-- Grant access
GRANT SELECT ON public.employee_posting_history TO anon, authenticated;
GRANT ALL ON public.employee_posting_history TO authenticated;

GRANT SELECT ON public.employee_extra_charge TO anon, authenticated;
GRANT ALL ON public.employee_extra_charge TO authenticated;
