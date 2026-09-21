import {CONFIG} from './config.js';
import {StorageService} from './storage-service.js';

async function parseResponse(response){
  const text=await response.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={message:text}}
  if(!response.ok)throw Object.assign(new Error(data.msg||data.message||data.error_description||'Authentication request failed.'),{status:response.status,data});
  return data;
}
async function request(path,options={}){
  return parseResponse(await fetch(CONFIG.supabaseUrl+path,{...options,headers:{apikey:CONFIG.publishableKey,'Content-Type':'application/json',...(options.headers||{})}}));
}
export const AuthService={
  session:null,
  offlineSession:false,
  async restore(){
    this.session=await StorageService.loadSession();this.offlineSession=false;
    if(!this.session)return null;
    if(Date.now()>=Number(this.session.expires_at||0)-60000){
      if(!navigator.onLine){this.offlineSession=true;return this.session}
      try{await this.refresh()}catch{await this.signOut();return null}
    }
    return this.session;
  },
  async signIn(email,password){
    const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
    const session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Date.now()+Number(data.expires_in||3600)*1000,user:data.user};
    this.session=session;this.offlineSession=false;await StorageService.saveSession(session);return session;
  },
  async refresh(){
    if(!this.session?.refresh_token)throw new Error('No refresh token.');
    const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:this.session.refresh_token})});
    this.session={access_token:data.access_token,refresh_token:data.refresh_token||this.session.refresh_token,expires_at:Date.now()+Number(data.expires_in||3600)*1000,user:data.user||this.session.user};
    this.offlineSession=false;await StorageService.saveSession(this.session);return this.session;
  },
  async signOut(){this.session=null;this.offlineSession=false;await StorageService.clearSession()},
  token(){return this.session?.access_token||null},
  user(){return this.session?.user||null}
};
