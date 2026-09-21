-- UMEED Fee Management v3.0 - atomic finance and settings RPCs

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.next_receipt(p_org uuid)
returns text
language plpgsql
security definer
set search_path=private,public,pg_temp
as $$
declare
  v_role text;
  v_prefix text;
  v_next bigint;
begin
  select role into v_role
  from public.profiles
  where id=(select auth.uid()) and org_id=p_org;

  if v_role is null or v_role not in ('owner','admin','cashier','accountant') then
    raise exception 'Not authorized to allocate receipt numbers';
  end if;

  select slip_prefix,next_receipt_no
  into v_prefix,v_next
  from public.settings
  where org_id=p_org
  for update;

  if not found then raise exception 'Organization settings are missing';end if;

  update public.settings
  set next_receipt_no=v_next+1
  where org_id=p_org;

  return v_prefix||'-'||lpad(v_next::text,6,'0');
end $$;

revoke all on function private.next_receipt(uuid) from public,anon;
grant execute on function private.next_receipt(uuid) to authenticated;

create or replace function public.record_fee_entry(
  p_id uuid,p_student_id uuid,p_fee_month integer,p_fee_year integer,
  p_cash_paid numeric,p_discount numeric,p_fine numeric,p_annual_fund_paid numeric,
  p_payment_date date,p_notes text,p_source_device text
) returns public.fee_entries
language plpgsql
security invoker
set search_path=public,private,pg_temp
as $$
declare
  v_org uuid;v_role text;v_student public.students%rowtype;
  v_existing public.fee_entries%rowtype;v_row public.fee_entries%rowtype;
  v_cash numeric:=0;v_discount numeric:=0;v_fine numeric:=0;v_annual numeric:=0;
  v_remaining numeric;v_annual_remaining numeric;v_receipt text;
begin
  select * into v_existing from public.fee_entries where id=p_id;
  if found then return v_existing;end if;

  select org_id,role into v_org,v_role from public.profiles where id=(select auth.uid());
  if v_org is null or v_role not in ('owner','admin','cashier','accountant') then
    raise exception 'Not authorized for fee entry';
  end if;
  if p_fee_month not between 1 and 12 or p_fee_year not between 2020 and 2100 then
    raise exception 'Invalid fee month/year';
  end if;
  if coalesce(p_cash_paid,0)<0 or coalesce(p_discount,0)<0 or coalesce(p_fine,0)<0 or coalesce(p_annual_fund_paid,0)<0 then
    raise exception 'Amounts cannot be negative';
  end if;
  if coalesce(p_cash_paid,0)=0 and coalesce(p_discount,0)=0 and coalesce(p_fine,0)=0 and coalesce(p_annual_fund_paid,0)=0 then
    raise exception 'At least one fee amount is required';
  end if;

  select * into v_student from public.students
  where id=p_student_id and org_id=v_org and status='active';
  if not found then raise exception 'Student not found in this organization';end if;

  -- Serialize writes for this student to prevent two devices from paying the same remainder concurrently.
  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text||':'||p_fee_year::text,0));

  select coalesce(sum(cash_paid),0),coalesce(sum(discount),0),coalesce(sum(fine),0)
  into v_cash,v_discount,v_fine
  from public.fee_entries
  where org_id=v_org and student_id=p_student_id and fee_year=p_fee_year and fee_month=p_fee_month and status='active';

  v_remaining:=greatest(2000+v_fine-v_cash-v_discount,0);
  if v_remaining<=0 and (coalesce(p_cash_paid,0)>0 or coalesce(p_discount,0)>0 or coalesce(p_fine,0)>0) then
    raise exception 'Monthly fee is already clear';
  end if;
  if coalesce(p_cash_paid,0)+coalesce(p_discount,0)>v_remaining+coalesce(p_fine,0) then
    raise exception 'Cash plus discount exceeds remaining monthly balance';
  end if;

  select coalesce(sum(annual_fund_paid),0) into v_annual
  from public.fee_entries
  where org_id=v_org and student_id=p_student_id and fee_year=p_fee_year and status='active';

  v_annual_remaining:=greatest(2150-v_annual,0);
  if coalesce(p_annual_fund_paid,0)>v_annual_remaining then
    raise exception 'Annual Fund payment exceeds remaining balance';
  end if;

  v_receipt:=private.next_receipt(v_org);

  insert into public.fee_entries(
    id,org_id,student_id,receipt_no,fee_month,fee_year,monthly_fee,cash_paid,discount,fine,
    annual_fund_paid,payment_date,notes,source_device,status,created_by
  )
  values(
    p_id,v_org,p_student_id,v_receipt,p_fee_month,p_fee_year,2000,
    coalesce(p_cash_paid,0),coalesce(p_discount,0),coalesce(p_fine,0),coalesce(p_annual_fund_paid,0),
    p_payment_date,coalesce(p_notes,''),coalesce(p_source_device,''),'active',(select auth.uid())
  )
  returning * into v_row;

  return v_row;
