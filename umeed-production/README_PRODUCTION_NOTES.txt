UMEED v3.2.0 — PRODUCTION NOTES

STUDENT IDENTITY
Core fields: Roll Number, Student Name, Parent/Guardian, Class, Phone/WhatsApp.
Manual admissions allocate the next roll atomically from Supabase.
Roll number is read-only after creation.
Imports retain provided rolls and automatically reconcile the next roll counter.

FEE ENTRY
A single Fee Slip may contain multiple monthly fee lines for one fee year.
Select one month, multiple months, or Select All Pending / Full Year.
Each month keeps its own cash, discount and fine.
Annual Fund remains a separate liability but may be paid on the same Fee Slip.
One Fee Slip receives exactly one centrally allocated receipt number.

ROLE ACCESS
Owner is presented as Super Admin.
Super Admin: all pages + User Management.
Admin: operational pages/settings, no User Management.
Accountant/Cashier: Daily Collection, Fee Entry, Fee Slip, Syllabus+Canteen.
Auditor: read-only collection/ledger/reports routes.

DAILY COLLECTION
Date selector shows Monthly Fee Cash, Annual Fund, Syllabus, Canteen, Refunds, Gross and Net.
Below totals, every receipt is listed slip-by-slip.

DESTRUCTIVE ACTIONS
Student delete, catalog remove, user delete and local clear require password verification.
Passwords are verified through Supabase Auth and are not stored in the app.

OFFLINE
Transactions may queue locally.
Official receipt numbers are assigned only after Manual Sync.
Manual student creation requires internet because roll allocation is central.

LEGACY
v3.0/v3.1 fee entries remain readable in Ledger, Reports and Daily Collection.
