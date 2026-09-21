import {ValidationService} from './validation-service.js';
import {SupabaseSyncService} from './supabase-sync-service.js';
import {computeStudentLedger} from './ledger-engine.js';

const iso=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
function queue(state,operation){state.syncQueue=state.syncQueue.filter(q=>q.key!==operation.key);state.syncQueue.push(operation)}

export const FeeService={
  async saveReceipt(state,input){
    ValidationService.feeReceipt(input);
    const year=Number(input.fee_year),ledger=computeStudentLedger(state,input.student_id,year);if(!ledger)throw new Error('Student not found.');
    const months=(input.months||[]).map(x=>({fee_month:Number(x.fee_month),cash_paid:Number(x.cash_paid||0),discount:Number(x.discount||0),fine:Number(x.fine||0)}));
    const annual=Number(input.annual_fund_paid||0),refund=Number(input.refund_amount||0);

    for(const line of months){
      const m=ledger.monthly[line.fee_month-1];if(!m)throw new Error('Invalid fee month.');
      if(m.status==='Clear'&&(line.cash_paid>0||line.discount>0||line.fine>0))throw new Error(m.name+' is already clear.');
      const allowed=m.pending+line.fine;
      if(line.cash_paid+line.discount>allowed)throw new Error(m.name+': cash + discount exceeds pending balance.');
      if(line.discount>allowed)throw new Error(m.name+': discount exceeds pending balance.');
    }
    if(annual>ledger.annualPending)throw new Error('Annual Fund payment exceeds remaining Annual Fund balance.');
    const incomingCash=months.reduce((a,m)=>a+m.cash_paid,0)+annual;
    if(refund>Math.max(0,ledger.totalCash+incomingCash-ledger.totalRefund))throw new Error('Refund exceeds refundable cash paid.');
    if(!months.length&&annual<=0&&refund<=0)throw new Error('Select at least one month, Annual Fund payment, or refund.');

    let savedReceipt=null,savedRefund=null,receiptId=null;
    if(months.length||annual>0){
      receiptId=id();
      const payload={
        p_id:receiptId,p_student_id:input.student_id,p_fee_year:year,p_payment_date:input.payment_date,
        p_annual_fund_paid:annual,p_notes:String(input.notes||''),p_source_device:input.source_device||'client',p_months:months
      };
      if(navigator.onLine&&SupabaseSyncService.profile){
        try{const r=await SupabaseSyncService.rpc('record_fee_receipt_v32',payload);savedReceipt=Array.isArray(r)?r[0]:r}
        catch(e){if(!SupabaseSyncService.isNetworkError(e))throw e}
      }
      if(!savedReceipt){
        savedReceipt={id:receiptId,org_id:SupabaseSyncService.orgId(),student_id:input.student_id,receipt_no:null,fee_year:year,payment_date:input.payment_date,annual_fund_paid:annual,notes:String(input.notes||''),source_device:input.source_device||'client',status:'active',sync_status:'pending',created_at:iso(),updated_at:iso()};
        queue(state,{id:id(),key:'fee-receipt:'+receiptId,type:'fee_receipt_rpc',payload,local_id:receiptId,created_at:iso(),status:'pending'});
      }
      state.feeReceipts=(state.feeReceipts||[]).filter(r=>r.id!==receiptId);state.feeReceipts.push(savedReceipt);
      state.feeReceiptMonths=(state.feeReceiptMonths||[]).filter(m=>m.receipt_id!==receiptId);
      for(const line of months){
        const current=ledger.monthly[line.fee_month-1];
        state.feeReceiptMonths.push({
          id:id(),org_id:SupabaseSyncService.orgId(),receipt_id:receiptId,student_id:input.student_id,fee_month:line.fee_month,fee_year:year,
          monthly_fee:current.baseFee,cash_paid:line.cash_paid,discount:line.discount,fine:line.fine,created_at:iso(),updated_at:iso()
        });
      }
    }

    if(refund>0){
      const rid=id(),refundPayload={p_id:rid,p_student_id:input.student_id,p_fee_receipt_id:receiptId,p_fee_year:year,p_amount:refund,p_refund_date:input.payment_date,p_notes:String(input.notes||''),p_source_device:input.source_device||'client'};
      if(navigator.onLine&&SupabaseSyncService.profile){
        try{const rr=await SupabaseSyncService.rpc('record_refund_v32',refundPayload);savedRefund=Array.isArray(rr)?rr[0]:rr}
        catch(e){if(!SupabaseSyncService.isNetworkError(e))throw e}
      }
      if(!savedRefund){
        savedRefund={id:rid,student_id:input.student_id,fee_receipt_id:receiptId,fee_year:year,amount:refund,refund_date:input.payment_date,notes:String(input.notes||''),status:'active',sync_status:'pending',created_at:iso(),updated_at:iso()};
        queue(state,{id:id(),key:'refund:'+rid,type:'refund_rpc',payload:refundPayload,local_id:rid,created_at:iso(),status:'pending'});
      }
      state.refunds=state.refunds.filter(r=>r.id!==savedRefund.id);state.refunds.push(savedRefund);
    }
    return {receipt:savedReceipt,refund:savedRefund,queued:Boolean((savedReceipt&&!savedReceipt.receipt_no)||(savedRefund&&savedRefund.sync_status==='pending'))};
  }
};