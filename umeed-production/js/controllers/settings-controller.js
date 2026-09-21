import {AppContext} from '../app-context.js';
import {SettingsService} from '../settings-service.js';
import {ActivityService} from '../activity-service.js';
import {SupabaseSyncService} from '../supabase-sync-service.js';
import {PopupService} from '../popup-service.js';
import {CONFIG} from '../config.js';

function fill(){
  const s=AppContext.state.settings;
  document.getElementById('settings-school-name').value=s.school_name||'UMEED Education System';document.getElementById('settings-school-phone').value=s.school_phone||'';document.getElementById('settings-school-address').value=s.school_address||'';
  document.getElementById('settings-monthly-fee').value=CONFIG.monthlyFee;document.getElementById('settings-annual-fund').value=CONFIG.annualFund;document.getElementById('settings-slip-prefix').value=s.slip_prefix||'UES';document.getElementById('settings-slip-number').value=s.next_receipt_no||1;document.getElementById('settings-prepared-by').value=s.prepared_by||'Admin/Cashier';
  document.getElementById('settings-supabase-url').value=CONFIG.supabaseUrl;document.getElementById('settings-supabase-key').value=CONFIG.publishableKey;
}
export default{
  async init(){
    fill();
    document.getElementById('settings-form').onsubmit=async e=>{e.preventDefault();try{await SettingsService.save(AppContext.state,{school_name:document.getElementById('settings-school-name').value,school_phone:document.getElementById('settings-school-phone').value,school_address:document.getElementById('settings-school-address').value,slip_prefix:document.getElementById('settings-slip-prefix').value,prepared_by:document.getElementById('settings-prepared-by').value});await ActivityService.log(AppContext.state,{action:'settings_saved',entity_type:'settings',message:'Settings updated'});await AppContext.save();PopupService.success('Settings saved.')}catch(err){PopupService.error(err.message)}};
    document.getElementById('settings-test-backend').onclick=async()=>{try{const r=await SupabaseSyncService.healthCheck(),bad=r.filter(x=>!x.ok);if(bad.length)PopupService.warning('Backend reachable, but '+bad.length+' table(s) are missing or blocked by RLS.');else PopupService.success('Supabase schema and RLS access are ready.')}catch(e){PopupService.error(e.message)}};
    document.getElementById('settings-sign-out').onclick=async()=>{if(await PopupService.confirm('Sign Out','Sign out of UMEED Fee Management on this device?','Sign Out'))await AppContext.signOut()};
  },destroy(){}
};
