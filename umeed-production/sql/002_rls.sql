-- UMEED Fee Management v3.0 - grants and row level security
revoke all on public.organizations,public.profiles,public.classes,public.students,public.settings,public.fee_entries,public.refunds,public.activity_log,public.sync_metadata from anon;
grant select on public.organizations,public.profiles,public.classes,public.students,public.settings,public.fee_entries,public.refunds,public.activity_log,public.sync_metadata to authenticated;
grant insert,update on public.classes,public.students,public.settings,public.fee_entries,public.refunds,public.activity_log,public.sync_metadata to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.settings enable row level security;
alter table public.fee_entries enable row level security;
alter table public.refunds enable row level security;
alter table public.activity_log enable row level security;
alter table public.sync_metadata enable row level security;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select to authenticated
using (id=(select auth.uid()));

drop policy if exists org_member_select on public.organizations;
create policy org_member_select on public.organizations for select to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=organizations.id));

drop policy if exists classes_member_select on public.classes;
create policy classes_member_select on public.classes for select to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=classes.org_id));
drop policy if exists classes_admin_insert on public.classes;
create policy classes_admin_insert on public.classes for insert to authenticated
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=classes.org_id and p.role in ('owner','admin')));
drop policy if exists classes_admin_update on public.classes;
create policy classes_admin_update on public.classes for update to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=classes.org_id and p.role in ('owner','admin')))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=classes.org_id and p.role in ('owner','admin')));

drop policy if exists students_member_select on public.students;
create policy students_member_select on public.students for select to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=students.org_id));
drop policy if exists students_admin_insert on public.students;
create policy students_admin_insert on public.students for insert to authenticated
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=students.org_id and p.role in ('owner','admin')));
drop policy if exists students_admin_update on public.students;
create policy students_admin_update on public.students for update to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=students.org_id and p.role in ('owner','admin')))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=students.org_id and p.role in ('owner','admin')));

drop policy if exists settings_member_select on public.settings;
create policy settings_member_select on public.settings for select to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=settings.org_id));
drop policy if exists settings_admin_insert on public.settings;
create policy settings_admin_insert on public.settings for insert to authenticated
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=settings.org_id and p.role in ('owner','admin')));
drop policy if exists settings_admin_update on public.settings;
create policy settings_admin_update on public.settings for update to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=settings.org_id and p.role in ('owner','admin')))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=settings.org_id and p.role in ('owner','admin')));

drop policy if exists fees_member_select on public.fee_entries;
create policy fees_member_select on public.fee_entries for select to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=fee_entries.org_id));
drop policy if exists fees_finance_insert on public.fee_entries;
create policy fees_finance_insert on public.fee_entries for insert to authenticated
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=fee_entries.org_id and p.role in ('owner','admin','cashier','accountant')));
drop policy if exists fees_finance_update on public.fee_entries;
create policy fees_finance_update on public.fee_entries for update to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=fee_entries.org_id and p.role in ('owner','admin','accountant')))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=fee_entries.org_id and p.role in ('owner','admin','accountant')));

drop policy if exists refunds_member_select on public.refunds;
create policy refunds_member_select on public.refunds for select to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=refunds.org_id));
drop policy if exists refunds_finance_insert on public.refunds;
create policy refunds_finance_insert on public.refunds for insert to authenticated
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=refunds.org_id and p.role in ('owner','admin','cashier','accountant')));
drop policy if exists refunds_finance_update on public.refunds;
create policy refunds_finance_update on public.refunds for update to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=refunds.org_id and p.role in ('owner','admin','accountant')))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=refunds.org_id and p.role in ('owner','admin','accountant')));

drop policy if exists activity_member_select on public.activity_log;
create policy activity_member_select on public.activity_log for select to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=activity_log.org_id));
drop policy if exists activity_member_insert on public.activity_log;
create policy activity_member_insert on public.activity_log for insert to authenticated
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=activity_log.org_id));

drop policy if exists sync_member_select on public.sync_metadata;
create policy sync_member_select on public.sync_metadata for select to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=sync_metadata.org_id));
drop policy if exists sync_member_insert on public.sync_metadata;
create policy sync_member_insert on public.sync_metadata for insert to authenticated
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=sync_metadata.org_id));
drop policy if exists sync_member_update on public.sync_metadata;
create policy sync_member_update on public.sync_metadata for update to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=sync_metadata.org_id))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.org_id=sync_metadata.org_id));
