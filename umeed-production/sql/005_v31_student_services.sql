-- UMEED Fee Management v3.1.0
-- Adds class-wise fee schedule and one combined Syllabus + Canteen counter.
-- Exactly TWO receipt series:
--   1) Fee Entry
--   2) Syllabus + Canteen

alter table public.settings
  add column if not exists fee_receipt_prefix text not null default 'UES',
  add column if not exists next_fee_receipt_no bigint not null default 1,
  add column if not exists counter_receipt_prefix text not null default 'SC',
  add column if not exists next_counter_receipt_no bigint not null default 1;

update public.settings
set fee_receipt_prefix=coalesce(nullif(fee_receipt_prefix,''),nullif(slip_prefix,''),'UES'),
    next_fee_receipt_no=greatest(coalesce(next_fee_receipt_no,1),coalesce(next_receipt_no,1),1),
    counter_receipt_prefix=coalesce(nullif(counter_receipt_prefix,''),'SC'),
    next_counter_receipt_no=greatest(coalesce(next_counter_receipt_no,1),1);

alter table public.classes
  add column if not exists default_monthly_fee numeric(12,2) not null default 2000
  check (default_monthly_fee>=0);

create table if not exists public.class_fee_schedule(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  fee_year integer not null check(fee_year between 2020 and 2100),
  monthly_fee numeric(12,2) not null default 2000 check(monthly_fee>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id,class_id,fee_year)
);
create index if not exists class_fee_schedule_org_year_idx on public.class_fee_schedule(org_id,fee_year);
create index if not exists class_fee_schedule_class_idx on public.class_fee_schedule(class_id);

insert into public.class_fee_schedule(org_id,class_id,fee_year,monthly_fee)
select org_id,id,extract(year from current_date)::integer,coalesce(default_monthly_fee,2000)
from public.classes where status='active'
on conflict(org_id,class_id,fee_year) do nothing;

create table if not exists public.catalog_items(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  channel text not null check(channel in ('store','canteen')),
  item_code text not null default '',
  item_name text not null,
  unit_price numeric(12,2) not null default 0 check(unit_price>=0),
  status text not null default 'active' check(status in ('active','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists catalog_item_code_unique_active
on public.catalog_items(org_id,channel,lower(item_code))
where status='active' and item_code<>'';
create index if not exists catalog_items_org_channel_idx on public.catalog_items(org_id,channel);

create table if not exists public.counter_sales(
  id uuid primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id),
  channel text not null check(channel in ('store','canteen')),
  receipt_no text,
  sale_date date not null,
  subtotal numeric(12,2) not null default 0 check(subtotal>=0),
  total numeric(12,2) not null default 0 check(total>=0),
  notes text not null default '',
  source_device text not null default '',
  status text not null default 'active' check(status in ('active','reversed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists counter_sales_receipt_unique on public.counter_sales(org_id,receipt_no) where receipt_no is not null;
create index if not exists counter_sales_student_idx on public.counter_sales(student_id);
create index if not exists counter_sales_org_channel_date_idx on public.counter_sales(org_id,channel,sale_date desc);
create index if not exists counter_sales_created_by_idx on public.counter_sales(created_by);

create table if not exists public.counter_sale_items(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  sale_id uuid not null references public.counter_sales(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id),
  item_name text not null,
  quantity numeric(12,2) not null check(quantity>0),
  unit_price numeric(12,2) not null check(unit_price>=0),
  line_total numeric(12,2) not null check(line_total>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists counter_sale_items_org_id_idx on public.counter_sale_items(org_id);\ncreate index if not exists counter_sale_items_sale_idx on public.counter_sale_items(sale_id);
create index if not exists counter_sale_items_catalog_idx on public.counter_sale_items(catalog_item_id);

drop trigger if exists class_fee_schedule_set_updated_at on public.class_fee_schedule;
create trigger class_fee_schedule_set_updated_at before update on public.class_fee_schedule
for each row execute function public.set_updated_at();
drop trigger if exists catalog_items_set_updated_at on public.catalog_items;
create trigger catalog_items_set_updated_at before update on public.catalog_items
for each row execute function public.set_updated_at();
drop trigger if exists counter_sales_set_updated_at on public.counter_sales;
create trigger counter_sales_set_updated_at before update on public.counter_sales
for each row execute function public.set_updated_at();
drop trigger if exists counter_sale_items_set_updated_at on public.counter_sale_items;
create trigger counter_sale_items_set_updated_at before update on public.counter_sale_items
for each row execute function public.set_updated_at();

alter table public.class_fee_schedule enable row level security;
alter table public.catalog_items enable row level security;
alter table public.counter_sales enable row level security;
alter table public.counter_sale_items enable row level security;

revoke all on public.class_fee_schedule,public.catalog_items,public.counter_sales,public.counter_sale_items from anon;
grant select on public.class_fee_schedule,public.catalog_items,public.counter_sales,public.counter_sale_items to authenticated;
grant insert,update on public.class_fee_schedule,public.catalog_items,public.counter_sales,public.counter_sale_items to authenticated;

drop policy if exists class_fee_member_select on public.class_fee_schedule;
create policy class_fee_member_select on public.class_fee_schedule for select to authenticated
using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=class_fee_schedule.org_id));
drop policy if exists class_fee_admin_insert on public.class_fee_schedule;
create policy class_fee_admin_insert on public.class_fee_schedule for insert to authenticated
with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=class_fee_schedule.org_id and p.role in ('owner','admin')));
drop policy if exists class_fee_admin_update on public.class_fee_schedule;
create policy class_fee_admin_update on public.class_fee_schedule for update to authenticated
using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=class_fee_schedule.org_id and p.role in ('owner','admin')))
with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=class_fee_schedule.org_id and p.role in ('owner','admin')));

