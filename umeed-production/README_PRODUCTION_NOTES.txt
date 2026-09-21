UMEED v3.1.0 — PRODUCTION NOTES

FINANCIAL SEPARATION
Fee Ledger is the source of truth for monthly fee, Annual Fund, discounts, fines and refunds.
Syllabus/Canteen sales do not alter Fee outstanding.

RECEIPT SERIES
Fee receipt series: fee_receipt_prefix + next_fee_receipt_no.
Syllabus/Canteen shared series: counter_receipt_prefix + next_counter_receipt_no.
Both are allocated centrally and atomically by PostgreSQL.
Counters can move forward from Settings but cannot be rewound.

CLASS-WISE FEES
class_fee_schedule stores class/year monthly fee.
Default is Rs. 2,000.
Once a fee transaction exists for a month, the fee entry stores its monthly_fee snapshot for historical consistency.

FEE ENTRY AUTO-FETCH
Selecting a student displays:
- class and father details
- class-wise monthly fee
- 12-month Clear / Partial / Pending strip
- Annual Fund paid
- Annual Fund pending
- total fee pending

SYLLABUS + CANTEEN
One shared page/counter.
Each sale is categorized as Student Syllabus/Store or Canteen.
Both categories share the same receipt sequence.
Catalog items are managed from Settings.
Counter sales remain financially separate from Fee Ledger.

SECURITY
All public operational tables use RLS.
Clients use Supabase Auth JWT + publishable key.
No service-role/secret key is shipped.

OFFLINE
Fee and counter transactions can queue locally.
Official receipt numbers are assigned only after manual cloud sync.
Do not print a queued offline record as an official receipt.
