import {CONFIG} from './config.js';
import {AuthService} from './auth-service.js';

async function invoke(body){
  if(!navigator.onLine)throw new Error('Internet connection is required for student account management.');
  const token=AuthService.token();if(!token)throw new Error('Please sign in again.');
  const res=await fetch(CONFIG.supabaseUrl+'/functions/v1/student-accounts',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,apikey:CONFIG.publishableKey,'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  const text=await res.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={error:text}}
  if(!res.ok)throw new Error(data.error||'Student account request failed.');
  return data;
}
export const StudentAccountService={
  async whoAmI(){return invoke({action:'whoami'})},
  async provision(studentId){return (await invoke({action:'provision',student_id:studentId})).credentials||[]},
  async provisionBatch(studentIds){return (await invoke({action:'provision_batch',student_ids:studentIds})).credentials||[]},
  async list(){return (await invoke({action:'list'})).accounts||[]},
  async resetPassword(studentId){return invoke({action:'reset_password',student_id:studentId})},
  async changePassword(password){return invoke({action:'change_password',password})}
};