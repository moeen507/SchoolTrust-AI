export const escapeHtml=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
export const className=(state,id)=>state.classes.find(c=>c.id===id)?.class_name||'-';
export const shortDate=v=>{if(!v)return '-';try{return new Date(v).toLocaleDateString('en-GB')}catch{return String(v)}};
export const today=()=>new Date().toISOString().slice(0,10);
export function optionList(items,selected='',valueKey='id',labelFn=x=>x.name){
  return items.map(x=>'<option value="'+escapeHtml(x[valueKey])+'" '+(String(x[valueKey])===String(selected)?'selected':'')+'>'+escapeHtml(labelFn(x))+'</option>').join('');
}
