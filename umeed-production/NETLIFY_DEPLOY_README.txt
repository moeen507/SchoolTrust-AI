UMEED Education System — Netlify Deploy Package v3.2.0

DEPLOY
1. Open Netlify.
2. Use Add new site > Deploy manually (or Netlify Drop).
3. Upload UMEED-Student-Finance-v3.2.0-Netlify.zip.
4. Netlify will serve index.html from the ZIP root.

BACKEND
The web app is connected to the centralized Supabase project already configured for UMEED.
Do not place a Supabase service-role/secret key in this ZIP.

ROLES
- Super Admin: full system access + user management.
- Admin: operational access + settings.
- Accountant/Cashier: daily collection, Fee Entry, Fee Slip, Syllabus+Canteen. Offline cache is supported and pending accountant entries auto-sync after reconnection.
- Student: Roll Number + Password; can only read/download own record under Supabase RLS.

STUDENT ACCOUNTS
Manual student creation allocates the next official roll number centrally.
Excel/CSV import provisions student login accounts and exports one-time credentials for new accounts.

RECEIPTS
- Fee Entry has its own central atomic receipt sequence.
- Syllabus+Canteen share one separate central atomic receipt sequence.

IMPORTANT
Keep HTTPS enabled (Netlify does this by default) so PWA/service-worker and secure browser APIs work.
