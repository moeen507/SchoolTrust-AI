UMEED EDUCATION SYSTEM — STUDENT FINANCE & SERVICES v3.2.0

WINDOWS
npm install
npm run start
npm run build:portable

ANDROID
npm install
npm run mobile:add
npm run mobile:sync
npm run mobile:open

CENTRAL DATABASE
Supabase project:
https://jqgwsgprqxfnvrmkpgyy.supabase.co

For a clean database run:
001_schema.sql
002_rls.sql
003_finance_rpcs.sql
004_bootstrap_template.sql
005_v31_student_services.sql
006_v32_auto_roll_multimonth.sql

v3.2 CORE
- Manual Add Student uses a centrally allocated, read-only roll number.
- Student identity requires Student Name, Parent/Guardian, Class, Roll Number, Phone/WhatsApp.
- Fee Entry supports one month, multiple months, or all pending months in ONE Fee Slip.
- Annual Fund installments reconcile on the same Fee Slip.
- Fee and Syllabus+Canteen keep separate auto-increment receipt series.
- Super Admin can create/delete Admin/Accountant/Cashier/Auditor accounts.
- Accountant receives Daily Collection + Fee Entry + Fee Slip + Syllabus/Canteen only.
- Student/data deletion requires password re-verification.

SECURITY
Only the publishable client key is shipped.
The manage-users Edge Function keeps secret/admin credentials server-side.
