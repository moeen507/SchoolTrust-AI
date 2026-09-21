import {SupabaseSyncService} from './supabase-sync-service.js';

const iso=()=>new Date().toISOString();
const uuid=()=>crypto.randomUUID();
function queue(state,operation){state.syncQueue=state.syncQueue.filter(q=>q.key!==operation.key);state.syncQueue.push(operation)}
const totalOf=items=>items.reduce((a,i)=>a+Number(i.quantity||0)*Number(i.unit_price||0),0);

export const CounterService={
  async save(state,input){
    const student=state.students.find(s=>s.id===input.student_id&&String(s.status||'active')!=='deleted');
    if(!student)throw new Error('Select a valid student.');
    if(!['store','canteen'].includes(input.channel))throw new Error('Select Syllabus or Canteen.');
    if(!Array.isArray(input.items)||!input.items.length)throw new Error('Add at least one item.');
    for(const i of input.items){
      if(Number(i.quantity||0)<=0)throw new Error('Item quantity must be greater than zero.');
      if(Number(i.unit_price||0)<0)throw new Error('Item price cannot be negative.');
      if(!i.catalog_item_id&&!String(i.item_name||'').trim())throw new Error('Custom item name is required.');
    }

    const saleId=uuid();
    const payload={
      p_id:saleId,p_student_id:input.student_id,p_channel:input.channel,p_sale_date:input.sale_date,
      p_notes:String(input.notes||''),p_source_device:input.source_device||'client',
      p_items:input.items.map(i=>({catalog_item_id:i.catalog_item_id||null,item_name:i.item_name||'',quantity:Number(i.quantity),unit_price:Number(i.unit_price)}))
    };

    let saved=null;
    if(navigator.onLine&&SupabaseSyncService.profile){
      try{const result=await SupabaseSyncService.rpc('record_counter_sale',payload);saved=Array.isArray(result)?result[0]:result}
      catch(e){if(!SupabaseSyncService.isNetworkError(e))throw e}
    }

    const amount=totalOf(input.items);
    if(!saved){
      saved={
        id:saleId,org_id:SupabaseSyncService.orgId(),student_id:input.student_id,channel:input.channel,
        receipt_no:null,sale_date:input.sale_date,subtotal:amount,total:amount,notes:String(input.notes||''),
        source_device:input.source_device||'client',status:'active',sync_status:'pending',created_at:iso(),updated_at:iso()
      };
      queue(state,{id:uuid(),key:'counter:'+saleId,type:'counter_sale_rpc',payload,local_id:saleId,created_at:iso(),status:'pending'});
    }

    state.counterSales=(state.counterSales||[]).filter(x=>x.id!==saleId);state.counterSales.push(saved);
    state.counterSaleItems=(state.counterSaleItems||[]).filter(x=>x.sale_id!==saleId);
    input.items.forEach(i=>state.counterSaleItems.push({
      id:uuid(),sale_id:saleId,catalog_item_id:i.catalog_item_id||null,item_name:i.item_name,
      quantity:Number(i.quantity),unit_price:Number(i.unit_price),line_total:Number(i.quantity)*Number(i.unit_price),created_at:iso()
    }));
    return {sale:saved,queued:!saved.receipt_no};
  },
  items(state,saleId){return (state.counterSaleItems||[]).filter(i=>i.sale_id===saleId)},
  total(items){return totalOf(items)}
};