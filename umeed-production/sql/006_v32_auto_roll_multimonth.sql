-- UMEED v3.2.0
-- Auto student roll allocation + multi-month Fee Slips + linked refunds.
-- Apply AFTER 005_v31_student_services.sql on an existing v3.1 database.

alter table public.settings
  add column if not exists next_student_roll_no bigint not null default 1 check(next_student_roll_no>0);

drop index if exists public.students_roll_unique_active;
create unique index if not exists students_roll_unique_active
on public.students(org_id,lower(roll_number))
where status='active';

update public.settings s
set next_student_roll_no=greatest(
  s.next_student_roll_no,
  coalesce((select max(st.roll_number::bigint)+1 from public.students st
            where st.org_id=s.org_id and st.status='active' and st.roll_number ~ '^[0-9]+$'),1)
);

create or replace function public.bump_student_roll_counter()
returns trigger language plpgsql set search_path=public,pg_temp
as $$
begin
  if new.status='active' and new.roll_number ~ '^[0-9]+$' then
    update public.settings
    set next_student_roll_no=greatest(next_student_roll_no,new.roll_number::bigint+1)
    where org_id=new.org_id;
  end if;
  return new;
end $$;

drop trigger if exists students_bump_roll_counter on public.students;
create trigger students_bump_roll_counter
after insert or update of roll_number,status on public.students
for each row execute function public.bump_student_roll_counter();

create or replace function public.create_student_auto_roll(
  p_id uuid,p_student_name text,p_guardian_name text,p_class_id uuid,p_phone_number text,p_source_device text
) returns public.students
language plpgsql security invoker set search_path=public,pg_temp
as $$
declare v_org uuid;v_role text;v_next bigint;v_row public.students%rowtype;
begin
  select org_id,role into v_org,v_role from public.profiles where id=(select auth.uid());
  if v_org is null or v_role not in ('owner','super_admin','admin') then raise exception 'Not authorized to add students';end if;
  if trim(coalesce(p_student_name,''))='' or trim(coalesce(p_guardian_name,''))='' or trim(coalesce(p_phone_number,''))='' then
    raise exception 'Student, Parent/Guardian and Phone are required';
  end if;
  if not exists(select 1 from public.classes where id=p_class_id and org_id=v_org and status='active') then raise exception 'Invalid class';end if;
  if exists(select 1 from public.students where org_id=v_org and class_id=p_class_id and status='active' and lower(student_name)=lower(trim(p_student_name)) and lower(father_name)=lower(trim(p_guardian_name))) then
    raise exception 'Duplicate student name + guardian + class';
  end if;

  select next_student_roll_no into v_next from public.settings where org_id=v_org for update;
  if not found then raise exception 'Organization settings missing';end if;
  update public.settings set next_student_roll_no=v_next+1 where org_id=v_org;

  insert into public.students(id,org_id,roll_number,student_name,father_name,class_id,phone_number,status,source_device,created_at,updated_at)
  values(p_id,v_org,v_next::text,trim(p_student_name),trim(p_guardian_name),p_class_id,trim(p_phone_number),'active',coalesce(p_source_device,'client'),now(),now())
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.reconcile_student_roll_counter()
returns bigint
language plpgsql security invoker set search_path=public,pg_temp
as $$
declare v_org uuid;v_role text;v_next bigint;
begin
  select org_id,role into v_org,v_role from public.profiles where id=(select auth.uid());
  if v_role not in ('owner','super_admin','admin') then raise exception 'Not authorized';end if;
  select greatest(
    coalesce((select max(roll_number::bigint)+1 from public.students where org_id=v_org and status='active' and roll_number ~ '^[0-9]+$'),1),
    coalesce((select next_student_roll_no from public.settings where org_id=v_org),1)
  ) into v_next;
  update public.settings set next_student_roll_no=v_next where org_id=v_org;
  return v_next;
end $$;

revoke all on function public.create_student_auto_roll(uuid,text,text,uuid,text,text) from public,anon;
grant execute on function public.create_student_auto_roll(uuid,text,text,uuid,text,text) to authenticated;
revoke all on function public.reconcile_student_roll_counter() from public,anon;
grant execute on function public.reconcile_student_roll_counter() to authenticated;

