export const CONFIG=Object.freeze({
  version:'3.2.2',
  supabaseUrl:'https://jqgwsgprqxfnvrmkpgyy.supabase.co',
  publishableKey:'sb_publishable_Cu1Ih1l5XhVS4-7mCdfUSQ_etb1v_-n',
  monthlyFee:2000,annualFund:2150,
  cacheDb:'UMEED_FEE_V3_CACHE',cacheStore:'kv',cacheKey:'state',sessionKey:'session',pageSize:50
});
export const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
export const ROUTES=['dashboard','daily-collection','defaulters','students','fee-entry','ledger','fee-slip','student-counter','d6','reports','settings','users','student-portal'];
export const ROUTE_ALIASES=Object.freeze({
  starter:'students',students:'students',fee:'fee-entry','feed entry':'fee-entry','fee-entry':'fee-entry',
  ledger:'ledger','connect ledger':'ledger',slip:'fee-slip','fee-slip':'fee-slip',receipt:'fee-slip',
  store:'student-counter',syllabus:'student-counter',canteen:'student-counter','student store':'student-counter','student-counter':'student-counter',
  'daily collection':'daily-collection','daily-collection':'daily-collection',collection:'daily-collection',
  defaulters:'defaulters',reminders:'defaulters',users:'users','user management':'users',
  student:'student-portal','student portal':'student-portal','student-portal':'student-portal',
  d6:'d6',database:'d6',records:'d6',reports:'reports',settings:'settings',dashboard:'dashboard'
});