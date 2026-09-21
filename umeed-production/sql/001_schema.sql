-- UMEED Fee Management v3.0 - normalized centralized schema
create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  role text not null check (role in ('owner','admin','cashier','accountant','auditor')),
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_org_idx on public.profiles(org_id);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  class_name text not null,
  section text not null default '',
  status text not null default 'active' check (status in ('active','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists classes_unique_active on public.classes(org_id,lower(class_name),lower(section)) where status='active';

create table if not exists public.students (
  id uuid primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  roll_number text not null,
  student_name text not null,
  father_name text not null,
  class_id uuid not null references public.classes(id),
  phone_number text not null default '',
  status text not null default 'active' check (status in ('active','deleted')),
  source_device text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists students_roll_unique_active on public.students(org_id,class_id,lower(roll_number)) where status='active';
create unique index if not exists students_identity_unique_active on public.students(org_id,class_id,lower(student_name),lower(father_name)) where status='active';
create index if not exists students_org_class_idx on public.students(org_id,class_id);

create table if not exists public.settings (
  id uuid primary key,
  org_id uuid not null unique references public.organizations(id) on delete cascade,
  school_name text not null default 'UMEED Education System',
  school_phone text not null default '',
  school_address text not null default '',
  monthly_fee numeric(12,2) not null default 2000 check (monthly_fee=2000),
  annual_fund numeric(12,2) not null default 2150 check (annual_fund=2150),
  slip_prefix text not null default 'UES',
  next_receipt_no bigint not null default 1 check (next_receipt_no>0),
  prepared_by text not null default 'Admin/Cashier',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fee_entries (
  id uuid primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id),
  receipt_no text,
  fee_month smallint not null check (fee_month between 1 and 12),
  fee_year integer not null check (fee_year between 2020 and 2100),
  monthly_fee numeric(12,2) not null default 2000 check (monthly_fee=2000),
  cash_paid numeric(12,2) not null default 0 check (cash_paid>=0),
  discount numeric(12,2) not null default 0 check (discount>=0),
  fine numeric(12,2) not null default 0 check (fine>=0),
  annual_fund_paid numeric(12,2) not null default 0 check (annual_fund_paid>=0),
  payment_date date not null,
  notes text not null default '',
  source_device text not null default '',
  status text not null default 'active' check (status in ('active','reversed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists fee_receipt_unique on public.fee_entries(org_id,receipt_no) where receipt_no is not null;
create index if not exists fee_student_year_month_idx on public.fee_entries(org_id,student_id,fee_year,fee_month);

create table if not exists public.refunds (
  id uuid primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id),
  fee_entry_id uuid references public.fee_entries(id),
  fee_year integer not null check (fee_year between 2020 and 2100),
  amount numeric(12,2) not null check (amount>0),
  refund_date date not null,
  notes text not null default '',
  source_device text not null default '',
  status text not null default 'active' check (status in ('active','reversed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists refunds_student_year_idx on public.refunds(org_id,student_id,fee_year);

create table if not exists public.activity_log (
  id uuid primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  message text not null default '',
  amount numeric(12,2),
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists activity_org_created_idx on public.activity_log(org_id,created_at desc);

create table if not exists public.sync_metadata (
  id uuid primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  device_id text not null,
  last_sync_at timestamptz,
  pending_count integer not null default 0 check (pending_count>=0),
  updated_at timestamptz not null default now()
);
create index if not exists sync_org_idx on public.sync_metadata(org_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at=now();return new;end $$;

do $$ declare t text; begin
  foreach t in array array['organizations','profiles','classes','students','settings','fee_entries','refunds','activity_log','sync_metadata'] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I',t,t);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t);
  end loop;
end $$;
