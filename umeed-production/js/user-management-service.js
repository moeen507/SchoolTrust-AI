import {CONFIG} from './config.js';
import {AuthService} from './auth-service.js';
async function invoke(body){
  if(!navigator.onLine)throw new Error('Internet connection is required for user management.');
  const token=AuthService.token();if(!token)throw new Error('Please sign in again.');
  const res=await fetch(CONFIG.supabaseUrl+'/functions/v1/manage-users',{method:'POST',headers:{Authorization:'Bearer '+token,apikey:CONFIG.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const text=await res.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={error:text}}
  if(!res.ok)throw new Error(data.error||'User management request failed.');return data;
}
export const UserManagementService={
  async list(){return (await invoke({action:'list'})).users||[]},
  async create(input){return (await invoke({action:'create',...input})).user},
  async updateRole(userId,role){return invoke({action:'update_role',user_id:userId,role})},
  async remove(userId,currentPassword){return invoke({action:'delete',user_id:userId,current_password:currentPassword})}
};