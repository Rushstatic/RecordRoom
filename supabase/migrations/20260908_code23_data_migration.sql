-- ==============================================================================
-- CODE 23: DATA MIGRATION HISTORY
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.data_migration_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_batch_id uuid NOT NULL,
  module_name text NOT NULL,
  local_record_id text NOT NULL,
  supabase_record_id uuid,
  status text NOT NULL CHECK (status IN ('IMPORTED', 'SKIPPED', 'DUPLICATE', 'INVALID', 'CONFLICT', 'FAILED')),
  error_message text,
  match_method text,
  migrated_by uuid REFERENCES auth.users(id),
  migrated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_migration_batch ON public.data_migration_history(migration_batch_id);
CREATE INDEX IF NOT EXISTS idx_migration_module ON public.data_migration_history(module_name);
CREATE INDEX IF NOT EXISTS idx_migration_status ON public.data_migration_history(status);

ALTER TABLE public.data_migration_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for data_migration_history" ON public.data_migration_history;
CREATE POLICY "Allow read for data_migration_history" 
ON public.data_migration_history FOR SELECT 
USING (public.is_current_user_phc_controller());

DROP POLICY IF EXISTS "Allow insert for data_migration_history" ON public.data_migration_history;
CREATE POLICY "Allow insert for data_migration_history" 
ON public.data_migration_history FOR INSERT 
WITH CHECK (public.is_current_user_phc_controller());

-- Grant access to authenticated users
GRANT SELECT, INSERT ON public.data_migration_history TO authenticated;
