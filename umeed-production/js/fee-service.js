import {CONFIG} from './config.js';
import {ValidationService} from './validation-service.js';
import {SupabaseSyncService} from './supabase-sync-service.js';
import {computeStudentLedger,monthStatus} from './ledger-engine.js';

const iso=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
function queue(state,operation){state.syncQueue=state.syncQueue.filter(q=>q.key!==operation.key);state.syncQueue.push(operation)}

export const FeeService={
  async save(state,input){
    ValidationService.fee(input);
    const ledger=computeStudentLedger(state,input.student_id,Number(input.fee_year));if(!ledger)throw new Error('Student not found.');
    const month=monthStatus(state,input.student_id,Number(input.fee_month),Number(input.fee_year));
    const cash=Number(input.cash_paid||0),discount=Number(input.discount||0),fine=Number(input.fine||0),annual=Number(input.annual_fund_paid||0),refund=Number(input.refund_amount||0);
    const hasFeeComponent=(cash+discount+fine+annual)>0;
    if(!hasFeeComponent&&refund<=0)throw new Error('Enter a fee amount, Annual Fund payment, fine, discount, or refund.');
    if(hasFeeComponent&&month.status==='Clear'&&(cash>0||discount>0||fine>0))throw new Error('This monthly fee is already clear. Duplicate monthly payment is blocked.');
    const remainingWithNewFine=month.pending+fine;
    if(cash+discount>remainingWithNewFine)throw new Error('Cash plus discount exceeds the remaining monthly balance.');
    if(discount>remainingWithNewFine)throw new Error('Discount exceeds the remaining monthly balance.');
    if(annual>ledger.annualPending)throw new Error('Annual Fund payment exceeds the remaining Annual Fund balance.');
    if(refund>Math.max(0,ledger.totalCash-ledger.totalRefund))throw new Error('Refund exceeds total refundable cash paid.');

    let savedFee=null,savedRefund=null,feeId=null;
    if(hasFeeComponent){
      feeId=id();
      const payload={p_id:feeId,p_student_id:input.student_id,p_fee_month:Number(input.fee_month),p_fee_year:Number(input.fee_year),p_cash_paid:cash,p_discount:discount,p_fine:fine,p_annual_fund_paid:annual,p_payment_date:input.payment_date,p_notes:String(input.notes||''),p_source_device:input.source_device||'client'};
      if(navigator.onLine&&SupabaseSyncService.profile){
        try{const result=await SupabaseSyncService.rpc('record_fee_entry',payload);savedFee=Array.isArray(result)?result[0]:result}
        catch(e){if(!SupabaseSyncService.isNetworkError(e))throw e}
      }
      if(!savedFee){
        savedFee={id:feeId,student_id:input.student_id,org_id:SupabaseSyncService.orgId(),fee_month:Number(input.fee_month),fee_year:Number(input.fee_year),monthly_fee:CONFIG.monthlyFee,cash_paid:cash,discount,fine,annual_fund_paid:annual,payment_date:input.payment_date,notes:String(input.notes||''),receipt_no:null,status:'active',sync_status:'pending',created_at:iso(),updated_at:iso()};
        queue(state,{id:id(),key:'fee:'+feeId,type:'fee_rpc',payload,local_id:feeId,created_at:iso(),status:'pending'});
      }
      state.feeEntries=state.feeEntries.filter(e=>e.id!==savedFee.id);state.feeEntries.push(savedFee);
    }

    if(refund>0){
      const rid=id();
      const refundPayload={p_id:rid,p_student_id:input.student_id,p_fee_entry_id:feeId,p_fee_year:Number(input.fee_year),p_amount:refund,p_refund_date:input.payment_date,p_notes:String(input.notes||''),p_source_device:input.source_device||'client'};
      if(navigator.onLine&&SupabaseSyncService.profile){
        try{const rr=await SupabaseSyncService.rpc('record_refund',refundPayload);savedRefund=Array.isArray(rr)?rr[0]:rr}
        catch(e){if(!SupabaseSyncService.isNetworkError(e))throw e}
      }
      if(!savedRefund){
        savedRefund={id:rid,student_id:input.student_id,fee_entry_id:feeId,fee_year:Number(input.fee_year),amount:refund,refund_date:input.payment_date,notes:String(input.notes||''),status:'active',sync_status:'pending',created_at:iso(),updated_at:iso()};
        queue(state,{id:id(),key:'refund:'+rid,type:'refund_rpc',payload:refundPayload,local_id:rid,created_at:iso(),status:'pending'});
      }
      state.refunds=state.refunds.filter(r=>r.id!==savedRefund.id);state.refunds.push(savedRefund);
    }
    return {fee:savedFee,refund:savedRefund,queued:Boolean((savedFee&&!savedFee.receipt_no)||(savedRefund&&savedRefund.sync_status==='pending'))};
  }
};