drop policy if exists catalog_member_select on public.catalog_items;
create policy catalog_member_select on public.catalog_items for select to authenticated
using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=catalog_items.org_id));
drop policy if exists catalog_admin_insert on public.catalog_items;
create policy catalog_admin_insert on public.catalog_items for insert to authenticated
with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=catalog_items.org_id and p.role in ('owner','admin')));
drop policy if exists catalog_admin_update on public.catalog_items;
create policy catalog_admin_update on public.catalog_items for update to authenticated
using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=catalog_items.org_id and p.role in ('owner','admin')))
with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=catalog_items.org_id and p.role in ('owner','admin')));

drop policy if exists counter_sales_member_select on public.counter_sales;
create policy counter_sales_member_select on public.counter_sales for select to authenticated
using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=counter_sales.org_id));
drop policy if exists counter_sales_finance_insert on public.counter_sales;
create policy counter_sales_finance_insert on public.counter_sales for insert to authenticated
with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=counter_sales.org_id and p.role in ('owner','admin','cashier','accountant')));
drop policy if exists counter_sales_admin_update on public.counter_sales;
create policy counter_sales_admin_update on public.counter_sales for update to authenticated
using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=counter_sales.org_id and p.role in ('owner','admin','accountant')))
with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=counter_sales.org_id and p.role in ('owner','admin','accountant')));

drop policy if exists counter_items_member_select on public.counter_sale_items;
create policy counter_items_member_select on public.counter_sale_items for select to authenticated
using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=counter_sale_items.org_id));
drop policy if exists counter_items_finance_insert on public.counter_sale_items;
create policy counter_items_finance_insert on public.counter_sale_items for insert to authenticated
with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=counter_sale_items.org_id and p.role in ('owner','admin','cashier','accountant')));
drop policy if exists counter_items_admin_update on public.counter_sale_items;
create policy counter_items_admin_update on public.counter_sale_items for update to authenticated
using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=counter_sale_items.org_id and p.role in ('owner','admin','accountant')))
with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=counter_sale_items.org_id and p.role in ('owner','admin','accountant')));

create or replace function private.next_receipt(p_org uuid)
returns text language plpgsql security definer set search_path=private,public,pg_temp
as $$
declare v_role text;v_prefix text;v_next bigint;
begin
  select role into v_role from public.profiles where id=(select auth.uid()) and org_id=p_org;
  if v_role is null or v_role not in ('owner','admin','cashier','accountant') then raise exception 'Not authorized to allocate fee receipt numbers';end if;
  select fee_receipt_prefix,next_fee_receipt_no into v_prefix,v_next from public.settings where org_id=p_org for update;
  if not found then raise exception 'Organization settings are missing';end if;
  update public.settings set next_fee_receipt_no=v_next+1,next_receipt_no=v_next+1,slip_prefix=v_prefix where org_id=p_org;
  return v_prefix||'-'||lpad(v_next::text,6,'0');
end $$;

