-- UMEED v3.2 student self-service accounts and class history
alter table public.organizations add column if not exists code text;
update public.organizations set code='UMEED' where code is null or trim(code)='';
create unique index if not exists organizations_code_unique on public.organizations(lower(code));

create table if not exists public.student_accounts (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null unique references public.students(id) on delete cascade,
  login_id text not null,
  must_change_password boolean not null default true,
  status text not null default 'active' check(status in ('active','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists student_accounts_org_login_unique on public.student_accounts(org_id,lower(login_id));
create index if not exists student_accounts_student_idx on public.student_accounts(student_id);

create table if not exists public.student_class_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id),
  academic_year integer not null check(academic_year between 2020 and 2100),
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists student_class_history_student_idx on public.student_class_history(org_id,student_id,academic_year);

drop trigger if exists student_accounts_set_updated_at on public.student_accounts;
create trigger student_accounts_set_updated_at before update on public.student_accounts for each row execute function public.set_updated_at();
drop trigger if exists student_class_history_set_updated_at on public.student_class_history;
create trigger student_class_history_set_updated_at before update on public.student_class_history for each row execute function public.set_updated_at();

create or replace function public.track_student_class_history()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if tg_op='INSERT' then
    insert into public.student_class_history(org_id,student_id,class_id,academic_year,start_date)
    values(new.org_id,new.id,new.class_id,extract(year from current_date)::integer,current_date);
    return new;
  end if;
  if tg_op='UPDATE' and new.class_id is distinct from old.class_id then
    update public.student_class_history set end_date=current_date-1
    where org_id=new.org_id and student_id=new.id and end_date is null;
    insert into public.student_class_history(org_id,student_id,class_id,academic_year,start_date)
    values(new.org_id,new.id,new.class_id,extract(year from current_date)::integer,current_date);
  end if;
  return new;
end $$;

drop trigger if exists students_class_history on public.students;
create trigger students_class_history after insert or update of class_id on public.students
for each row execute function public.track_student_class_history();

insert into public.student_class_history(org_id,student_id,class_id,academic_year,start_date)
select s.org_id,s.id,s.class_id,extract(year from coalesce(s.created_at,now()))::integer,coalesce(s.created_at::date,current_date)
from public.students s
where not exists(select 1 from public.student_class_history h where h.student_id=s.id);

alter table public.student_accounts enable row level security;
alter table public.student_class_history enable row level security;
revoke all on public.student_accounts,public.student_class_history from anon;
grant select on public.student_accounts,public.student_class_history to authenticated;
grant insert,update on public.student_accounts,public.student_class_history to authenticated;

drop policy if exists student_accounts_self_select on public.student_accounts;
create policy student_accounts_self_select on public.student_accounts for select to authenticated
using(auth_user_id=(select auth.uid()));
drop policy if exists student_accounts_admin_select on public.student_accounts;
create policy student_accounts_admin_select on public.student_accounts for select to authenticated
using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=student_accounts.org_id and p.role in ('owner','admin')));

drop policy if exists student_history_admin_select on public.student_class_history;
create policy student_history_admin_select on public.student_class_history for select to authenticated
using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=student_class_history.org_id));
drop policy if exists student_history_self_select on public.student_class_history;
create policy student_history_self_select on public.student_class_history for select to authenticated
using(exists(select 1 from public.student_accounts sa where sa.auth_user_id=(select auth.uid()) and sa.student_id=student_class_history.student_id and sa.status='active'));

create or replace function public.get_student_portal_bundle()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_account public.student_accounts%rowtype;v_student public.students%rowtype;v_org public.organizations%rowtype;v_settings public.settings%rowtype;
begin
  select * into v_account from public.student_accounts where auth_user_id=(select auth.uid()) and status='active';
  if not found then raise exception 'Student account is not active';end if;
  select * into v_student from public.students where id=v_account.student_id and org_id=v_account.org_id and status='active';
  if not found then raise exception 'Student record not found';end if;
  select * into v_org from public.organizations where id=v_account.org_id;
  select * into v_settings from public.settings where org_id=v_account.org_id;
  return jsonb_build_object(
    'account',jsonb_build_object('student_id',v_account.student_id,'login_id',v_account.login_id,'must_change_password',v_account.must_change_password),
    'organization',to_jsonb(v_org),'settings',to_jsonb(v_settings),'student',to_jsonb(v_student),
    'classes',coalesce((select jsonb_agg(to_jsonb(c) order by c.class_name) from public.classes c where c.org_id=v_account.org_id and c.id in (select class_id from public.student_class_history where student_id=v_account.student_id union select v_student.class_id)),'[]'::jsonb),
    'class_history',coalesce((select jsonb_agg(to_jsonb(h) order by h.start_date desc) from public.student_class_history h where h.student_id=v_account.student_id),'[]'::jsonb),
    'class_fee_schedule',coalesce((select jsonb_agg(to_jsonb(fs) order by fs.fee_year,fs.class_id) from public.class_fee_schedule fs where fs.org_id=v_account.org_id and fs.class_id in (select class_id from public.student_class_history where student_id=v_account.student_id union select v_student.class_id)),'[]'::jsonb),
    'legacy_fee_entries',coalesce((select jsonb_agg(to_jsonb(f) order by f.payment_date desc,f.created_at desc) from public.fee_entries f where f.student_id=v_account.student_id and f.status='active'),'[]'::jsonb),
    'fee_receipts',coalesce((select jsonb_agg(to_jsonb(r) order by r.payment_date desc,r.created_at desc) from public.fee_receipts r where r.student_id=v_account.student_id and r.status='active'),'[]'::jsonb),
    'fee_receipt_months',coalesce((select jsonb_agg(to_jsonb(m) order by m.fee_year,m.fee_month) from public.fee_receipt_months m where m.student_id=v_account.student_id),'[]'::jsonb),
    'refunds',coalesce((select jsonb_agg(to_jsonb(r) order by r.refund_date desc,r.created_at desc) from public.refunds r where r.student_id=v_account.student_id and r.status='active'),'[]'::jsonb),
    'counter_sales',coalesce((select jsonb_agg(to_jsonb(s) order by s.sale_date desc,s.created_at desc) from public.counter_sales s where s.student_id=v_account.student_id and s.status='active'),'[]'::jsonb),
    'counter_sale_items',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at) from public.counter_sale_items i where i.sale_id in (select id from public.counter_sales where student_id=v_account.student_id and status='active')),'[]'::jsonb)
  );
end $$;
revoke all on function public.get_student_portal_bundle() from public,anon;
grant execute on function public.get_student_portal_bundle() to authenticated;

create or replace function public.mark_student_password_changed()
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.student_accounts set must_change_password=false where auth_user_id=(select auth.uid());
  return found;
end $$;
revoke all on function public.mark_student_password_changed() from public,anon;
grant execute on function public.mark_student_password_changed() to authenticated;
