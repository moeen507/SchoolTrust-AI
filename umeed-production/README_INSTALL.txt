UMEED EDUCATION SYSTEM — FEE MANAGEMENT v3.0.0
INSTALLATION

WINDOWS
1. Install Node.js 22 LTS or newer.
2. Open Command Prompt / PowerShell in this folder.
3. Run:
   npm install
   npm run start
4. To build the portable Windows application:
   npm run build:portable
5. The Windows output is written to:
   dist/

ANDROID
1. Install Node.js 22+, JDK 21 and Android Studio.
2. Run:
   npm install
   npm run mobile:add
   npm run mobile:sync
   npm run mobile:open
3. In Android Studio build the APK, or run Gradle assembleDebug/release as appropriate.

SUPABASE — REQUIRED BEFORE LIVE USE
The app is preconfigured for:
https://jqgwsgprqxfnvrmkpgyy.supabase.co

It uses the supplied publishable client key. It DOES NOT contain a service-role key.

Run the SQL files in this order:
  sql/001_schema.sql
  sql/002_rls.sql
  sql/003_finance_rpcs.sql
  sql/004_bootstrap_template.sql

Before running 004_bootstrap_template.sql:
- Create the first owner/admin user in Supabase Authentication.
- Replace YOUR_AUTH_USER_UUID with that Auth user UUID.

The production app requires an authenticated user and a matching public.profiles row.

IMPORTANT
Monthly Fee is fixed at Rs. 2,000.
Annual Fund is fixed at Rs. 2,150.
Annual Fund is never called Trip Fund.
No demo students are inserted by the app.
