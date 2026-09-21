-- UMEED v3.2 security/performance hardening
-- Trigger helper is not an externally callable RPC.
revoke all on function public.sync_student_account_status() from public,anon,authenticated;

create index if not exists fee_receipt_months_student_id_idx on public.fee_receipt_months(student_id);
create index if not exists fee_receipts_created_by_idx on public.fee_receipts(created_by);
create index if not exists fee_receipts_student_id_idx on public.fee_receipts(student_id);
create index if not exists student_class_history_class_id_idx on public.student_class_history(class_id);
create index if not exists student_class_history_student_id_idx on public.student_class_history(student_id);
