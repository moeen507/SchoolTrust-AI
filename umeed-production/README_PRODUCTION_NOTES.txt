UMEED FEE MANAGEMENT v3.0.0 — PRODUCTION NOTES

ARCHITECTURE
- Supabase PostgreSQL is the centralized authoritative database when online.
- IndexedDB is the local cache and offline outbox.
- Offline writes are never uploaded silently.
- The operator explicitly uses Sync Pending Data.
- Stable UUIDs make retries idempotent.
- Official receipt numbers are allocated by the database, not by a device.
- Concurrent fee writes for a student/year are serialized in PostgreSQL.

ONE FINANCIAL TRUTH
All financial screens use js/ledger-engine.js and computeStudentLedger(studentId, year).
Dashboard, Ledger, Reports, Fee Slip and WhatsApp must not maintain independent formulas.

ACCOUNTING
Monthly Fee: Rs. 2,000.
Annual Fund: Rs. 2,150.
Discount reduces liability and is NOT cash.
Refunds are separate refund records.
Annual Fund is separate from Monthly Fee and Refunds.
Partial monthly payments and partial Annual Fund payments are supported.
Duplicate/over-payment protections exist both in the client and central database RPCs.

OFFLINE RULE
An offline fee entry can be saved locally, but it has no official receipt number.
Do not print an offline entry as an official receipt.
After Manual Sync, the server assigns the official receipt number.

ELECTRON SECURITY
contextIsolation=true
nodeIntegration=false
sandbox=true
webSecurity=true
Permission requests are denied.
Navigation is restricted to internal app pages.
Only WhatsApp HTTPS links are opened externally.
No service-role/secret key is bundled.

SUPABASE SECURITY
The frontend ships only the publishable key.
Operational tables require authenticated users.
RLS restricts rows to the user's organization.
Role checks protect administrative and financial actions.
Run Supabase security/database advisors after deploying the SQL.

A5 PRINTING
Windows Electron invokes the system print dialog with A5 portrait.
Printer driver settings should also be set to A5 / Portrait / 100% scale.
Always perform a physical test on the school's actual printer before operational use.

BRANDING
The CSS preserves the April premium dark-charcoal / maroon / champagne-gold visual language.
Replace assets/logo.svg with the official school logo asset if a newer master logo is supplied; do not change layout dimensions unnecessarily.

BACKUP
D6 backup exports the local cache/outbox. Central Supabase should also have a database backup strategy.
A local backup is not a substitute for Supabase database backups.

NOT CLAIMED
This package is not claimed as real-school production certified until the supplied Supabase project has:
- SQL installed
- Auth owner profile bootstrapped
- RLS verified with real roles
- Live multi-device concurrency tested
- Physical A5 printer tested
- Real student import tested
