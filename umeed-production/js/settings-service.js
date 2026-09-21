import {SupabaseSyncService} from './supabase-sync-service.js';

function requireOnline(){
  if(!navigator.onLine)throw new Error('Internet connection is required for administrative settings changes.');
}
function one(result){return Array.isArray(result)?result[0]:result}

export const SettingsService={
  async saveGeneral(state,input){
    requireOnline();
    const payload={
      p_school_name:String(input.school_name||'UMEED Education System').trim(),
      p_school_phone:String(input.school_phone||'').trim(),
      p_school_address:String(input.school_address||'').trim(),
      p_fee_prefix:String(input.fee_receipt_prefix||'UES').trim().toUpperCase()||'UES',
      p_counter_prefix:String(input.counter_receipt_prefix||'SC').trim().toUpperCase()||'SC',
      p_prepared_by:String(input.prepared_by||'Admin/Cashier').trim()||'Admin/Cashier'
    };
    const saved=one(await SupabaseSyncService.rpc('update_app_settings_v31',payload));
    if(saved)state.settings=saved;
    return saved;
  },
  async saveCounters(state,nextFee,nextCounter){
    requireOnline();
    const saved=one(await SupabaseSyncService.rpc('update_receipt_counters',{p_next_fee:Number(nextFee),p_next_counter:Number(nextCounter)}));
    if(saved)state.settings=saved;
    return saved;
  },
  async saveClassFees(state,year,fees){
    requireOnline();
    const result=await SupabaseSyncService.rpc('upsert_class_fees_bulk',{p_fee_year:Number(year),p_fees:fees});
    state.classFeeSchedule=(state.classFeeSchedule||[]).filter(x=>Number(x.fee_year)!==Number(year)).concat(result||[]);
    return result||[];
  },
  async saveCatalogItem(state,item){
    requireOnline();
    const saved=one(await SupabaseSyncService.rpc('upsert_catalog_item',{
      p_id:item.id||crypto.randomUUID(),p_channel:item.channel,p_item_code:String(item.item_code||''),
      p_item_name:String(item.item_name||''),p_unit_price:Number(item.unit_price||0),p_status:item.status||'active'
    }));
    if(saved){state.catalogItems=(state.catalogItems||[]).filter(x=>x.id!==saved.id);state.catalogItems.push(saved)}
    return saved;
  }
};