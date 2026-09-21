import {CONFIG} from './config.js';

function openDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(CONFIG.cacheDb,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(CONFIG.cacheStore))db.createObjectStore(CONFIG.cacheStore)};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
async function get(key,fallback=null){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(CONFIG.cacheStore,'readonly'),req=tx.objectStore(CONFIG.cacheStore).get(key);req.onsuccess=()=>resolve(req.result??fallback);req.onerror=()=>reject(req.error)})}
async function set(key,value){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(CONFIG.cacheStore,'readwrite');tx.objectStore(CONFIG.cacheStore).put(value,key);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error)})}
async function remove(key){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(CONFIG.cacheStore,'readwrite');tx.objectStore(CONFIG.cacheStore).delete(key);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error)})}
export function emptyCache(){
  return {
    students:[],classes:[],classFeeSchedule:[],feeEntries:[],refunds:[],activityLog:[],profile:null,
    catalogItems:[],counterSales:[],counterSaleItems:[],
    settings:{
      school_name:'UMEED Education System',school_phone:'',school_address:'',
      monthly_fee:2000,annual_fund:2150,slip_prefix:'UES',next_receipt_no:1,
      fee_receipt_prefix:'UES',next_fee_receipt_no:1,
      counter_receipt_prefix:'SC',next_counter_receipt_no:1,
      prepared_by:'Admin/Cashier'
    },
    syncQueue:[],lastSync:null,lastCloudRefresh:null,selectedSlipId:null,selectedCounterSaleId:null
  };
}
export const StorageService={
  async loadCache(){return {...emptyCache(),...(await get(CONFIG.cacheKey,{}))}},
  saveCache:cache=>set(CONFIG.cacheKey,cache),
  async loadSession(){return await get(CONFIG.sessionKey,null)},
  saveSession:session=>set(CONFIG.sessionKey,session),
  clearSession:()=>remove(CONFIG.sessionKey),
  async clearCache(){return set(CONFIG.cacheKey,emptyCache())},
  async exportBackup(cache){return {schemaVersion:31,exportedAt:new Date().toISOString(),...cache}},
  validateBackup(data){
    if(!data||typeof data!=='object')throw new Error('Invalid backup file.');
    for(const k of ['students','feeEntries','refunds','activityLog'])if(!Array.isArray(data[k]))throw new Error('Backup is missing '+k+'.');
    return true
  }
};