create or replace function private.next_counter_receipt(p_org uuid)
returns text language plpgsql security definer set search_path=private,public,pg_temp
as $$
declare v_role text;v_prefix text;v_next bigint;
begin
  select role into v_role from public.profiles where id=(select auth.uid()) and org_id=p_org;
  if v_role is null or v_role not in ('owner','admin','cashier','accountant') then raise exception 'Not authorized to allocate counter receipt numbers';end if;
  select counter_receipt_prefix,next_counter_receipt_no into v_prefix,v_next from public.settings where org_id=p_org for update;
  if not found then raise exception 'Organization settings are missing';end if;
  update public.settings set next_counter_receipt_no=v_next+1 where org_id=p_org;
  return v_prefix||'-'||lpad(v_next::text,6,'0');
end $$;

revoke all on function private.next_receipt(uuid) from public,anon;
grant execute on function private.next_receipt(uuid) to authenticated;
revoke all on function private.next_counter_receipt(uuid) from public,anon;
grant execute on function private.next_counter_receipt(uuid) to authenticated;

create or replace function public.record_fee_entry(
  p_id uuid,p_student_id uuid,p_fee_month integer,p_fee_year integer,
  p_cash_paid numeric,p_discount numeric,p_fine numeric,p_annual_fund_paid numeric,
  p_payment_date date,p_notes text,p_source_device text
) returns public.fee_entries
language plpgsql security invoker set search_path=public,private,pg_temp
as $$
declare
  v_org uuid;v_role text;v_student public.students%rowtype;v_class_fee numeric;v_entry_fee numeric;v_monthly_fee numeric;
  v_existing public.fee_entries%rowtype;v_row public.fee_entries%rowtype;
  v_cash numeric:=0;v_discount numeric:=0;v_fine numeric:=0;v_annual numeric:=0;
  v_remaining numeric;v_annual_remaining numeric;v_receipt text;
begin
  select * into v_existing from public.fee_entries where id=p_id;
  if found then return v_existing;end if;
  select org_id,role into v_org,v_role from public.profiles where id=(select auth.uid());
  if v_org is null or v_role not in ('owner','admin','cashier','accountant') then raise exception 'Not authorized for fee entry';end if;
  if p_fee_month not between 1 and 12 or p_fee_year not between 2020 and 2100 then raise exception 'Invalid fee month/year';end if;
  if coalesce(p_cash_paid,0)<0 or coalesce(p_discount,0)<0 or coalesce(p_fine,0)<0 or coalesce(p_annual_fund_paid,0)<0 then raise exception 'Amounts cannot be negative';end if;
  if coalesce(p_cash_paid,0)=0 and coalesce(p_discount,0)=0 and coalesce(p_fine,0)=0 and coalesce(p_annual_fund_paid,0)=0 then raise exception 'At least one fee amount is required';end if;

  select * into v_student from public.students where id=p_student_id and org_id=v_org and status='active';
  if not found then raise exception 'Student not found in this organization';end if;

  select coalesce(fs.monthly_fee,c.default_monthly_fee,2000)
  into v_class_fee
  from public.classes c
  left join public.class_fee_schedule fs on fs.org_id=c.org_id and fs.class_id=c.id and fs.fee_year=p_fee_year
  where c.id=v_student.class_id and c.org_id=v_org;

  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text||':'||p_fee_year::text,0));

  select coalesce(sum(cash_paid),0),coalesce(sum(discount),0),coalesce(sum(fine),0),max(monthly_fee)
  into v_cash,v_discount,v_fine,v_entry_fee
  from public.fee_entries
  where org_id=v_org and student_id=p_student_id and fee_year=p_fee_year and fee_month=p_fee_month and status='active';

  v_monthly_fee:=coalesce(v_entry_fee,v_class_fee,2000);
  v_remaining:=greatest(v_monthly_fee+v_fine-v_cash-v_discount,0);
  if v_remaining<=0 and (coalesce(p_cash_paid,0)>0 or coalesce(p_discount,0)>0 or coalesce(p_fine,0)>0) then raise exception 'Monthly fee is already clear';end if;
  if coalesce(p_cash_paid,0)+coalesce(p_discount,0)>v_remaining+coalesce(p_fine,0) then raise exception 'Cash plus discount exceeds remaining monthly balance';end if;

  select coalesce(sum(annual_fund_paid),0) into v_annual from public.fee_entries
  where org_id=v_org and student_id=p_student_id and fee_year=p_fee_year and status='active';
  v_annual_remaining:=greatest(2150-v_annual,0);
  if coalesce(p_annual_fund_paid,0)>v_annual_remaining then raise exception 'Annual Fund payment exceeds remaining balance';end if;

  v_receipt:=private.next_receipt(v_org);
  insert into public.fee_entries(id,org_id,student_id,receipt_no,fee_month,fee_year,monthly_fee,cash_paid,discount,fine,annual_fund_paid,payment_date,notes,source_device,status,created_by)
  values(p_id,v_org,p_student_id,v_receipt,p_fee_month,p_fee_year,v_monthly_fee,coalesce(p_cash_paid,0),coalesce(p_discount,0),coalesce(p_fine,0),coalesce(p_annual_fund_paid,0),p_payment_date,coalesce(p_notes,''),coalesce(p_source_device,''),'active',(select auth.uid()))
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.upsert_class_fees_bulk(p_fee_year integer,p_fees jsonb)
returns setof public.class_fee_schedule
language plpgsql security invoker set search_path=public,pg_temp
as $$
declare v_org uuid;v_role text;v_item record;
begin
  select org_id,role into v_org,v_role from public.profiles where id=(select auth.uid());
  if v_role not in ('owner','admin') then raise exception 'Only owner/admin can update class fees';end if;
  if p_fee_year not between 2020 and 2100 then raise exception 'Invalid fee year';end if;
  for v_item in select * from jsonb_to_recordset(p_fees) as x(class_id uuid,monthly_fee numeric)
  loop
    if v_item.monthly_fee<0 then raise exception 'Invalid monthly fee';end if;
    insert into public.class_fee_schedule(org_id,class_id,fee_year,monthly_fee)
    values(v_org,v_item.class_id,p_fee_year,v_item.monthly_fee)
    on conflict(org_id,class_id,fee_year) do update set monthly_fee=excluded.monthly_fee;
  end loop;
  return query select * from public.class_fee_schedule where org_id=v_org and fee_year=p_fee_year order by class_id;
