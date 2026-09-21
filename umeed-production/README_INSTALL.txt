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

NETLIFY
For drag-and-drop deploy use:
UMEED-Fee-Management-v3.2.0-Netlify-Deploy.zip
Netlify hosts only the web/PWA frontend. Supabase remains the centralized database/Auth backend.

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
007_v32_student_accounts_portal.sql
008_v32_refund_portal_status.sql
009_v32_security_index_hardening.sql

EDGE FUNCTIONS
Deploy:
supabase/functions/manage-users
supabase/functions/student-accounts

v3.2 CORE
- Role-first login: Super Admin/Admin, Accountant, Student.
- Student Login ID is the Roll Number / Student ID.
- Student Portal is restricted to that student's own history.
- Manual Add Student allocates the next roll centrally.
- Import provisions Student Portal accounts and exports temporary credentials.
- Multi-month or full-year Fee Slip.
- Annual Fund reconciliation on the Fee Slip.
- Fee and Syllabus+Canteen have separate auto-increment receipt series.
- Accountant gets date-wise slip collection and fee/counter entry, not Settings/deletion.
- Defaulter alert begins from the 7th of each month with WhatsApp reminders.
- Destructive student/local/user actions require password verification.
