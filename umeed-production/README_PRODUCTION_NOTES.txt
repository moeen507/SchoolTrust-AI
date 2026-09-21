UMEED v3.2.0 — PRODUCTION NOTES

CENTRALIZED ARCHITECTURE
- Supabase PostgreSQL + Auth is the centralized source of truth.
- Netlify hosts the static web/PWA frontend only.
- Windows Electron, Android APK and Netlify PWA use the same Supabase project.
- The frontend contains only the publishable key; service-role credentials stay in Supabase Edge Functions.

ROLE MODEL
- Owner is presented as Super Admin.
- Super Admin: full system + User Management.
- Admin: operational pages/settings; no staff-account deletion/creation.
- Accountant/Cashier: Daily Collection, Fee Entry, Fee Slip, Syllabus+Canteen, Defaulters.
- Student: own Student Portal only.
- Student sessions do not load organization-wide tables.

STUDENT ACCOUNTS
- Manual Add Student allocates the next roll atomically.
- Roll Number is also the visible Student Login ID.
- Import provisions portal accounts and exports generated temporary credentials.
- Temporary passwords are not stored in plaintext in the database.
- Student Portal data is returned by a secure auth.uid()-scoped RPC.
- Student class changes create class-history rows so prior-year history remains intact.
- Deleting/disabling a student disables that student's portal account.

ACCOUNTING
- One Fee Slip can settle one, multiple or all pending months for a fee year.
- Each month keeps its own cash, discount and fine.
- Annual Fund is reconciled separately but may be paid on the same Fee Slip.
- Fee Slip serial and combined Syllabus+Canteen serial are separate and centrally atomic.
- Discount is never cash.
- Refunds remain separate.
- Legacy v3.0/v3.1 records remain readable.

ACCOUNTANT WORKSPACE
- Date selector shows fee cash, Annual Fund, Syllabus, Canteen, refunds, gross and net.
- Every collection row is shown slip-by-slip.
- Accountant has no Settings, Student delete/edit registry, D6 or User Management access.

DEFAULTER REMINDERS
- From day 7 of each month, authorized staff get an in-app monthly defaulter alert.
- The Defaulters page uses real saved parent/guardian WhatsApp numbers.
- Messages are opened in WhatsApp for user confirmation/sending; the app does not silently send messages.

OFFLINE
- IndexedDB cache is scoped per authenticated user.
- Student and staff cache cannot leak across role switches on the same device.
- Official receipt numbers are only assigned centrally.
- Manual new-student creation requires internet for atomic roll/account creation.

NETLIFY
- Drag/drop artifact: UMEED-Fee-Management-v3.2.0-Netlify-Deploy.zip
- _headers and _redirects are included.
- No Netlify database or serverless function is required for core operation.
