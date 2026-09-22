export const ValidationService={
  required(value,label){if(String(value??'').trim()==='')throw new Error(label+' is required.')},
  phone(value){this.required(value,'Phone / WhatsApp number');const digits=String(value).replace(/\D/g,'');if(!/^(92)?0?3\d{9}$/.test(digits))throw new Error('Enter a valid Pakistani mobile number.');return true},
  nonNegative(value,label){const n=Number(value||0);if(!Number.isFinite(n)||n<0)throw new Error(label+' cannot be negative.');return n},
  student(input){this.required(input.roll_number,'Roll number');this.required(input.student_name,'Student name');this.required(input.father_name,'Parent / Guardian name');this.required(input.class_id,'Class');this.phone(input.phone_number);return true},
  feeReceipt(input){this.required(input.student_id,'Student');this.required(input.fee_year,'Year');this.nonNegative(input.annual_fund_paid,'Annual Fund payment');this.nonNegative(input.refund_amount,'Refund amount');for(const line of input.months||[]){this.required(line.fee_month,'Month');this.nonNegative(line.cash_paid,'Cash paid');this.nonNegative(line.discount,'Discount');this.nonNegative(line.fine,'Fine')}return true}
};
export function normalizePakPhone(value){let d=String(value||'').replace(/\D/g,'');if(!d)return '';if(d.startsWith('92'))return d;if(d.startsWith('0'))return '92'+d.slice(1);if(d.startsWith('3')&&d.length===10)return '92'+d;return d}
export function debounce(fn,wait=220){let t;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),wait)}}