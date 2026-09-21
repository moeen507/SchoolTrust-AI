import {AppContext} from '../app-context.js';
import {StudentService} from '../student-service.js';
import {StudentAccountService} from '../student-account-service.js';
import {ActivityService} from '../activity-service.js';
import {PopupService} from '../popup-service.js';
import {ExportService} from '../export-service.js';
import {AuthService} from '../auth-service.js';
import {escapeHtml,className,optionList} from '../dom-utils.js';
import {debounce} from '../validation-service.js';
import {CONFIG} from '../config.js';

let page=1,accountStatus=new Map();
function activeRows(){return StudentService.filter(AppContext.state,{query:document.getElementById('student-search')?.value||'',classId:document.getElementById('student-class-filter')?.value||'',status:document.getElementById('student-status-filter')?.value??'active'})}
function renderStats(){
  const s=AppContext.state.students.filter(x=>String(x.status||'active')!=='deleted');
  document.getElementById('student-stats').innerHTML=[
    ['Total Students',s.length],['Portal Accounts',[...accountStatus.values()].filter(x=>x.status==='active').length],['Next Roll',AppContext.state.settings.next_student_roll_no||1],['Missing Phone',s.filter(x=>!x.phone_number).length]
  ].map(x=>'<div class="stat-card"><div class="stat-label">'+x[0]+'</div><div class="stat-value">'+x[1]+'</div></div>').join('');
}
function renderFilters(){
  const sel=document.getElementById('student-class-filter');sel.innerHTML='<option value="">All Classes</option>'+optionList(AppContext.state.classes,sel.value,'id',c=>c.class_name);
}
function renderTable(){
  const rows=activeRows(),pages=Math.max(1,Math.ceil(rows.length/CONFIG.pageSize));page=Math.min(page,pages);const start=(page-1)*CONFIG.pageSize,view=rows.slice(start,start+CONFIG.pageSize);
  document.getElementById('student-table').innerHTML='<div class="table-outer"><table><thead><tr><th>Roll</th><th>Student Name</th><th>Parent / Guardian</th><th>Class</th><th>Phone / WhatsApp</th><th>Portal</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+(view.length?view.map(s=>{
    const acc=accountStatus.get(s.id),portal=acc?'<span class="badge green">Active</span>':'<span class="badge warn">Not Provisioned</span>';
    return '<tr><td><b>'+escapeHtml(s.roll_number)+'</b></td><td>'+escapeHtml(s.student_name)+'</td><td>'+escapeHtml(s.father_name)+'</td><td>'+escapeHtml(className(AppContext.state,s.class_id))+'</td><td>'+escapeHtml(s.phone_number||'-')+'</td><td>'+portal+'</td><td><span class="badge '+(String(s.status)==='deleted'?'red':'green')+'">'+escapeHtml(s.status||'active')+'</span></td><td><div class="actions"><button class="btn btn-ghost" data-edit="'+s.id+'">Edit</button><button class="btn btn-ghost" data-ledger="'+s.id+'">Ledger</button><button class="btn btn-gold" data-fee="'+s.id+'">Fee</button><button class="btn btn-ghost" data-reset="'+s.id+'">Reset Login</button>'+(String(s.status||'active')==='deleted'?'':'<button class="btn btn-red" data-delete="'+s.id+'">Delete</button>')+'</div></td></tr>'
  }).join(''):'<tr><td colspan="8"><div class="empty-state">No students found.</div></td></tr>')+'</tbody></table></div>';
  document.getElementById('student-pagination').innerHTML='<span style="margin-right:auto;color:#9a8e7e;font-size:11px">'+rows.length+' student(s)</span><button id="pg-prev">Previous</button><span>Page '+page+' / '+pages+'</span><button id="pg-next">Next</button>';
  document.getElementById('pg-prev').disabled=page<=1;document.getElementById('pg-next').disabled=page>=pages;document.getElementById('pg-prev').onclick=()=>{page--;renderTable()};document.getElementById('pg-next').onclick=()=>{page++;renderTable()};
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openStudent(b.dataset.edit));
  document.querySelectorAll('[data-ledger]').forEach(b=>b.onclick=()=>{sessionStorage.setItem('umeed:student',b.dataset.ledger);AppContext.navigate('ledger')});
  document.querySelectorAll('[data-fee]').forEach(b=>b.onclick=()=>{sessionStorage.setItem('umeed:student',b.dataset.fee);AppContext.navigate('fee-entry')});
  document.querySelectorAll('[data-reset]').forEach(b=>b.onclick=()=>resetStudentLogin(b.dataset.reset));
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>removeStudent(b.dataset.delete));
}
function popupForm(student=null){
  const root=document.getElementById('popup-root'),back=document.createElement('div');back.className='popup-backdrop';const box=document.createElement('div');box.className='popup';
  const nextRoll=student?.roll_number||String(AppContext.state.settings.next_student_roll_no||1);
  box.innerHTML='<h3>'+(student?'Edit Student':'Add Student')+'</h3><p class="page-subtitle">'+(student?'Roll number / Student ID is permanent and cannot be changed.':'The next roll number is allocated centrally and becomes the Student Login ID.')+'</p><form id="student-modal-form"><div class="form-grid"><div class="form-group"><label>Roll Number / Student ID</label><input id="m-roll" readonly value="'+escapeHtml(nextRoll)+'"></div><div class="form-group"><label>Student Name</label><input id="m-name" required value="'+escapeHtml(student?.student_name||'')+'"></div><div class="form-group"><label>Parent / Guardian Name</label><input id="m-father" required value="'+escapeHtml(student?.father_name||'')+'"></div><div class="form-group"><label>Class</label><select id="m-class" required><option value="">Select Class</option>'+optionList(AppContext.state.classes,student?.class_id||'','id',c=>c.class_name)+'</select></div><div class="form-group span-2"><label>Phone / WhatsApp Number</label><input id="m-phone" required placeholder="03XXXXXXXXX" value="'+escapeHtml(student?.phone_number||'')+'"></div></div><div class="actions" style="margin-top:15px"><button class="btn btn-gold" type="submit">'+(student?'Save Changes':'Create Student + Login')+'</button><button id="m-cancel" class="btn btn-ghost" type="button">Cancel</button></div></form>';
  back.appendChild(box);root.appendChild(back);document.getElementById('m-cancel').onclick=()=>back.remove();return {back,form:document.getElementById('student-modal-form')};
}
async function credentialPopup(credential,title='Student Portal Credential'){
  return new Promise(resolve=>{
    const root=document.getElementById('popup-root'),back=document.createElement('div');back.className='popup-backdrop';const box=document.createElement('div');box.className='popup';
    box.innerHTML='<h3>'+escapeHtml(title)+'</h3><p>This temporary password is shown only now. Give it securely to the student/guardian.</p><div class="summary-strip"><div class="summary-item"><small>Student</small><b>'+escapeHtml(credential.student_name||'')+'</b></div><div class="summary-item"><small>Login ID / Roll</small><b>'+escapeHtml(credential.login_id||credential.roll_number||'')+'</b></div><div class="summary-item"><small>Temporary Password</small><b style="user-select:all">'+escapeHtml(credential.temporary_password||'')+'</b></div></div><div class="actions" style="margin-top:16px"><button id="cred-copy" class="btn btn-gold">Copy Credential</button><button id="cred-close" class="btn btn-ghost">Close</button></div>';
    back.appendChild(box);root.appendChild(back);
    document.getElementById('cred-copy').onclick=async()=>{await navigator.clipboard.writeText('Login ID: '+credential.login_id+'\nTemporary Password: '+credential.temporary_password);PopupService.success('Credential copied.')};
    document.getElementById('cred-close').onclick=()=>{back.remove();resolve(true)};
  });
}
function openStudent(id=null){
  const st=id?AppContext.state.students.find(s=>s.id===id):null,{back,form}=popupForm(st);
  form.onsubmit=async e=>{e.preventDefault();try{
    const payload={id:st?.id,created_at:st?.created_at,roll_number:document.getElementById('m-roll').value,student_name:document.getElementById('m-name').value,father_name:document.getElementById('m-father').value,class_id:document.getElementById('m-class').value,phone_number:document.getElementById('m-phone').value,status:st?.status||'active'};
    const result=st?await StudentService.update(AppContext.state,payload):await StudentService.createAutoRoll(AppContext.state,payload);
    await ActivityService.log(AppContext.state,{action:st?'student_updated':'student_added',entity_type:'student',entity_id:result.row.id,message:(st?'Updated ':'Added ')+result.row.student_name});
    await AppContext.save();back.remove();
    if(!st&&result.account){accountStatus.set(result.row.id,{student_id:result.row.id,login_id:result.account.login_id,status:'active'});await credentialPopup(result.account)}
    if(!st&&result.accountError)PopupService.warning('Student saved, but portal account needs attention: '+result.accountError);
    PopupService.success(st?'Student updated.':'Student added with Roll '+result.row.roll_number+'.');renderStats();renderTable();
  }catch(err){PopupService.error(err.message)}};
}
async function askPassword(title,text){
  return new Promise(resolve=>{
    const root=document.getElementById('popup-root'),back=document.createElement('div');back.className='popup-backdrop';const box=document.createElement('div');box.className='popup';
    box.innerHTML='<h3>'+escapeHtml(title)+'</h3><p>'+escapeHtml(text)+'</p><div class="form-group"><label>Current Password</label><input id="reauth-password" type="password" autocomplete="current-password"></div><div class="actions" style="margin-top:14px"><button id="reauth-confirm" class="btn btn-red">Verify & Continue</button><button id="reauth-cancel" class="btn btn-ghost">Cancel</button></div>';
    back.appendChild(box);root.appendChild(back);document.getElementById('reauth-password').focus();
    document.getElementById('reauth-cancel').onclick=()=>{back.remove();resolve(null)};
    document.getElementById('reauth-confirm').onclick=()=>{const v=document.getElementById('reauth-password').value;back.remove();resolve(v)};
  });
}
async function removeStudent(id){
  const s=AppContext.state.students.find(x=>x.id===id);if(!s)return;
  if(!await PopupService.confirm('Delete Student','Delete '+s.student_name+' from the active registry? Financial history will be preserved.','Continue'))return;
  const password=await askPassword('Password Verification','Enter your current password to authorize this destructive action.');if(!password)return;
  try{await AuthService.reauthenticate(password);await StudentService.softDelete(AppContext.state,id);await ActivityService.log(AppContext.state,{action:'student_deleted',entity_type:'student',entity_id:id,message:'Deleted '+s.student_name});await AppContext.save();PopupService.success('Student deleted after password verification.');renderStats();renderTable()}catch(e){PopupService.error(e.message)}
}
async function resetStudentLogin(id){
  const s=AppContext.state.students.find(x=>x.id===id);if(!s)return;
  if(!accountStatus.has(id)){
    try{const p=await StudentAccountService.provision([id]);if(p.created?.[0]){accountStatus.set(id,{student_id:id,login_id:p.created[0].login_id,status:'active'});await credentialPopup(p.created[0],'Student Portal Created');renderStats();renderTable();return}throw new Error(p.skipped?.[0]?.reason||'Account could not be created.')}catch(e){return PopupService.error(e.message)}
  }
  if(!await PopupService.confirm('Reset Student Login','Generate a new temporary password for '+s.student_name+'?','Reset Password'))return;
  try{const c=await StudentAccountService.resetPassword(id);await credentialPopup({...c,student_name:s.student_name,roll_number:s.roll_number},'New Student Portal Password')}catch(e){PopupService.error(e.message)}
}
async function importFile(file){
  try{
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]],raw=XLSX.utils.sheet_to_json(ws,{defval:''});
    const norm=k=>String(k).toLowerCase().replace(/[^a-z0-9]/g,''),get=(r,names)=>{for(const n of names){const k=Object.keys(r).find(x=>norm(x)===norm(n));if(k)return r[k]}return ''};
    const classes=AppContext.state.classes;
    const rows=raw.map(r=>{const classText=String(get(r,['class','grade'])).trim();const c=classes.find(x=>String(x.class_name).trim().toLowerCase()===classText.toLowerCase());return {roll_number:String(get(r,['roll number','roll no','roll'])).trim(),student_name:String(get(r,['student name','name'])).trim(),father_name:String(get(r,['parent guardian','guardian name','parent name','father name','father','guardian'])).trim(),class_id:c?.id||'',class_text:classText,phone_number:String(get(r,['phone','mobile','contact','whatsapp','whatsapp number'])).trim()}}).filter(r=>r.roll_number||r.student_name||r.father_name||r.class_text||r.phone_number);
    const preview=rows.slice(0,10).map(r=>r.roll_number+' | '+r.student_name+' | '+r.father_name+' | '+r.class_text+' | '+r.phone_number).join('\n');
    if(!await PopupService.confirm('Import Preview',rows.length+' non-empty row(s) detected. First rows:\n\n'+preview+'\n\nEvery accepted student will also receive a Student Portal account.','Import'))return;
    const result=await StudentService.bulkImport(AppContext.state,rows);
    await ActivityService.log(AppContext.state,{action:'students_imported',entity_type:'student',message:'Imported '+result.accepted.length+' students'});
    await AppContext.refreshCloud({quiet:true});await AppContext.save();
    if(result.credentials?.length){
      ExportService.csv(result.credentials.map(c=>({roll_number:c.roll_number,student_name:c.student_name,parent_guardian:c.parent_guardian,phone:c.phone,login_id:c.login_id,temporary_password:c.temporary_password})),'UMEED-Student-Portal-Credentials.csv');
      PopupService.success('Imported '+result.accepted.length+' student(s). '+result.credentials.length+' new portal credential(s) exported.');
    }else PopupService.success('Imported '+result.accepted.length+' student(s); skipped '+result.skipped.length+'.');
    if(result.accountSkipped?.length)PopupService.warning(result.accountSkipped.length+' portal account(s) need review.');
    await loadAccountStatus();renderStats();renderTable();
  }catch(e){PopupService.error('Import failed: '+e.message)}
}
async function loadAccountStatus(){
  try{const r=await StudentAccountService.status();accountStatus=new Map((r.accounts||[]).map(a=>[a.student_id,a]))}catch{accountStatus=new Map()}
}
export default{
  async init(){
    await loadAccountStatus();renderStats();renderFilters();renderTable();
    document.getElementById('student-add').onclick=()=>openStudent();
    const refresh=debounce(()=>{page=1;renderTable()},220);
    document.getElementById('student-search').oninput=refresh;document.getElementById('student-class-filter').onchange=refresh;document.getElementById('student-status-filter').onchange=refresh;
    document.getElementById('student-export').onclick=()=>ExportService.csv(activeRows().map(s=>({roll_number:s.roll_number,student_name:s.student_name,parent_guardian:s.father_name,class:className(AppContext.state,s.class_id),phone_whatsapp:s.phone_number,portal_account:accountStatus.has(s.id)?'Active':'Missing',status:s.status})),'UMEED-Students.csv');
    document.getElementById('student-import').onclick=()=>{const input=document.getElementById('global-file-input');input.accept='.xlsx,.xls,.csv';input.value='';input.onchange=()=>input.files?.[0]&&importFile(input.files[0]);input.click()};
  },destroy(){}
};