UMEED EDUCATION SYSTEM — NETLIFY DEPLOYABLE PWA v3.2.2

QUICK DEPLOY (DRAG & DROP)
1. Use the generated file:
   UMEED-Fee-Management-v3.2.2-Netlify-Deploy.zip
2. Open Netlify Deploys / manual deploy area.
3. Drag the ZIP into Netlify.
4. Netlify serves index.html directly.

CENTRAL BACKEND
- Supabase is the centralized database and authentication service.
- Netlify is ONLY the web/PWA frontend host.
- Android, Windows and Netlify web all connect to the same Supabase project.
- Do not put a Supabase service-role/secret key in Netlify or frontend files.
- The package contains only the public/publishable key.

LOGIN ROLES
- Super Admin / Admin: email + password.
- Accountant: email + password.
- Student: Roll Number / Student ID + password.

STUDENT ACCOUNTS
- Manual Add Student allocates the next roll number centrally.
- Imported students can be provisioned with Student Portal accounts.
- Login ID is the student's Roll Number.
- Temporary passwords are generated and shown/exported to authorized staff only.
- Student sessions can access only their own portal bundle.

ACCOUNTING
- Fee Entry supports multiple months on one Fee Slip.
- Annual Fund is reconciled separately.
- Syllabus + Canteen use one shared counter slip series.
- Fee and Counter receipt series remain separate.

DEFAULTERS
- From the 7th of each month, authorized staff receive an in-app defaulter alert.
- The Defaulters page opens WhatsApp reminders using each student's saved parent/guardian phone number.

OFFLINE
- Staff apps retain user-scoped IndexedDB caches.
- Official receipt numbers are allocated centrally.
- Student portal cache is isolated from staff cache on the same device.

PRODUCTION NOTE
Run real-school acceptance tests for imports, printing, WhatsApp phone data and concurrent multi-device fee entry before relying on the system for final accounting close.

PREMIUM UI / UX
- Dark Premium and White Premium modes are built into the same deploy.
- Theme can be switched from Login, top bar, navigation drawer, or Settings.
- Theme preference is stored locally on the device.
- Buttons, inputs, placeholders, tables, cards, drawers and dialogs use a consistent design system.
- Mobile controls are touch-sized and responsive; long content is protected from overlapping.
