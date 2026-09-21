import {CONFIG} from './config.js';
import {AuthService} from './auth-service.js';
import {SupabaseSyncService} from './supabase-sync-service.js';

async function call(body,{auth=true}={}){
  if(!navigator.onLine)throw new Error('Internet connection is required.');
  const headers={apikey:CONFIG.publishableKey,'Content-Type':'application/json'};
  if(auth){const token=AuthService.token();if(!token)throw new Error('Please sign in again.');headers.Authorization='Bearer '+token}
  const res=await fetch(CONFIG.supabaseUrl+'/functions/v1/student-accounts',{method:'POST',headers,body:JSON.stringify(body)});
  const text=await res.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={error:text}}
  if(!res.ok)throw new Error(data.error||'Student account request failed.');return data;
}
export const StudentAccountService={
  provision:studentIds=>call({action:'provision',student_ids:studentIds}),
  status:()=>call({action:'status'}),
  resetPassword:studentId=>call({action:'reset_password',student_id:studentId}),
  async portalBundle(){return await SupabaseSyncService.rpc('get_student_portal_bundle',{})},
  async markPasswordChanged(){return await SupabaseSyncService.rpc('mark_student_password_changed',{})}
};