end $$;

create or replace function public.record_refund(
  p_id uuid,p_student_id uuid,p_fee_entry_id uuid,p_fee_year integer,p_amount numeric,
  p_refund_date date,p_notes text,p_source_device text
) returns public.refunds
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_org uuid;v_role text;v_existing public.refunds%rowtype;v_row public.refunds%rowtype;
  v_paid numeric:=0;v_refunded numeric:=0;
begin
  select * into v_existing from public.refunds where id=p_id;
  if found then return v_existing;end if;

  select org_id,role into v_org,v_role from public.profiles where id=(select auth.uid());
  if v_org is null or v_role not in ('owner','admin','cashier','accountant') then
    raise exception 'Not authorized for refunds';
  end if;
  if coalesce(p_amount,0)<=0 then raise exception 'Refund amount must be greater than zero';end if;
  if not exists(select 1 from public.students where id=p_student_id and org_id=v_org) then
    raise exception 'Student not found';
  end if;
  if p_fee_entry_id is not null and not exists(
    select 1 from public.fee_entries where id=p_fee_entry_id and student_id=p_student_id and org_id=v_org
  ) then
    raise exception 'Related fee entry not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text||':refund:'||p_fee_year::text,0));

  select coalesce(sum(cash_paid+annual_fund_paid),0) into v_paid
  from public.fee_entries
  where org_id=v_org and student_id=p_student_id and fee_year=p_fee_year and status='active';

  select coalesce(sum(amount),0) into v_refunded
  from public.refunds
  where org_id=v_org and student_id=p_student_id and fee_year=p_fee_year and status='active';

  if p_amount>greatest(v_paid-v_refunded,0) then
    raise exception 'Refund exceeds refundable cash paid';
  end if;

  insert into public.refunds(
    id,org_id,student_id,fee_entry_id,fee_year,amount,refund_date,notes,source_device,status,created_by
  )
  values(
    p_id,v_org,p_student_id,p_fee_entry_id,p_fee_year,p_amount,p_refund_date,coalesce(p_notes,''),
    coalesce(p_source_device,''),'active',(select auth.uid())
  )
  returning * into v_row;

  return v_row;
end $$;

create or replace function public.update_app_settings(
  p_school_name text,p_school_phone text,p_school_address text,p_slip_prefix text,p_prepared_by text
) returns public.settings
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_org uuid;v_role text;v_row public.settings%rowtype;
begin
  select org_id,role into v_org,v_role from public.profiles where id=(select auth.uid());
  if v_org is null or v_role not in ('owner','admin') then
    raise exception 'Only an owner or admin may update settings';
  end if;

  update public.settings
  set school_name=coalesce(nullif(trim(p_school_name),''),'UMEED Education System'),
      school_phone=coalesce(trim(p_school_phone),''),
      school_address=coalesce(trim(p_school_address),''),
      monthly_fee=2000,
      annual_fund=2150,
      slip_prefix=coalesce(nullif(trim(p_slip_prefix),''),'UES'),
      prepared_by=coalesce(nullif(trim(p_prepared_by),''),'Admin/Cashier')
  where org_id=v_org
  returning * into v_row;

  if not found then raise exception 'Organization settings are missing';end if;
  return v_row;
end $$;

revoke all on function public.record_fee_entry(uuid,uuid,integer,integer,numeric,numeric,numeric,numeric,date,text,text) from public,anon;
grant execute on function public.record_fee_entry(uuid,uuid,integer,integer,numeric,numeric,numeric,numeric,date,text,text) to authenticated;

revoke all on function public.record_refund(uuid,uuid,uuid,integer,numeric,date,text,text) from public,anon;
grant execute on function public.record_refund(uuid,uuid,uuid,integer,numeric,date,text,text) to authenticated;

revoke all on function public.update_app_settings(text,text,text,text,text) from public,anon;
grant execute on function public.update_app_settings(text,text,text,text,text) to authenticated;