end $$;

create or replace function public.upsert_catalog_item(
  p_id uuid,p_channel text,p_item_code text,p_item_name text,p_unit_price numeric,p_status text default 'active'
) returns public.catalog_items
language plpgsql security invoker set search_path=public,pg_temp
as $$
declare v_org uuid;v_role text;v_row public.catalog_items%rowtype;
begin
  select org_id,role into v_org,v_role from public.profiles where id=(select auth.uid());
  if v_role not in ('owner','admin') then raise exception 'Only owner/admin can manage catalog items';end if;
  if p_channel not in ('store','canteen') or trim(coalesce(p_item_name,''))='' or coalesce(p_unit_price,-1)<0 then raise exception 'Invalid catalog item';end if;
  insert into public.catalog_items(id,org_id,channel,item_code,item_name,unit_price,status)
  values(coalesce(p_id,gen_random_uuid()),v_org,p_channel,trim(coalesce(p_item_code,'')),trim(p_item_name),p_unit_price,p_status)
  on conflict(id) do update set item_code=excluded.item_code,item_name=excluded.item_name,unit_price=excluded.unit_price,status=excluded.status
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.record_counter_sale(
  p_id uuid,p_student_id uuid,p_channel text,p_sale_date date,p_notes text,p_source_device text,p_items jsonb
) returns public.counter_sales
language plpgsql security invoker set search_path=public,private,pg_temp
as $$
declare
  v_org uuid;v_role text;v_receipt text;v_total numeric:=0;v_row public.counter_sales%rowtype;
  v_item record;v_name text;v_price numeric;v_qty numeric;v_catalog uuid;
