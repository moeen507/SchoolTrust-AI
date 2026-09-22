import {ValidationService} from './validation-service.js';
import {SupabaseSyncService} from './supabase-sync-service.js';
import {computeStudentLedger} from './ledger-engine.js';

const iso=()=>new Date().toISOString(),uuid=()=>crypto.randomUUID();
function queue(state,operation){state.syncQueue=state.syncQueue.filter(q=>q.key!==operation.key);state.syncQueue.push(operation)}

export const FeeService={
  async save(state,input){
    ValidationService.feeReceipt(input);
    const ledger=computeStudentLedger(state,input.student_id,Number(input.fee_year));if(!ledger)throw new Error('Student not found.');
    const seen=new Set();
    for(const line of input.months||[]){
      const m=Number(line.fee_month);if(seen.has(m))throw new Error('A month can appear only once on a receipt.');seen.add(m);
      const status=ledger.monthly[m-1];if(!status)throw new Error('Invalid month.');
      const cash=Number(line.cash_paid||0),discount=Number(line.discount||0),fine=Number(line.fine||0);
      if(status.pending<=0&&(cash>0||discount>0||fine>0))throw new Error(status.name+' is already clear.');
      if(cash+discount>status.pending+fine)throw new Error('Payment exceeds pending balance for '+status.name+'.');
    }
    const annual=Number(input.annual_fund_paid||0),refund=Number(input.refund_amount||0);
    if(annual>ledger.annualPending)throw new Error('Annual Fund payment exceeds remaining Annual Fund.');
    if(refund>Math.max(0,ledger.totalCash-ledger.totalRefund))throw new Error('Refund exceeds refundable cash paid.');

    let receipt=null,refundRow=null,receiptId=null;
    if((input.months||[]).length||annual>0){
      receiptId=uuid();
      const payload={p_id:receiptId,p_student_id:input.student_id,p_fee_year:Number(input.fee_year),p_payment_date:input.payment_date,p_annual_fund_paid:annual,p_notes:String(input.notes||''),p_source_device:input.source_device||'client',p_months:(input.months||[]).map(x=>({fee_month:Number(x.fee_month),cash_paid:Number(x.cash_paid||0),discount:Number(x.discount||0),fine:Number(x.fine||0)}))};
      if(navigator.onLine&&SupabaseSyncService.profile){
        try{const r=await SupabaseSyncService.rpc('record_fee_receipt_v32',payload);receipt=Array.isArray(r)?r[0]:r}catch(e){if(!SupabaseSyncService.isNetworkError(e))throw e}
      }
      if(!receipt){
        receipt={id:receiptId,org_id:SupabaseSyncService.orgId(),student_id:input.student_id,receipt_no:null,fee_year:Number(input.fee_year),payment_date:input.payment_date,annual_fund_paid:annual,notes:String(input.notes||''),status:'active',sync_status:'pending',created_at:iso(),updated_at:iso()};
        queue(state,{id:uuid(),key:'fee-receipt:'+receiptId,type:'fee_receipt_rpc',payload,local_id:receiptId,created_at:iso(),status:'pending'});
      }
      state.feeReceipts=(state.feeReceipts||[]).filter(x=>x.id!==receiptId);state.feeReceipts.push(receipt);
      state.feeReceiptMonths=(state.feeReceiptMonths||[]).filter(x=>x.receipt_id!==receiptId);
      for(const line of input.months||[]){
        const status=ledger.monthly[Number(line.fee_month)-1];
        state.feeReceiptMonths.push({id:uuid(),org_id:SupabaseSyncService.orgId(),receipt_id:receiptId,student_id:input.student_id,fee_month:Number(line.fee_month),fee_year:Number(input.fee_year),monthly_fee:Number(status.baseFee),cash_paid:Number(line.cash_paid||0),discount:Number(line.discount||0),fine:Number(line.fine||0),created_at:iso(),updated_at:iso(),_local:true});
      }
    }

    if(refund>0){
      const rid=uuid(),payload={p_id:rid,p_student_id:input.student_id,p_fee_receipt_id:receiptId,p_fee_year:Number(input.fee_year),p_amount:refund,p_refund_date:input.payment_date,p_notes:String(input.notes||''),p_source_device:input.source_device||'client'};
      if(navigator.onLine&&SupabaseSyncService.profile){
        try{const r=await SupabaseSyncService.rpc('record_refund_v32',payload);refundRow=Array.isArray(r)?r[0]:r}catch(e){if(!SupabaseSyncService.isNetworkError(e))throw e}
      }
      if(!refundRow){
        refundRow={id:rid,student_id:input.student_id,fee_receipt_id:receiptId,fee_year:Number(input.fee_year),amount:refund,refund_date:input.payment_date,notes:String(input.notes||''),status:'active',sync_status:'pending',created_at:iso(),updated_at:iso()};
        queue(state,{id:uuid(),key:'refund:'+rid,type:'refund_rpc',payload,local_id:rid,created_at:iso(),status:'pending'});
      }
      state.refunds=state.refunds.filter(r=>r.id!==rid);state.refunds.push(refundRow);
    }
    return {receipt,refund:refundRow,queued:Boolean((receipt&&!receipt.receipt_no)||(refundRow&&refundRow.sync_status==='pending'))};
  }
};