create table if not exists public.fee_receipts(
  id uuid primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id),
  receipt_no text not null,
  fee_year integer not null check(fee_year between 2020 and 2100),
  payment_date date not null,
  annual_fund_paid numeric(12,2) not null default 0 check(annual_fund_paid>=0),
  notes text not null default '',
  source_device text not null default '',
  status text not null default 'active' check(status in ('active','reversed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists fee_receipts_receipt_unique on public.fee_receipts(org_id,receipt_no);
create index if not exists fee_receipts_student_year_idx on public.fee_receipts(org_id,student_id,fee_year);
create index if not exists fee_receipts_date_idx on public.fee_receipts(org_id,payment_date desc);

create table if not exists public.fee_receipt_months(
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  receipt_id uuid not null references public.fee_receipts(id) on delete cascade,
  student_id uuid not null references public.students(id),
  fee_month smallint not null check(fee_month between 1 and 12),
  fee_year integer not null check(fee_year between 2020 and 2100),
  monthly_fee numeric(12,2) not null check(monthly_fee>=0),
  cash_paid numeric(12,2) not null default 0 check(cash_paid>=0),
  discount numeric(12,2) not null default 0 check(discount>=0),
  fine numeric(12,2) not null default 0 check(fine>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fee_receipt_months_receipt_idx on public.fee_receipt_months(receipt_id);
create index if not exists fee_receipt_months_student_month_idx on public.fee_receipt_months(org_id,student_id,fee_year,fee_month);

drop trigger if exists fee_receipts_set_updated_at on public.fee_receipts;
create trigger fee_receipts_set_updated_at before update on public.fee_receipts
for each row execute function public.set_updated_at();
drop trigger if exists fee_receipt_months_set_updated_at on public.fee_receipt_months;
create trigger fee_receipt_months_set_updated_at before update on public.fee_receipt_months
for each row execute function public.set_updated_at();

alter table public.fee_receipts enable row level security;
alter table public.fee_receipt_months enable row level security;
revoke all on public.fee_receipts,public.fee_receipt_months from anon;
grant select on public.fee_receipts,public.fee_receipt_months to authenticated;
grant insert,update on public.fee_receipts,public.fee_receipt_months to authenticated;

drop policy if exists fee_receipts_member_select on public.fee_receipts;
create policy fee_receipts_member_select on public.fee_receipts for select to authenticated
using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=fee_receipts.org_id));
drop policy if exists fee_receipts_finance_insert on public.fee_receipts;
create policy fee_receipts_finance_insert on public.fee_receipts for insert to authenticated
with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=fee_receipts.org_id and p.role in ('owner','super_admin','admin','accountant','cashier')));
drop policy if exists fee_receipts_admin_update on public.fee_receipts;
create policy fee_receipts_admin_update on public.fee_receipts for update to authenticated
using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=fee_receipts.org_id and p.role in ('owner','super_admin','admin')))
with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=fee_receipts.org_id and p.role in ('owner','super_admin','admin')));

drop policy if exists fee_receipt_months_member_select on public.fee_receipt_months;
create policy fee_receipt_months_member_select on public.fee_receipt_months for select to authenticated
using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=fee_receipt_months.org_id));
drop policy if exists fee_receipt_months_finance_insert on public.fee_receipt_months;
create policy fee_receipt_months_finance_insert on public.fee_receipt_months for insert to authenticated
with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=fee_receipt_months.org_id and p.role in ('owner','super_admin','admin','accountant','cashier')));
drop policy if exists fee_receipt_months_admin_update on public.fee_receipt_months;
create policy fee_receipt_months_admin_update on public.fee_receipt_months for update to authenticated
using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=fee_receipt_months.org_id and p.role in ('owner','super_admin','admin')))
with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=fee_receipt_months.org_id and p.role in ('owner','super_admin','admin')));

create or replace function public.record_fee_receipt_v32(
  p_id uuid,p_student_id uuid,p_fee_year integer,p_payment_date date,p_annual_fund_paid numeric,
  p_notes text,p_source_device text,p_months jsonb
) returns public.fee_receipts
language plpgsql security invoker set search_path=public,private,pg_temp
as $$
declare
  v_org uuid;v_role text;v_student public.students%rowtype;v_receipt public.fee_receipts%rowtype;
  v_receipt_no text;v_item record;v_class_fee numeric;v_snapshot_fee numeric;
  v_existing_cash numeric;v_existing_discount numeric;v_existing_fine numeric;
  v_remaining numeric;v_annual_paid numeric;v_annual_remaining numeric;v_line_count integer:=0;
