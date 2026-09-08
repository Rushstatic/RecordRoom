-- Fix missing email column in employee_master table
ALTER TABLE public.employee_master ADD COLUMN IF NOT EXISTS email text;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
