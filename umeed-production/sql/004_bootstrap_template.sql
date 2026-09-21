-- UMEED ONE-TIME BOOTSTRAP TEMPLATE
-- 1) Create the first admin user in Supabase Authentication -> Users.
-- 2) Copy that user's UUID below.
-- 3) Run this file AFTER 001_schema.sql, 002_rls.sql, 003_finance_rpcs.sql.
-- Replace YOUR_AUTH_USER_UUID before running.

do $$
declare
  v_user uuid := 'YOUR_AUTH_USER_UUID'::uuid;
  v_org uuid := gen_random_uuid();
begin
  insert into public.organizations(id,name) values(v_org,'UMEED Education System');
  insert into public.profiles(id,org_id,role,display_name) values(v_user,v_org,'owner','UMEED Owner');
  insert into public.settings(id,org_id,school_name,monthly_fee,annual_fund,slip_prefix,next_receipt_no,prepared_by)
  values(v_org,v_org,'UMEED Education System',2000,2150,'UES',1,'Admin/Cashier');

  insert into public.classes(org_id,class_name,section) values
  (v_org,'Playgroup',''),(v_org,'Nursery',''),(v_org,'Prep',''),
  (v_org,'Class 1',''),(v_org,'Class 2',''),(v_org,'Class 3',''),(v_org,'Class 4',''),
  (v_org,'Class 5',''),(v_org,'Class 6',''),(v_org,'Class 7',''),(v_org,'Class 8',''),
  (v_org,'Class 9',''),(v_org,'Class 10',''),(v_org,'Hifz','');
end $$;
