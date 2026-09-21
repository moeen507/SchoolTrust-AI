UMEED EDUCATION SYSTEM — STUDENT FINANCE & SERVICES v3.1.0

WINDOWS
1. Install Node.js 22 LTS or newer.
2. Open PowerShell/Command Prompt in this folder.
3. Run:
   npm install
   npm run start
4. Windows package:
   npm run build:portable

ANDROID
1. Install Node.js 22+, JDK 21 and Android Studio.
2. Run:
   npm install
   npm run mobile:add
   npm run mobile:sync
   npm run mobile:open

CENTRAL DATABASE
Supabase project:
https://jqgwsgprqxfnvrmkpgyy.supabase.co

The app uses only the publishable client key. No service-role key is bundled.

For a clean new database, run SQL in this order:
  sql/001_schema.sql
  sql/002_rls.sql
  sql/003_finance_rpcs.sql
  sql/004_bootstrap_template.sql
  sql/005_v31_student_services.sql

v3.1 RECEIPT MODEL
There are exactly TWO receipt series:
1. Fee Entry — monthly fee, Annual Fund, fine, discount/refund workflow.
2. Student Syllabus + Canteen — one combined counter and one shared serial.

CLASS FEES
Default monthly fee is Rs. 2,000.
Settings can override each class by fee year.
Fee Entry automatically fetches the student's class fee for the selected year.

ANNUAL FUND
Annual Fund remains Rs. 2,150 and is tracked separately from monthly fee, Syllabus and Canteen sales.