begin
  select * into v_receipt from public.fee_receipts where id=p_id;
  if found then return v_receipt;end if;
  select org_id,role into v_org,v_role from public.profiles where id=(select auth.uid());
  if v_org is null or v_role not in ('owner','super_admin','admin','accountant','cashier') then raise exception 'Not authorized for fee entry';end if;
  if p_fee_year not between 2020 and 2100 then raise exception 'Invalid fee year';end if;
  if coalesce(p_annual_fund_paid,0)<0 then raise exception 'Annual Fund cannot be negative';end if;

  select * into v_student from public.students where id=p_student_id and org_id=v_org and status='active';
  if not found then raise exception 'Student not found';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text||':'||p_fee_year::text,0));

  select coalesce(sum(annual_fund_paid),0) into v_annual_paid
  from (
    select annual_fund_paid from public.fee_entries where org_id=v_org and student_id=p_student_id and fee_year=p_fee_year and status='active'
    union all
    select annual_fund_paid from public.fee_receipts where org_id=v_org and student_id=p_student_id and fee_year=p_fee_year and status='active'
  ) x;
  v_annual_remaining:=greatest(2150-v_annual_paid,0);
  if coalesce(p_annual_fund_paid,0)>v_annual_remaining then raise exception 'Annual Fund payment exceeds remaining balance';end if;

  if p_months is not null and jsonb_typeof(p_months)='array' then v_line_count:=jsonb_array_length(p_months);end if;
  if v_line_count=0 and coalesce(p_annual_fund_paid,0)=0 then raise exception 'Select at least one month or enter Annual Fund payment';end if;

  v_receipt_no:=private.next_receipt(v_org);
  insert into public.fee_receipts(id,org_id,student_id,receipt_no,fee_year,payment_date,annual_fund_paid,notes,source_device,status,created_by)
  values(p_id,v_org,p_student_id,v_receipt_no,p_fee_year,p_payment_date,coalesce(p_annual_fund_paid,0),coalesce(p_notes,''),coalesce(p_source_device,'client'),'active',(select auth.uid()))
  returning * into v_receipt;

  for v_item in
    select * from jsonb_to_recordset(coalesce(p_months,'[]'::jsonb))
    as x(fee_month integer,cash_paid numeric,discount numeric,fine numeric)
  loop
    if v_item.fee_month not between 1 and 12 then raise exception 'Invalid fee month';end if;
    if coalesce(v_item.cash_paid,0)<0 or coalesce(v_item.discount,0)<0 or coalesce(v_item.fine,0)<0 then raise exception 'Amounts cannot be negative';end if;

    select coalesce(fs.monthly_fee,c.default_monthly_fee,2000) into v_class_fee
    from public.classes c left join public.class_fee_schedule fs
      on fs.org_id=c.org_id and fs.class_id=c.id and fs.fee_year=p_fee_year
    where c.id=v_student.class_id and c.org_id=v_org;

    select max(monthly_fee) into v_snapshot_fee
    from (
      select monthly_fee from public.fee_entries where org_id=v_org and student_id=p_student_id and fee_year=p_fee_year and fee_month=v_item.fee_month and status='active'
      union all
      select monthly_fee from public.fee_receipt_months where org_id=v_org and student_id=p_student_id and fee_year=p_fee_year and fee_month=v_item.fee_month
    ) f;
    v_snapshot_fee:=coalesce(v_snapshot_fee,v_class_fee,2000);

    select coalesce(sum(cash_paid),0),coalesce(sum(discount),0),coalesce(sum(fine),0)
    into v_existing_cash,v_existing_discount,v_existing_fine
    from (
      select cash_paid,discount,fine from public.fee_entries where org_id=v_org and student_id=p_student_id and fee_year=p_fee_year and fee_month=v_item.fee_month and status='active'
      union all
      select cash_paid,discount,fine from public.fee_receipt_months where org_id=v_org and student_id=p_student_id and fee_year=p_fee_year and fee_month=v_item.fee_month
    ) m;

    v_remaining:=greatest(v_snapshot_fee+v_existing_fine-v_existing_cash-v_existing_discount,0);
    if v_remaining<=0 and (coalesce(v_item.cash_paid,0)>0 or coalesce(v_item.discount,0)>0 or coalesce(v_item.fine,0)>0) then raise exception 'Month % is already clear',v_item.fee_month;end if;
    if coalesce(v_item.cash_paid,0)+coalesce(v_item.discount,0)>v_remaining+coalesce(v_item.fine,0) then raise exception 'Payment exceeds pending balance for month %',v_item.fee_month;end if;

    insert into public.fee_receipt_months(org_id,receipt_id,student_id,fee_month,fee_year,monthly_fee,cash_paid,discount,fine)
    values(v_org,p_id,p_student_id,v_item.fee_month,p_fee_year,v_snapshot_fee,coalesce(v_item.cash_paid,0),coalesce(v_item.discount,0),coalesce(v_item.fine,0));
  end loop;
  return v_receipt;