begin
  if exists(select 1 from public.counter_sales where id=p_id) then select * into v_row from public.counter_sales where id=p_id;return v_row;end if;
  select org_id,role into v_org,v_role from public.profiles where id=(select auth.uid());
  if v_role not in ('owner','admin','cashier','accountant') then raise exception 'Not authorized for Syllabus/Canteen sales';end if;
  if p_channel not in ('store','canteen') then raise exception 'Invalid item category';end if;
  if not exists(select 1 from public.students where id=p_student_id and org_id=v_org and status='active') then raise exception 'Student not found';end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'At least one sale item is required';end if;

  perform pg_advisory_xact_lock(hashtextextended(v_org::text||':student-counter:receipt',0));
  v_receipt:=private.next_counter_receipt(v_org);

  insert into public.counter_sales(id,org_id,student_id,channel,receipt_no,sale_date,subtotal,total,notes,source_device,status,created_by)
  values(p_id,v_org,p_student_id,p_channel,v_receipt,p_sale_date,0,0,coalesce(p_notes,''),coalesce(p_source_device,''),'active',(select auth.uid()))
  returning * into v_row;

  for v_item in select * from jsonb_to_recordset(p_items) as x(catalog_item_id uuid,item_name text,quantity numeric,unit_price numeric)
  loop
    v_qty:=coalesce(v_item.quantity,0);if v_qty<=0 then raise exception 'Sale quantity must be greater than zero';end if;
    v_catalog:=v_item.catalog_item_id;
    if v_catalog is not null then
      select item_name,unit_price into v_name,v_price from public.catalog_items where id=v_catalog and org_id=v_org and channel=p_channel and status='active';
      if not found then raise exception 'Catalog item not found';end if;
    else
      v_name:=trim(coalesce(v_item.item_name,''));v_price:=coalesce(v_item.unit_price,-1);
      if v_name='' or v_price<0 then raise exception 'Invalid custom sale item';end if;
    end if;
    insert into public.counter_sale_items(org_id,sale_id,catalog_item_id,item_name,quantity,unit_price,line_total)
    values(v_org,p_id,v_catalog,v_name,v_qty,v_price,round(v_qty*v_price,2));
    v_total:=v_total+round(v_qty*v_price,2);
  end loop;

  update public.counter_sales set subtotal=v_total,total=v_total where id=p_id returning * into v_row;
  return v_row;
end $$;

create or replace function public.update_app_settings_v31(
  p_school_name text,p_school_phone text,p_school_address text,p_fee_prefix text,p_counter_prefix text,p_prepared_by text
) returns public.settings
language plpgsql security invoker set search_path=public,pg_temp
as $$
declare v_org uuid;v_role text;v_row public.settings%rowtype;
begin
  select org_id,role into v_org,v_role from public.profiles where id=(select auth.uid());
  if v_role not in ('owner','admin') then raise exception 'Only owner/admin can update settings';end if;
  update public.settings set
    school_name=coalesce(nullif(trim(p_school_name),''),'UMEED Education System'),
    school_phone=coalesce(trim(p_school_phone),''),
    school_address=coalesce(trim(p_school_address),''),
    fee_receipt_prefix=upper(coalesce(nullif(trim(p_fee_prefix),''),'UES')),
    slip_prefix=upper(coalesce(nullif(trim(p_fee_prefix),''),'UES')),
    counter_receipt_prefix=upper(coalesce(nullif(trim(p_counter_prefix),''),'SC')),
    prepared_by=coalesce(nullif(trim(p_prepared_by),''),'Admin/Cashier')
  where org_id=v_org returning * into v_row;
  return v_row;
end $$;

create or replace function public.update_receipt_counters(p_next_fee bigint,p_next_counter bigint)
returns public.settings
language plpgsql security invoker set search_path=public,pg_temp
as $$
declare v_org uuid;v_role text;v_row public.settings%rowtype;v_cur public.settings%rowtype;
begin
  select org_id,role into v_org,v_role from public.profiles where id=(select auth.uid());
  if v_role not in ('owner','admin') then raise exception 'Only owner/admin can update receipt counters';end if;
  select * into v_cur from public.settings where org_id=v_org for update;
  if p_next_fee<v_cur.next_fee_receipt_no or p_next_counter<v_cur.next_counter_receipt_no then raise exception 'Receipt counters cannot be moved backwards';end if;
  update public.settings set next_fee_receipt_no=p_next_fee,next_receipt_no=p_next_fee,next_counter_receipt_no=p_next_counter where org_id=v_org returning * into v_row;
  return v_row;
end $$;

revoke all on function public.upsert_class_fees_bulk(integer,jsonb) from public,anon;
grant execute on function public.upsert_class_fees_bulk(integer,jsonb) to authenticated;
revoke all on function public.upsert_catalog_item(uuid,text,text,text,numeric,text) from public,anon;
grant execute on function public.upsert_catalog_item(uuid,text,text,text,numeric,text) to authenticated;
revoke all on function public.record_counter_sale(uuid,uuid,text,date,text,text,jsonb) from public,anon;
grant execute on function public.record_counter_sale(uuid,uuid,text,date,text,text,jsonb) to authenticated;
revoke all on function public.update_app_settings_v31(text,text,text,text,text,text) from public,anon;
grant execute on function public.update_app_settings_v31(text,text,text,text,text,text) to authenticated;
revoke all on function public.update_receipt_counters(bigint,bigint) from public,anon;
grant execute on function public.update_receipt_counters(bigint,bigint) to authenticated;
