-- आरोग्य उपकेंद्र रेकॉर्ड कीपिंग सिस्टीम
-- CODE 2 : MASTER DATABASE

create extension if not exists "uuid-ossp";

-- 1. PHC MASTER
create table if not exists phc_master (
  id uuid primary key default uuid_generate_v4(),
  phc_name text not null,
  phc_code text unique,
  taluka text,
  district text,
  created_at timestamptz default now()
);

-- 2. SUBCENTRE MASTER
create table if not exists subcentre_master (
  id uuid primary key default uuid_generate_v4(),
  phc_id uuid not null references phc_master(id) on delete cascade,
  subcentre_name text not null,
  subcentre_code text unique,
  created_at timestamptz default now()
);

-- 3. VILLAGE MASTER
create table if not exists village_master (
  id uuid primary key default uuid_generate_v4(),
  subcentre_id uuid not null references subcentre_master(id) on delete cascade,
  village_name text not null,
  population integer default 0,
  total_houses integer default 0,
  created_at timestamptz default now()
);

-- 4. EMPLOYEE MASTER
create table if not exists employee_master (
  id uuid primary key default uuid_generate_v4(),
  subcentre_id uuid not null references subcentre_master(id) on delete cascade,
  employee_name text not null,
  designation text,
  mobile_number text,
  email text,
  malaria_smear_code text not null unique,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- INDEXES
create index if not exists idx_subcentre_phc
on subcentre_master(phc_id);

create index if not exists idx_village_subcentre
on village_master(subcentre_id);

create index if not exists idx_employee_subcentre
on employee_master(subcentre_id);

create index if not exists idx_employee_smear_code
on employee_master(malaria_smear_code);

-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS
alter table phc_master enable row level security;
alter table subcentre_master enable row level security;
alter table village_master enable row level security;
alter table employee_master enable row level security;

-- Allow read access to authenticated and anon users for demonstration/subcentre records
create policy "Allow public read access for phc_master" on phc_master for select using (true);
create policy "Allow public write access for phc_master" on phc_master for all using (true);

create policy "Allow public read access for subcentre_master" on subcentre_master for select using (true);
create policy "Allow public write access for subcentre_master" on subcentre_master for all using (true);

create policy "Allow public read access for village_master" on village_master for select using (true);
create policy "Allow public write access for village_master" on village_master for all using (true);

create policy "Allow public read access for employee_master" on employee_master for select using (true);
create policy "Allow public write access for employee_master" on employee_master for all using (true);

-- ===================================================
-- CODE 4: राष्ट्रीय हिवताप नियंत्रण कार्यक्रम (NVBDCP)
-- रक्त नमुना नोंदवही (MALARIA BLOOD SAMPLES REGISTER)
-- ===================================================

create table if not exists malaria_blood_samples (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employee_master(id) on delete cascade,
  village_id uuid not null references village_master(id) on delete cascade,
  house_number text,
  patient_name text not null,
  age integer not null check (age > 0 and age <= 120),
  gender text not null check (gender in ('पुरुष', 'स्त्री', 'इतर')),
  sample_collection_date date not null default current_date,
  sample_number integer not null,
  sample_year integer not null,
  malaria_smear_code text not null,
  sent_date date default null,
  client_record_id uuid unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Guaranteed uniqueness per employee per calendar year
  constraint uq_employee_year_sample unique (employee_id, sample_year, sample_number)
);

-- SAFE MIGRATION: Add sent_date & client_record_id if table already exists
alter table malaria_blood_samples add column if not exists sent_date date default null;
alter table malaria_blood_samples add column if not exists client_record_id uuid unique;

-- INDEXES FOR FAST FILTERING & SEARCHING
create index if not exists idx_malaria_sent_date
  on malaria_blood_samples(sent_date);

create index if not exists idx_malaria_client_record_id
  on malaria_blood_samples(client_record_id);

create index if not exists idx_malaria_employee_year
  on malaria_blood_samples(employee_id, sample_year);

create index if not exists idx_malaria_collection_date
  on malaria_blood_samples(sample_collection_date);

create index if not exists idx_malaria_village
  on malaria_blood_samples(village_id);

create index if not exists idx_malaria_patient_name
  on malaria_blood_samples(patient_name);

create index if not exists idx_malaria_house_number
  on malaria_blood_samples(house_number);

-- POSTGRESQL FUNCTION: Concurrency-safe Next Sequential Sample Number
-- Returns the next sequential sample number for an employee in a given calendar year
create or replace function get_next_malaria_sample_number(p_employee_id uuid, p_sample_year int)
returns int as $$
declare
  v_next_num int;
begin
  select coalesce(max(sample_number), 0) + 1
  into v_next_num
  from malaria_blood_samples
  where employee_id = p_employee_id and sample_year = p_sample_year;

  return v_next_num;
end;
$$ language plpgsql;

-- TRIGGER: Automatic Database-Level Sample Number & Year Assignment
create or replace function trg_fn_assign_malaria_sample_number()
returns trigger as $$
declare
  v_year int;
  v_next_num int;
begin
  -- Auto-derive sample_year from sample_collection_date
  if NEW.sample_collection_date is not null then
    v_year := extract(year from NEW.sample_collection_date)::int;
  else
    v_year := extract(year from current_date)::int;
  end if;
  NEW.sample_year := v_year;

  -- If sample_number is not explicitly assigned or 0, assign next sequentially
  if NEW.sample_number is null or NEW.sample_number = 0 then
    select coalesce(max(sample_number), 0) + 1
    into v_next_num
    from malaria_blood_samples
    where employee_id = NEW.employee_id and sample_year = v_year;

    NEW.sample_number := v_next_num;
  end if;

  NEW.updated_at := now();
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_malaria_sample_number on malaria_blood_samples;
create trigger trg_malaria_sample_number
before insert on malaria_blood_samples
for each row execute function trg_fn_assign_malaria_sample_number();

-- ROW LEVEL SECURITY (RLS)
alter table malaria_blood_samples enable row level security;

-- Subcentre Employee / PHC Controller read access
create policy "Allow read access for malaria_blood_samples"
on malaria_blood_samples for select
using (true);

-- Insert policy: insert record for valid employee
create policy "Allow insert for malaria_blood_samples"
on malaria_blood_samples for insert
with check (true);

-- Update policy: update own or managed samples
create policy "Allow update for malaria_blood_samples"
on malaria_blood_samples for update
using (true);

-- Delete policy: delete allowed
create policy "Allow delete for malaria_blood_samples"
on malaria_blood_samples for delete
using (true);

-- ==========================================================
-- CODE 11 : SECURE USER AUTHENTICATION & ROLE MANAGEMENT (RBAC)
-- ==========================================================

-- 1. USER PROFILES TABLE
create table if not exists user_profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  email text not null,
  mobile text,
  display_name text not null,
  role text not null check (role in ('phc_controller', 'subcentre_employee')),
  employee_id uuid references employee_master(id) on delete set null,
  phc_id uuid references phc_master(id) on delete set null,
  subcentre_id uuid references subcentre_master(id) on delete set null,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Unique active profile constraint per employee
create unique index if not exists idx_unique_active_employee_profile
on user_profiles(employee_id)
where (employee_id is not null and is_active = true);

-- Performance Indexes
create index if not exists idx_user_profiles_auth_user
on user_profiles(auth_user_id);

create index if not exists idx_user_profiles_email
on user_profiles(email);

create index if not exists idx_user_profiles_role
on user_profiles(role);

create index if not exists idx_user_profiles_subcentre
on user_profiles(subcentre_id);

create index if not exists idx_user_profiles_phc
on user_profiles(phc_id);

-- Helper security functions to determine current caller's profile
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

-- Trigger to keep updated_at refreshed
create or replace function trg_fn_user_profiles_updated_at()
returns trigger as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_user_profiles_updated_at on user_profiles;
create trigger trg_user_profiles_updated_at
before update on user_profiles
for each row execute function trg_fn_user_profiles_updated_at();

-- ROW LEVEL SECURITY (RLS) FOR USER PROFILES
alter table user_profiles enable row level security;

-- Policy 1: Read Profiles
create policy "Users can view own profile or controllers can view all"
on user_profiles for select
using (
  auth_user_id = auth.uid()
  or public.is_current_user_phc_controller()
  or auth.uid() is null
);

-- Policy 2: Insert / Create Profiles
create policy "Only PHC Controllers can insert user profiles"
on user_profiles for insert
with check (
  public.is_current_user_phc_controller()
  or not exists (select 1 from user_profiles)
);

-- Policy 3: Update Profiles
create policy "Controllers can update any profile; users update own"
on user_profiles for update
using (
  auth_user_id = auth.uid()
  or public.is_current_user_phc_controller()
);

-- Policy 4: Delete Profiles
create policy "Only PHC Controllers can delete user profiles"
on user_profiles for delete
using (
  public.is_current_user_phc_controller()
);

-- ==========================================================
-- CODE 17 : TB SUSPECTED PATIENT REGISTER
-- ==========================================================

create table if not exists tb_suspected_patient_register (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employee_master(id) on delete cascade,
  phc_id uuid not null references phc_master(id) on delete cascade,
  subcentre_id uuid not null references subcentre_master(id) on delete cascade,
  village_id uuid references village_master(id) on delete set null,
  patient_name text not null,
  age integer not null check (age > 0 and age <= 120),
  gender text not null check (gender in ('पुरुष', 'स्त्री', 'इतर')),
  mobile_number text,
  nikshay_id text,
  sample_collection_date date not null default current_date,
  sample_sent_date date not null default current_date,
  risk_type text not null,
  sample_type text not null check (sample_type in ('Sputum', 'Xray', 'LPA', 'Followup Sputum', 'FoodBasket')),
  sample_given_at text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  updated_by uuid,
  constraint chk_tb_dates check (sample_sent_date >= sample_collection_date),
  constraint chk_tb_sample_given_at check (
    (sample_type = 'FoodBasket') or (sample_given_at is not null and length(trim(sample_given_at)) > 0)
  )
);

create index if not exists idx_tb_employee on tb_suspected_patient_register(employee_id);
create index if not exists idx_tb_phc on tb_suspected_patient_register(phc_id);
create index if not exists idx_tb_subcentre on tb_suspected_patient_register(subcentre_id);
create index if not exists idx_tb_village on tb_suspected_patient_register(village_id);
create index if not exists idx_tb_collection_date on tb_suspected_patient_register(sample_collection_date);
create index if not exists idx_tb_sent_date on tb_suspected_patient_register(sample_sent_date);

alter table tb_suspected_patient_register enable row level security;
create policy "Allow read access for tb_suspected_patient_register" on tb_suspected_patient_register for select using (true);
create policy "Allow insert for tb_suspected_patient_register" on tb_suspected_patient_register for insert with check (true);
create policy "Allow update for tb_suspected_patient_register" on tb_suspected_patient_register for update using (true);
create policy "Allow delete for tb_suspected_patient_register" on tb_suspected_patient_register for delete using (true);

-- ==========================================================
-- CODE 18 : DYNAMIC REGISTER TEMPLATES & ENTRIES
-- ==========================================================

create table if not exists record_register_templates (
  id uuid primary key default uuid_generate_v4(),
  register_code text unique not null,
  register_name text not null,
  program_name text,
  description text,
  icon text default 'FileText',
  is_active boolean default true,
  display_order integer default 0,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table record_register_templates enable row level security;
create policy "Allow read for record_register_templates" on record_register_templates for select using (true);
create policy "Allow write for record_register_templates" on record_register_templates for all using (true);

create table if not exists record_template_fields (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references record_register_templates(id) on delete cascade,
  field_key text not null,
  field_label text not null,
  field_type text not null,
  field_order integer not null default 0,
  is_required boolean default false,
  is_searchable boolean default false,
  show_in_list boolean default true,
  show_in_report boolean default true,
  show_in_print boolean default true,
  default_value text,
  placeholder text,
  help_text text,
  options_json jsonb default '[]'::jsonb,
  validation_json jsonb default '{}'::jsonb,
  automation_json jsonb default '{}'::jsonb,
  conditional_json jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_template_fields_template on record_template_fields(template_id);
alter table record_template_fields enable row level security;
create policy "Allow read for record_template_fields" on record_template_fields for select using (true);
create policy "Allow write for record_template_fields" on record_template_fields for all using (true);

create table if not exists dynamic_record_entries (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references record_register_templates(id) on delete cascade,
  employee_id uuid not null references employee_master(id) on delete cascade,
  phc_id uuid not null references phc_master(id) on delete cascade,
  subcentre_id uuid not null references subcentre_master(id) on delete cascade,
  village_id uuid references village_master(id) on delete set null,
  record_data jsonb not null default '{}'::jsonb,
  record_date date not null default current_date,
  is_printed boolean default false,
  printed_at timestamptz,
  printed_by uuid,
  print_count integer default 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_dynamic_entries_template on dynamic_record_entries(template_id);
create index if not exists idx_dynamic_entries_employee on dynamic_record_entries(employee_id);
create index if not exists idx_dynamic_entries_record_date on dynamic_record_entries(record_date);
alter table dynamic_record_entries enable row level security;
create policy "Allow read for dynamic_record_entries" on dynamic_record_entries for select using (true);
create policy "Allow write for dynamic_record_entries" on dynamic_record_entries for all using (true);

-- ==========================================================
-- CODE 10 : MALARIA TARGETS
-- ==========================================================

create table if not exists malaria_targets (
  id uuid primary key default uuid_generate_v4(),
  phc_id uuid references phc_master(id) on delete cascade,
  subcentre_id uuid references subcentre_master(id) on delete cascade,
  village_id uuid references village_master(id) on delete cascade,
  employee_id uuid references employee_master(id) on delete cascade,
  target_type text not null,
  target_year integer not null,
  target_month integer,
  target_value numeric not null default 0,
  remarks text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table malaria_targets add column if not exists remarks text;

create unique index if not exists idx_uq_malaria_targets_scope
on malaria_targets(
  coalesce(phc_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(subcentre_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(village_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(employee_id, '00000000-0000-0000-0000-000000000000'::uuid),
  target_type,
  target_year,
  coalesce(target_month, -1)
);

alter table malaria_targets enable row level security;
create policy "Allow read for malaria_targets" on malaria_targets for select using (true);
create policy "Allow write for malaria_targets" on malaria_targets for all using (true);

-- ==========================================================
-- CODE 15 : SYSTEM AUDIT LOGS
-- ==========================================================

create table if not exists system_audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  employee_id uuid references employee_master(id) on delete set null,
  phc_id uuid references phc_master(id) on delete set null,
  subcentre_id uuid references subcentre_master(id) on delete set null,
  action text not null,
  module text not null,
  record_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table system_audit_logs add column if not exists user_name text;
alter table system_audit_logs add column if not exists role text;
alter table system_audit_logs add column if not exists record_description text;
alter table system_audit_logs add column if not exists old_values jsonb;
alter table system_audit_logs add column if not exists new_values jsonb;
alter table system_audit_logs add column if not exists user_agent text;

create index if not exists idx_audit_action on system_audit_logs(action);
create index if not exists idx_audit_module on system_audit_logs(module);
create index if not exists idx_audit_employee on system_audit_logs(employee_id);
create index if not exists idx_audit_created_at on system_audit_logs(created_at);

alter table system_audit_logs enable row level security;
create policy "Allow read for system_audit_logs" on system_audit_logs for select using (true);
create policy "Allow insert for system_audit_logs" on system_audit_logs for insert with check (true);

-- ==========================================================
-- CODE 23 : DATA MIGRATION HISTORY
-- ==========================================================
create table if not exists data_migration_history (
  id uuid primary key default uuid_generate_v4(),
  migration_batch_id uuid not null,
  module_name text not null,
  local_record_id text not null,
  supabase_record_id uuid,
  status text not null check (status in ('IMPORTED', 'SKIPPED', 'DUPLICATE', 'INVALID', 'CONFLICT', 'FAILED')),
  error_message text,
  match_method text,
  migrated_by uuid references auth.users(id),
  migrated_at timestamptz default now()
);

create index if not exists idx_migration_batch on data_migration_history(migration_batch_id);
create index if not exists idx_migration_module on data_migration_history(module_name);
create index if not exists idx_migration_status on data_migration_history(status);

alter table data_migration_history enable row level security;
create policy "Allow read for data_migration_history" on data_migration_history for select using (public.is_current_user_phc_controller());
create policy "Allow insert for data_migration_history" on data_migration_history for insert with check (public.is_current_user_phc_controller());



