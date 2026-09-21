import {AppContext} from '../app-context.js';
import {SlipService} from '../slip-service.js';
import {WhatsAppService} from '../whatsapp-service.js';
import {PopupService} from '../popup-service.js';

let current=null;
function render(){const s=AppContext.state;current=s.selectedSlipId?SlipService.byId(s,s.selectedSlipId):SlipService.latest(s);document.getElementById('slip-host').innerHTML=SlipService.render(s,current)}
async function selectFee(fee){current=fee;await AppContext.setSelectedSlip(fee?.id||null);render()}
async function searchSlip(){
  const root=document.getElementById('popup-root'),back=document.createElement('div');back.className='popup-backdrop';const box=document.createElement('div');box.className='popup';
  box.innerHTML='<h3>Search Fee Slip</h3><p>Enter the exact official Fee Slip number.</p><div class="form-group"><label>Receipt Number</label><input id="slip-search-input" autocomplete="off"></div><div class="actions" style="margin-top:14px"><button id="slip-search-go" class="btn btn-gold">Open Slip</button><button id="slip-search-cancel" class="btn btn-ghost">Cancel</button></div>';
  back.appendChild(box);root.appendChild(back);document.getElementById('slip-search-cancel').onclick=()=>back.remove();
  document.getElementById('slip-search-go').onclick=async()=>{const fee=SlipService.find(AppContext.state,document.getElementById('slip-search-input').value);if(!fee)return PopupService.warning('Slip not found.');back.remove();await selectFee(fee)};
  document.getElementById('slip-search-input').focus();
}
export default{
  async init(){
    render();document.getElementById('slip-latest').onclick=()=>selectFee(SlipService.latest(AppContext.state));document.getElementById('slip-search').onclick=searchSlip;
    document.getElementById('slip-print').onclick=async()=>{if(!current)return PopupService.warning('Select a slip first.');if(!current.receipt_no)return PopupService.warning('This offline entry has no official receipt number. Sync it before printing.');try{if(window.umeedDesktop?.printA5){const r=await window.umeedDesktop.printA5();if(!r?.ok)throw new Error(r?.error||'Printer rejected the job.')}else window.print();PopupService.success('A5 slip sent to print.')}catch(e){PopupService.error('Print failed: '+e.message)}};
    document.getElementById('slip-whatsapp').onclick=()=>{try{if(!current)throw new Error('Select a slip first.');WhatsAppService.open(AppContext.state,current.student_id,WhatsAppService.slip(AppContext.state,current));PopupService.success('WhatsApp opened.')}catch(e){PopupService.error(e.message)}};
    document.getElementById('slip-copy').onclick=async()=>{try{if(!current)throw new Error('Select a slip first.');await navigator.clipboard.writeText(WhatsAppService.slip(AppContext.state,current));PopupService.success('Slip message copied.')}catch(e){PopupService.error(e.message)}};
    document.getElementById('slip-ledger').onclick=()=>{if(!current)return;sessionStorage.setItem('umeed:student',current.student_id);AppContext.navigate('ledger')};document.getElementById('slip-clear').onclick=()=>selectFee(null);
  },destroy(){}
};