end $$;

revoke all on function public.record_fee_receipt_v32(uuid,uuid,integer,date,numeric,text,text,jsonb) from public,anon;
grant execute on function public.record_fee_receipt_v32(uuid,uuid,integer,date,numeric,text,text,jsonb) to authenticated;

alter table public.refunds add column if not exists fee_receipt_id uuid references public.fee_receipts(id);
create index if not exists refunds_fee_receipt_idx on public.refunds(fee_receipt_id);

create or replace function public.record_refund_v32(
  p_id uuid,p_student_id uuid,p_fee_receipt_id uuid,p_fee_year integer,p_amount numeric,
  p_refund_date date,p_notes text,p_source_device text
) returns public.refunds
language plpgsql security invoker set search_path=public,pg_temp
as $$
declare v_org uuid;v_role text;v_existing public.refunds%rowtype;v_row public.refunds%rowtype;v_paid numeric:=0;v_refunded numeric:=0;
begin
  select * into v_existing from public.refunds where id=p_id;if found then return v_existing;end if;
  select org_id,role into v_org,v_role from public.profiles where id=(select auth.uid());
  if v_org is null or v_role not in ('owner','super_admin','admin','accountant','cashier') then raise exception 'Not authorized for refunds';end if;
  if coalesce(p_amount,0)<=0 then raise exception 'Refund amount must be greater than zero';end if;
  if not exists(select 1 from public.students where id=p_student_id and org_id=v_org) then raise exception 'Student not found';end if;
  if p_fee_receipt_id is not null and not exists(select 1 from public.fee_receipts where id=p_fee_receipt_id and student_id=p_student_id and org_id=v_org) then raise exception 'Related fee receipt not found';end if;

  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text||':refund:'||p_fee_year::text,0));

  select
    coalesce((select sum(cash_paid+annual_fund_paid) from public.fee_entries where org_id=v_org and student_id=p_student_id and fee_year=p_fee_year and status='active'),0)
    +
    coalesce((select sum(coalesce(m.month_cash,0)+r.annual_fund_paid)
              from public.fee_receipts r
              left join (select receipt_id,sum(cash_paid) month_cash from public.fee_receipt_months group by receipt_id) m on m.receipt_id=r.id
              where r.org_id=v_org and r.student_id=p_student_id and r.fee_year=p_fee_year and r.status='active'),0)
  into v_paid;

  select coalesce(sum(amount),0) into v_refunded from public.refunds
  where org_id=v_org and student_id=p_student_id and fee_year=p_fee_year and status='active';

  if p_amount>greatest(v_paid-v_refunded,0) then raise exception 'Refund exceeds refundable cash paid';end if;

  insert into public.refunds(id,org_id,student_id,fee_receipt_id,fee_year,amount,refund_date,notes,source_device,status,created_by)
  values(p_id,v_org,p_student_id,p_fee_receipt_id,p_fee_year,p_amount,p_refund_date,coalesce(p_notes,''),coalesce(p_source_device,'client'),'active',(select auth.uid()))
  returning * into v_row;
  return v_row;
end $$;

revoke all on function public.record_refund_v32(uuid,uuid,uuid,integer,numeric,date,text,text) from public,anon;
grant execute on function public.record_refund_v32(uuid,uuid,uuid,integer,numeric,date,text,text) to authenticated;
