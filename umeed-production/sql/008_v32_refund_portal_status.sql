-- UMEED v3.2 refund linkage and student portal status sync
alter table public.refunds add column if not exists fee_receipt_id uuid references public.fee_receipts(id);
create index if not exists refunds_fee_receipt_idx on public.refunds(fee_receipt_id);

create or replace function public.record_refund_v32(
  p_id uuid,p_student_id uuid,p_fee_receipt_id uuid,p_fee_year integer,p_amount numeric,
  p_refund_date date,p_notes text,p_source_device text
) returns public.refunds
language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  v_org uuid;v_role text;v_existing public.refunds%rowtype;v_row public.refunds%rowtype;v_paid numeric:=0;v_refunded numeric:=0;
begin
  select * into v_existing from public.refunds where id=p_id;if found then return v_existing;end if;
  select org_id,role into v_org,v_role from public.profiles where id=(select auth.uid());
  if v_org is null or v_role not in ('owner','admin','accountant','cashier') then raise exception 'Not authorized for refunds';end if;
  if coalesce(p_amount,0)<=0 then raise exception 'Refund amount must be greater than zero';end if;
  if not exists(select 1 from public.students where id=p_student_id and org_id=v_org) then raise exception 'Student not found';end if;
  if p_fee_receipt_id is not null and not exists(select 1 from public.fee_receipts where id=p_fee_receipt_id and student_id=p_student_id and org_id=v_org) then raise exception 'Related fee receipt not found';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text||':refund:'||p_fee_year::text,0));
  select
    coalesce((select sum(cash_paid+annual_fund_paid) from public.fee_entries where org_id=v_org and student_id=p_student_id and fee_year=p_fee_year and status='active'),0)
    +coalesce((select sum(coalesce(m.month_cash,0)+r.annual_fund_paid) from public.fee_receipts r left join (select receipt_id,sum(cash_paid) month_cash from public.fee_receipt_months group by receipt_id) m on m.receipt_id=r.id where r.org_id=v_org and r.student_id=p_student_id and r.fee_year=p_fee_year and r.status='active'),0)
  into v_paid;
  select coalesce(sum(amount),0) into v_refunded from public.refunds where org_id=v_org and student_id=p_student_id and fee_year=p_fee_year and status='active';
  if p_amount>greatest(v_paid-v_refunded,0) then raise exception 'Refund exceeds refundable cash paid';end if;
  insert into public.refunds(id,org_id,student_id,fee_receipt_id,fee_year,amount,refund_date,notes,source_device,status,created_by)
  values(p_id,v_org,p_student_id,p_fee_receipt_id,p_fee_year,p_amount,p_refund_date,coalesce(p_notes,''),coalesce(p_source_device,'client'),'active',(select auth.uid()))
  returning * into v_row;
  return v_row;
end $$;
revoke all on function public.record_refund_v32(uuid,uuid,uuid,integer,numeric,date,text,text) from public,anon;
grant execute on function public.record_refund_v32(uuid,uuid,uuid,integer,numeric,date,text,text) to authenticated;

create or replace function public.sync_student_account_status()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.student_accounts set status=case when new.status='active' then 'active' else 'disabled' end where student_id=new.id;
  return new;
end $$;
drop trigger if exists students_sync_portal_status on public.students;
create trigger students_sync_portal_status after update of status on public.students
for each row execute function public.sync_student_account_status();
