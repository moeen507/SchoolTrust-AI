import {CONFIG,DEFAULT_CLASSES} from './config.js';
export const uid=()=>crypto.randomUUID?crypto.randomUUID():'id-'+Date.now()+'-'+Math.random().toString(16).slice(2);
export const now=()=>new Date().toISOString();
export const today=()=>new Date().toISOString().slice(0,10);
export function defaults(){
  const t=now();
  return {
    schemaVersion:CONFIG.schemaVersion,
    classes:DEFAULT_CLASSES.map((name,i)=>({id:'class-'+String(i+1).padStart(2,'0'),class_name:name,section:'',status:'Active',created_at:t,updated_at:t,sync_status:'pending'})),
    students:[],feeEntries:[],refunds:[],feeSlips:[],activityLog:[],syncQueue:[],
    settings:{
      schoolName:'UMEED Education System',schoolPhone:'',schoolAddress:'',
      monthlyFee:2000,annualFund:2150,slipPrefix:'UES',currentSlipNumber:25001,
      supabaseUrl:CONFIG.supabaseUrl,supabaseKey:CONFIG.supabaseKey,syncMode:'manual',
      paperSize:'A5 Portrait',preparedBy:'Admin/Cashier',updatedAt:t
    },
    meta:{activePage:'dashboard',lastSync:null,createdAt:t}
  };
}
export function load(){
  try{
    const raw=localStorage.getItem(CONFIG.storageKey);
    if(!raw)return defaults();
    const parsed=JSON.parse(raw);
    const base=defaults();
    return {...base,...parsed,settings:{...base.settings,...(parsed.settings||{})},meta:{...base.meta,...(parsed.meta||{})}};
  }catch{return defaults()}
}
export function persist(state){localStorage.setItem(CONFIG.storageKey,JSON.stringify(state))}
export function exportBackup(state){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  downloadBlob(blob,'UMEED-Backup-'+today()+'.json');
}
export async function importBackup(file){
  const txt=await file.text();const data=JSON.parse(txt);
  if(!data||!Array.isArray(data.students)||!Array.isArray(data.feeEntries))throw new Error('Invalid UMEED backup file.');
  return data;
}
export function downloadBlob(blob,name){
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
export function csvDownload(rows,name){
  if(!rows.length)rows=[{}];
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))];
  const q=v=>'"'+String(v??'').replaceAll('"','""')+'"';
  const csv=[keys.map(q).join(','),...rows.map(r=>keys.map(k=>q(r[k])).join(','))].join('\n');
  downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),name);
}
export function queue(state,table,recordId,action='upsert'){
  const key=table+':'+recordId;
  state.syncQueue=state.syncQueue.filter(x=>x.key!==key);
  state.syncQueue.push({id:uid(),key,table,recordId,action,status:'pending',createdAt:now(),lastError:''});
}
export function activity(state,type,message,studentId=null,amount=null){
  state.activityLog.unshift({id:uid(),type,message,studentId,amount,createdAt:now()});
  if(state.activityLog.length>1000)state.activityLog.length=1000;
}
export function resetOperationalData(state){
  state.students=[];state.feeEntries=[];state.refunds=[];state.feeSlips=[];state.activityLog=[];state.syncQueue=[];state.meta.lastSync=null;
}
