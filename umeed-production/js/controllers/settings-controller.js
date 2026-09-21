import {AppContext} from '../app-context.js';
import {SettingsService} from '../settings-service.js';
import {ActivityService} from '../activity-service.js';
import {SupabaseSyncService} from '../supabase-sync-service.js';
import {PopupService} from '../popup-service.js';
import {CONFIG} from '../config.js';
import {escapeHtml} from '../dom-utils.js';

let editingCatalogId=null;

function fill(){
  const s=AppContext.state.settings;
  document.getElementById('settings-school-name').value=s.school_name||'UMEED Education System';
  document.getElementById('settings-school-phone').value=s.school_phone||'';
  document.getElementById('settings-school-address').value=s.school_address||'';
  document.getElementById('settings-annual-fund').value=CONFIG.annualFund;
  document.getElementById('settings-prepared-by').value=s.prepared_by||'Admin/Cashier';
  document.getElementById('settings-fee-prefix').value=s.fee_receipt_prefix||s.slip_prefix||'UES';
  document.getElementById('settings-fee-next').value=s.next_fee_receipt_no||s.next_receipt_no||1;
  document.getElementById('settings-counter-prefix').value=s.counter_receipt_prefix||'SC';
  document.getElementById('settings-counter-next').value=s.next_counter_receipt_no||1;
  document.getElementById('settings-supabase-url').value=CONFIG.supabaseUrl;
  document.getElementById('settings-supabase-key').value=CONFIG.publishableKey;
}
function classFee(year,classId){
  return Number(AppContext.state.classFeeSchedule.find(x=>x.class_id===classId&&Number(x.fee_year)===Number(year))?.monthly_fee
    ??AppContext.state.classes.find(c=>c.id===classId)?.default_monthly_fee??CONFIG.monthlyFee);
}
function renderClassFees(){
  const y=Number(document.getElementById('settings-fee-year').value||new Date().getFullYear());
  const rows=AppContext.state.classes.filter(c=>String(c.status||'active')!=='deleted');
  document.getElementById('settings-class-fee-grid').innerHTML='<div class="table-outer"><table><thead><tr><th>Class</th><th>Year</th><th>Monthly Fee</th></tr></thead><tbody>'+rows.map(c=>'<tr><td><b>'+escapeHtml(c.class_name)+'</b></td><td>'+y+'</td><td><input class="class-fee-input" data-class-id="'+c.id+'" type="number" min="0" value="'+classFee(y,c.id)+'" style="max-width:180px"></td></tr>').join('')+'</tbody></table></div>';
}
function renderCatalog(){
  const items=(AppContext.state.catalogItems||[]).filter(x=>String(x.status||'active')==='active').sort((a,b)=>String(a.channel+a.item_name).localeCompare(String(b.channel+b.item_name)));
  document.getElementById('catalog-list').innerHTML=items.length?'<div class="table-outer"><table><thead><tr><th>Type</th><th>Code</th><th>Item</th><th>Price</th><th></th></tr></thead><tbody>'+items.map(i=>'<tr><td><span class="badge '+(i.channel==='canteen'?'warn':'gold')+'">'+(i.channel==='canteen'?'Canteen':'Syllabus')+'</span></td><td>'+escapeHtml(i.item_code||'-')+'</td><td>'+escapeHtml(i.item_name)+'</td><td>Rs. '+Number(i.unit_price||0).toLocaleString('en-PK')+'</td><td><div class="actions"><button class="btn btn-ghost" data-cat-edit="'+i.id+'">Edit</button><button class="btn btn-red" data-cat-del="'+i.id+'">Remove</button></div></td></tr>').join('')+'</tbody></table></div>':'<div class="empty-state">No Syllabus/Canteen catalog items yet.</div>';
  document.querySelectorAll('[data-cat-edit]').forEach(b=>b.onclick=()=>editCatalog(b.dataset.catEdit));
  document.querySelectorAll('[data-cat-del]').forEach(b=>b.onclick=()=>removeCatalog(b.dataset.catDel));
}
function clearCatalogForm(){editingCatalogId=null;document.getElementById('catalog-code').value='';document.getElementById('catalog-name').value='';document.getElementById('catalog-price').value='';document.getElementById('catalog-save').textContent='Add Item'}
function editCatalog(id){
  const i=AppContext.state.catalogItems.find(x=>x.id===id);if(!i)return;editingCatalogId=id;
  document.getElementById('catalog-channel').value=i.channel;document.getElementById('catalog-code').value=i.item_code||'';
  document.getElementById('catalog-name').value=i.item_name;document.getElementById('catalog-price').value=i.unit_price;document.getElementById('catalog-save').textContent='Update Item';
}
async function removeCatalog(id){
  const i=AppContext.state.catalogItems.find(x=>x.id===id);if(!i)return;
  if(!await PopupService.confirm('Remove Catalog Item','Remove '+i.item_name+' from the active catalog?','Remove'))return;
  try{await SettingsService.saveCatalogItem(AppContext.state,{...i,status:'deleted'});await AppContext.save();renderCatalog();PopupService.success('Catalog item removed.')}catch(e){PopupService.error(e.message)}
}
export default{
  async init(){
    fill();document.getElementById('settings-fee-year').value=new Date().getFullYear();renderClassFees();renderCatalog();
    document.getElementById('settings-form').onsubmit=async e=>{
      e.preventDefault();try{
        await SettingsService.saveGeneral(AppContext.state,{
          school_name:document.getElementById('settings-school-name').value,school_phone:document.getElementById('settings-school-phone').value,
          school_address:document.getElementById('settings-school-address').value,fee_receipt_prefix:document.getElementById('settings-fee-prefix').value,
          counter_receipt_prefix:document.getElementById('settings-counter-prefix').value,prepared_by:document.getElementById('settings-prepared-by').value
        });
        await ActivityService.log(AppContext.state,{action:'settings_saved',entity_type:'settings',message:'School settings updated'});
        await AppContext.save();fill();PopupService.success('School settings saved.');
      }catch(err){PopupService.error(err.message)}
    };
    document.getElementById('settings-save-prefixes').onclick=()=>document.getElementById('settings-form').requestSubmit();
    document.getElementById('settings-save-counters').onclick=async()=>{try{
      await SettingsService.saveCounters(AppContext.state,document.getElementById('settings-fee-next').value,document.getElementById('settings-counter-next').value);
      await AppContext.save();fill();PopupService.success('Receipt counters updated.');
    }catch(e){PopupService.error(e.message)}};
    document.getElementById('settings-load-class-fees').onclick=renderClassFees;
    document.getElementById('settings-save-class-fees').onclick=async()=>{try{
      const y=Number(document.getElementById('settings-fee-year').value),fees=[...document.querySelectorAll('.class-fee-input')].map(el=>({class_id:el.dataset.classId,monthly_fee:Number(el.value)}));
      await SettingsService.saveClassFees(AppContext.state,y,fees);await AppContext.save();renderClassFees();PopupService.success('Class fees saved for '+y+'.');
    }catch(e){PopupService.error(e.message)}};
    document.getElementById('catalog-save').onclick=async()=>{try{
      const item={id:editingCatalogId,channel:document.getElementById('catalog-channel').value,item_code:document.getElementById('catalog-code').value,item_name:document.getElementById('catalog-name').value,unit_price:Number(document.getElementById('catalog-price').value||0),status:'active'};
      if(!item.item_name.trim())throw new Error('Item name is required.');
      await SettingsService.saveCatalogItem(AppContext.state,item);await AppContext.save();clearCatalogForm();renderCatalog();PopupService.success('Catalog item saved.');
    }catch(e){PopupService.error(e.message)}};
    document.getElementById('catalog-clear').onclick=clearCatalogForm;
    document.getElementById('settings-test-backend').onclick=async()=>{try{const r=await SupabaseSyncService.healthCheck(),bad=r.filter(x=>!x.ok);if(bad.length)PopupService.warning('Backend reachable, but '+bad.length+' table(s) are missing or blocked.');else PopupService.success('Supabase schema and RLS access are ready.')}catch(e){PopupService.error(e.message)}};
    document.getElementById('settings-sign-out').onclick=async()=>{if(await PopupService.confirm('Sign Out','Sign out of UMEED on this device?','Sign Out'))await AppContext.signOut()};
  },destroy(){}
};