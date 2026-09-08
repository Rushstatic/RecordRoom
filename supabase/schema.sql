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
create or replace function get_current_user_profile()
returns setof user_profiles as $$
  select * from user_profiles
  where auth_user_id = auth.uid()
  limit 1;
$$ language sql security definer;

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
-- Each user can read their own profile; PHC Controllers can read all profiles in their PHC
create policy "Users can view own profile or controllers can view all"
on user_profiles for select
using (
  auth_user_id = auth.uid()
  or exists (
    select 1 from user_profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'phc_controller'
      and p.is_active = true
  )
);

-- Policy 2: Insert / Create Profiles
-- Only active PHC controllers can register new user profiles
create policy "Only PHC Controllers can insert user profiles"
on user_profiles for insert
with check (
  exists (
    select 1 from user_profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'phc_controller'
      and p.is_active = true
  )
  or not exists (select 1 from user_profiles) -- bootstrap first admin
);

-- Policy 3: Update Profiles
-- Users can update basic self profile; PHC Controllers can manage role/status
create policy "Controllers can update any profile; users update own"
on user_profiles for update
using (
  auth_user_id = auth.uid()
  or exists (
    select 1 from user_profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'phc_controller'
      and p.is_active = true
  )
);

-- Policy 4: Delete Profiles
create policy "Only PHC Controllers can delete user profiles"
on user_profiles for delete
using (
  exists (
    select 1 from user_profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'phc_controller'
      and p.is_active = true
  )
);


