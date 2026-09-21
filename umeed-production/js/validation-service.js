export const ValidationService={
  required(value,label){if(String(value??'').trim()==='')throw new Error(label+' is required.')},
  phone(value){
    if(!value)return true;
    const digits=String(value).replace(/\D/g,'');
    if(!/^(92)?0?3\d{9}$/.test(digits))throw new Error('Enter a valid Pakistani mobile number.');
    return true;
  },
  nonNegative(value,label){const n=Number(value||0);if(!Number.isFinite(n)||n<0)throw new Error(label+' cannot be negative.');return n},
  student(input){
    this.required(input.roll_number,'Roll number');this.required(input.student_name,'Student name');this.required(input.father_name,'Father name');this.required(input.class_id,'Class');this.phone(input.phone_number);return true;
  },
  fee(input){
    this.required(input.student_id,'Student');this.required(input.fee_month,'Month');this.required(input.fee_year,'Year');
    for(const [k,l] of [['cash_paid','Cash paid'],['discount','Discount'],['fine','Fine'],['annual_fund_paid','Annual Fund payment'],['refund_amount','Refund amount']])this.nonNegative(input[k],l);
    return true;
  }
};
export function normalizePakPhone(value){
  let d=String(value||'').replace(/\D/g,'');
  if(!d)return '';
  if(d.startsWith('92'))return d;
  if(d.startsWith('0'))return '92'+d.slice(1);
  if(d.startsWith('3')&&d.length===10)return '92'+d;
  return d;
}
export function debounce(fn,wait=220){let t;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),wait)}}
