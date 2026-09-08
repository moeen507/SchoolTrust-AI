(()=>{
  try {
    if(window.__peopleosR17LocaleLoaded){ window.__peopleosR17LocaleSync?.(); return; }
    window.__peopleosR17LocaleLoaded=true;
    const d=document.documentElement, bridge=window.PeopleOSNative;
    const KEY='peopleos_language';
    const originalText=new WeakMap(), appliedText=new WeakMap(), pending=new Set();
    let busy=false, observer=null, language='en';

    const UR={
      'PeopleOS':'PeopleOS','People OS':'People OS','Umeed Education System':'امید ایجوکیشن سسٹم',
      'Dashboard':'ڈیش بورڈ','Home':'ہوم','Attendance':'حاضری','Attendance register':'حاضری رجسٹر','Attendance Register':'حاضری رجسٹر',
      'Mobile Attendance':'موبائل حاضری','Punch':'پنچ','Punch Attendance':'حاضری لگائیں','Payroll':'تنخواہ','Profile':'پروفائل','Employees':'ملازمین','Employee':'ملازم',
      'Employee Dashboard':'ملازم ڈیش بورڈ','EMPLOYEE DASHBOARD':'ملازم ڈیش بورڈ','ATTENDANCE':'حاضری','PAYROLL':'تنخواہ','PROFILE':'پروفائل',
      'Total Employees':'کل ملازمین','TOTAL EMPLOYEES':'کل ملازمین','Checked In':'چیک اِن','CHECKED IN':'چیک اِن','Completed':'مکمل','COMPLETED':'مکمل',
      'Present':'حاضر','PRESENT':'حاضر','Absent':'غیر حاضر','ABSENT':'غیر حاضر','Late':'تاخیر','LATE':'تاخیر','Missing Punch':'مسنگ پنچ','MISSING PUNCH':'مسنگ پنچ',
      'Active workforce · Super Admin excluded':'فعال عملہ · سپر ایڈمن شامل نہیں','IN + OUT recorded':'اِن اور آؤٹ ریکارڈ ہو چکے ہیں','IN + OUT complete':'اِن اور آؤٹ مکمل',
      'No IN after check-in window':'مقررہ چیک اِن وقت کے بعد اِن موجود نہیں','IN but no OUT after shift end':'شفٹ ختم ہونے کے بعد آؤٹ موجود نہیں',
      'Separate flag':'الگ شمار','0 awaiting OUT':'0 افراد کا آؤٹ باقی ہے','awaiting OUT':'آؤٹ باقی ہے',
      'IN':'اِن','OUT':'آؤٹ','Worked':'کام','Worked hours':'کام کے اوقات','Worked Hours':'کام کے اوقات','View day detail':'دن کی تفصیل دیکھیں',
      'Today':'آج','Today’s Snapshot':'آج کی صورتحال',"Today's Snapshot":'آج کی صورتحال','Monthly Summary':'ماہانہ خلاصہ','Weekly Summary':'ہفتہ وار خلاصہ',
      'Attendance Flag':'حاضری کی صورتحال','Attendance flags':'حاضری کی صورتحال','Late IN':'لیٹ اِن','Early OUT':'ارلی آؤٹ','Leave Balance':'چھٹیوں کا بیلنس','Leave balance':'چھٹیوں کا بیلنس',
      'Leave':'چھٹی','Leaves':'چھٹیاں','Leave Requests':'چھٹی کی درخواستیں','Leave requests':'چھٹی کی درخواستیں','Apply Leave':'چھٹی کی درخواست دیں','Request Leave':'چھٹی کی درخواست دیں',
      'Pending':'زیر التوا','Approved':'منظور','Rejected':'مسترد','Cancelled':'منسوخ','Available':'دستیاب','Used':'استعمال شدہ','Remaining':'باقی',
      'Search':'تلاش کریں','Search employees':'ملازمین تلاش کریں','Search and filter without changing the source attendance calculation.':'اصل حاضری کے حساب کو تبدیل کیے بغیر تلاش اور فلٹر کریں۔',
      'Register filters':'رجسٹر فلٹرز','Register Filters':'رجسٹر فلٹرز','Filter':'فلٹر','Filters':'فلٹرز','Department':'شعبہ','Designation':'عہدہ','Role':'کردار','Status':'حیثیت','Date':'تاریخ','Time':'وقت',
      'Refresh':'ریفریش','CSV':'CSV','PDF':'PDF','Export':'ایکسپورٹ','Import':'امپورٹ','Import transactions':'ٹرانزیکشنز امپورٹ کریں','Attendance Sync':'حاضری سنک','Sync':'سنک',
      'Org holidays':'ادارے کی تعطیلات','Employee holidays':'ملازم کی تعطیلات','Holidays':'تعطیلات','Holiday':'تعطیل',
      'Name':'نام','Employee Code':'ملازم کوڈ','Employee code':'ملازم کوڈ','Phone':'فون','Email':'ای میل','Address':'پتہ','Joining Date':'تاریخِ شمولیت','Joining date':'تاریخِ شمولیت',
      'Basic Salary':'بنیادی تنخواہ','Gross Salary':'مجموعی تنخواہ','Net Salary':'خالص تنخواہ','Allowances':'الاؤنسز','Deductions':'کٹوتیاں','Deduction':'کٹوتی','Bonus':'بونس','Overtime':'اوور ٹائم',
      'Absence Deduction':'غیر حاضری کی کٹوتی','Late Deduction':'تاخیر کی کٹوتی','Unpaid Leave':'بغیر تنخواہ چھٹی','Other Deductions':'دیگر کٹوتیاں','Loan / Advance':'قرض / ایڈوانس',
      'Payslip':'تنخواہ سلپ','Generate Payroll':'تنخواہ تیار کریں','Payroll Run':'پے رول رن','Validate':'تصدیق کریں','Draft':'مسودہ','Paid':'ادا شدہ','Locked':'لاک',
      'My Profile':'میرا پروفائل','Personal Information':'ذاتی معلومات','Account':'اکاؤنٹ','Settings':'ترتیبات','Notifications':'اطلاعات','Notification':'اطلاع','Appearance':'ظاہری انداز',
      'Ivory':'آئیوری','Light':'لائٹ','Dark':'ڈارک','Language':'زبان','English':'انگریزی','Urdu':'اردو','Menu':'مینو','Close':'بند کریں','Back':'واپس','Save':'محفوظ کریں','Cancel':'منسوخ کریں','Submit':'جمع کریں','Update':'اپ ڈیٹ کریں','Edit':'ترمیم کریں','Delete':'حذف کریں','Download':'ڈاؤن لوڈ','Upload':'اپ لوڈ',
      'Camera':'کیمرہ','Location':'لوکیشن','GPS':'جی پی ایس','Selfie':'سیلفی','Take Selfie':'سیلفی لیں','Verify Location':'لوکیشن کی تصدیق کریں','Submit Attendance':'حاضری جمع کریں',
      'Camera permission':'کیمرہ اجازت','Location permission':'لوکیشن اجازت','Permission required':'اجازت درکار ہے','Try again':'دوبارہ کوشش کریں','Loading...':'لوڈ ہو رہا ہے...','Please wait...':'براہِ کرم انتظار کریں...',
      'Active':'فعال','Inactive':'غیر فعال','Teaching Staff':'تدریسی عملہ','Support Staff':'معاون عملہ','Administration':'انتظامیہ','Super Admin':'سپر ایڈمن','HR Admin':'ایچ آر ایڈمن','Management':'مینجمنٹ','Department Head':'شعبہ سربراہ',
      'No data':'کوئی ڈیٹا نہیں','No records found':'کوئی ریکارڈ نہیں ملا','No attendance records':'حاضری کا کوئی ریکارڈ نہیں','No notifications':'کوئی اطلاع نہیں','No events':'کوئی ایونٹ نہیں',
      'Birthdays':'سالگرہیں','Anniversaries':'سالگرۂ ملازمت','Events':'ایونٹس','This month':'اس ماہ','This Month':'اس ماہ','Current month':'موجودہ ماہ','Previous month':'گزشتہ ماہ',
      'Present Days':'حاضری کے دن','Absent Days':'غیر حاضری کے دن','Late Days':'تاخیر کے دن','Attendance %':'حاضری ٪','Attendance Percentage':'حاضری فیصد',
      'First IN':'پہلا اِن','Last OUT':'آخری آؤٹ','Shift':'شفٹ','Grace':'رعایتی وقت','Minutes':'منٹ','Hours':'گھنٹے','Days':'دن',
      'Forgot password?':'پاس ورڈ بھول گئے؟','Forgot Password':'پاس ورڈ بھول گئے','Sign in':'سائن اِن','Sign In':'سائن اِن','Login':'لاگ اِن','Log in':'لاگ اِن','Logout':'لاگ آؤٹ','Log out':'لاگ آؤٹ',
      'Email address':'ای میل ایڈریس','Password':'پاس ورڈ','Remember me':'مجھے یاد رکھیں','New to People OS? Sign up':'People OS پر نئے ہیں؟ سائن اپ کریں','Sign up':'سائن اپ','Register':'رجسٹر کریں',
      'Welcome':'خوش آمدید','Good morning':'صبح بخیر','Good afternoon':'دوپہر بخیر','Good evening':'شام بخیر','Live physical attendance classification, advanced charts and source-backed exports.':'لائیو حاضری کی درجہ بندی، جدید چارٹس اور اصل ڈیٹا پر مبنی ایکسپورٹس۔'
    };

    const partial=[
      [/^(\d+)m late$/i,'$1 منٹ تاخیر'],[/^(\d+) min late$/i,'$1 منٹ تاخیر'],[/^(\d+)m early$/i,'$1 منٹ پہلے'],
      [/^(\d+) employees?$/i,'$1 ملازمین'],[/^(\d+) employee$/i,'$1 ملازم'],[/^(\d+) days?$/i,'$1 دن'],[/^(\d+) hours?$/i,'$1 گھنٹے'],
      [/^Active workforce\s*·\s*Super Admin excluded$/i,'فعال عملہ · سپر ایڈمن شامل نہیں'],
      [/^IN but no OUT$/i,'اِن موجود ہے مگر آؤٹ نہیں'],[/^No IN punch$/i,'اِن پنچ موجود نہیں']
    ];
    const translate=s=>{ const t=s.trim(); if(!t)return s; let v=UR[t]; if(!v){ for(const [r,x] of partial){ if(r.test(t)){ v=t.replace(r,x); break; } } } if(!v)return s; return s.replace(t,v); };

    const skip=n=>{const p=n.parentElement; return !p || p.closest('script,style,code,pre,[data-no-translate],#pos-ai-sheet,#pos-ai');};
    const textNode=n=>{
      if(skip(n))return;
      if(language==='ur'){
        const last=appliedText.get(n);
        if(last && n.nodeValue===last)return;
        if(last && n.nodeValue!==last) originalText.set(n,n.nodeValue);
        if(!originalText.has(n))originalText.set(n,n.nodeValue);
        const out=translate(originalText.get(n));
        if(out!==n.nodeValue){ appliedText.set(n,out); n.nodeValue=out; }
      }else if(originalText.has(n)){
        const o=originalText.get(n); if(n.nodeValue!==o)n.nodeValue=o; appliedText.delete(n);
      }
    };
    const attrMap=['placeholder','title','aria-label'];
    const attrNode=el=>{
      if(!el?.getAttribute || el.closest?.('#pos-ai-sheet,#pos-ai,[data-no-translate]'))return;
      for(const a of attrMap){
        const k='posOrig'+a.replace('-','').replace(/^(.)/,m=>m.toUpperCase());
        if(language==='ur'){
          const cur=el.getAttribute(a); if(cur==null)continue; if(!el.dataset[k])el.dataset[k]=cur;
          const out=translate(el.dataset[k]); if(out!==cur)el.setAttribute(a,out);
        }else if(el.dataset[k]) el.setAttribute(a,el.dataset[k]);
      }
      if(language==='ur' && el.tagName==='INPUT' && ['email','password','tel','number'].includes((el.type||'').toLowerCase())){ el.dir='ltr'; }
    };
    const walk=root=>{
      if(!root)return;
      if(root.nodeType===3){textNode(root);return;}
      if(root.nodeType!==1 && root.nodeType!==9 && root.nodeType!==11)return;
      if(root.nodeType===1)attrNode(root);
      const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
      let n; while((n=tw.nextNode())){ if(n.nodeType===3)textNode(n); else attrNode(n); }
    };
    const flush=()=>{ if(busy)return; busy=true; const list=[...pending]; pending.clear(); requestAnimationFrame(()=>{try{list.forEach(walk);}finally{busy=false;}}); };
    const queue=n=>{ if(!n)return; pending.add(n.nodeType===3?n.parentNode||n:n); if(!busy)setTimeout(flush,35); };

    const ensureCss=()=>{
      if(document.getElementById('peopleos-r17-l10n-css'))return;
      const s=document.createElement('style');s.id='peopleos-r17-l10n-css';s.textContent=`
        #peopleos-lang-toggle{width:42px;height:42px;min-width:42px;border:1px solid rgba(92,66,75,.13);border-radius:14px;background:rgba(255,255,255,.58);color:inherit;display:grid;place-items:center;padding:0;font-size:11px;font-weight:900;letter-spacing:.02em}
        html[data-native-theme='dark'] #peopleos-lang-toggle{background:rgba(255,255,255,.055);border-color:rgba(255,255,255,.12);color:#f8edf1}
        html[data-peopleos-language='ur'] body,html[data-peopleos-language='ur'] #root{font-family:'Noto Sans Arabic','Noto Naskh Arabic','Segoe UI',Tahoma,sans-serif!important}
        html[data-peopleos-language='ur'] body{direction:rtl}
        html[data-peopleos-language='ur'] #peopleos-native-appbar .bar,html[data-peopleos-language='ur'] #peopleos-theme-sheet{direction:rtl}
        html[data-peopleos-language='ur'] #peopleos-native-dock{direction:rtl}
        html[data-peopleos-language='ur'] #peopleos-native-appbar .titlewrap,html[data-peopleos-language='ur'] main,html[data-peopleos-language='ur'] .page-container{text-align:right}
        html[data-peopleos-language='ur'] input:not([type='email']):not([type='password']):not([type='number']):not([type='tel']),html[data-peopleos-language='ur'] textarea,html[data-peopleos-language='ur'] select{direction:rtl;text-align:right}
        html[data-peopleos-language='ur'] input[type='email'],html[data-peopleos-language='ur'] input[type='password'],html[data-peopleos-language='ur'] input[type='number'],html[data-peopleos-language='ur'] input[type='tel']{direction:ltr;text-align:left}
        html[data-peopleos-language='ur'] .flex-row,html[data-peopleos-language='ur'] .items-center{unicode-bidi:plaintext}
        html[data-peopleos-language='ur'] table{direction:rtl}
        html[data-peopleos-language='ur'] .text-left{text-align:right!important}
        html[data-peopleos-language='ur'] .text-right{text-align:left!important}
        @media(max-width:380px){#peopleos-lang-toggle{width:38px;height:38px;min-width:38px;border-radius:12px;font-size:10px}}
      `;document.head.appendChild(s);
    };

    const button=()=>{
      const actions=document.querySelector('#peopleos-native-appbar .actions'); if(!actions)return;
      let b=document.getElementById('peopleos-lang-toggle');
      if(!b){ b=document.createElement('button'); b.id='peopleos-lang-toggle'; b.type='button'; b.title='Language'; b.setAttribute('aria-label','Language'); actions.prepend(b); b.onclick=()=>setLanguage(language==='ur'?'en':'ur'); }
      b.textContent=language==='ur'?'EN':'اردو';
    };
    const nativeLabels=()=>{
      const title=document.querySelector('#peopleos-native-appbar .title'); if(title){
        const route=(location.pathname||'/').toLowerCase();
        const en=route.includes('attendance')?(route.includes('mobile')?'Punch Attendance':'Attendance Register'):route.includes('payroll')?'Payroll':route.includes('profile')?'Profile':'Dashboard';
        title.textContent=language==='ur'?translate(en):en;
      }
      document.querySelectorAll('#peopleos-native-dock .dockbtn').forEach(x=>{
        const lab=x.querySelector('.docklabel'); if(!lab)return;
        const raw=(x.dataset.route||x.getAttribute('data-path')||'').toLowerCase();
        const en=raw.includes('mobile')?'Punch':raw.includes('attendance')?'Attendance':raw.includes('payroll')?'Payroll':raw.includes('profile')?'Profile':'Home';
        lab.textContent=language==='ur'?translate(en):en;
      });
      button();
    };
    const setLanguage=lang=>{
      language=lang==='ur'?'ur':'en';
      try{localStorage.setItem(KEY,language);}catch(_){}
      try{bridge?.setAppLanguage?.(language);}catch(_){}
      d.dataset.peopleosLanguage=language; d.lang=language==='ur'?'ur':'en'; d.dir=language==='ur'?'rtl':'ltr';
      if(document.body)document.body.dir=d.dir;
      nativeLabels();
      walk(document.body||document);
      window.dispatchEvent(new CustomEvent('peopleos:language',{detail:{language}}));
    };
    const saved=()=>{ try{const n=bridge?.getSavedLanguage?.(); if(n==='ur'||n==='en')return n;}catch(_){} try{const x=localStorage.getItem(KEY);if(x==='ur'||x==='en')return x;}catch(_){} return 'en'; };
    const startObserver=()=>{
      if(observer||!document.body)return;
      observer=new MutationObserver(ms=>{
        if(busy)return;
        for(const m of ms){ if(m.type==='characterData')queue(m.target); else {m.addedNodes.forEach(queue); if(m.target?.nodeType===1)queue(m.target);} }
        nativeLabels();
      });
      observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    };
    window.PeopleOSLocale={getLanguage:()=>language,setLanguage,translate:s=>language==='ur'?translate(s):s,isUrdu:()=>language==='ur'};
    window.__peopleosR17LocaleSync=()=>{ensureCss();button();nativeLabels();queue(document.body);};
    ensureCss(); setLanguage(saved()); startObserver();
    setTimeout(()=>{button();nativeLabels();queue(document.body);},350);
  }catch(e){console.warn('PeopleOS R17 localization',e)}
})();