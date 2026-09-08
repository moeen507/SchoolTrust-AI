(()=>{
  try{
    if(window.__peopleosR18Loaded){window.__peopleosR18Sync?.();return}
    window.__peopleosR18Loaded=true;
    const d=document.documentElement,bridge=window.PeopleOSNative;
    const U='https://xnduhrwozzqfxltbhjnj.supabase.co',K='sb_publishable_IK5lGzRL54YSSjrWGGOn8g_Flup_ROt';
    const S={self:new Map(),team:new Map(),emp:new Map(),role:null,busy:false};

    const authPath=()=>/\/(login|signin|sign-in|signup|sign-up|register|forgot-password|reset-password)(\/|$)/i.test(location.pathname||'');
    const loginUi=()=>{
      const pwd=document.querySelector('input[type="password"]');
      if(!pwd)return false;
      const user=document.querySelector('input[type="email"],input[name*="email" i],input[name*="user" i],input[autocomplete="username"]');
      const copy=Array.from(document.querySelectorAll('h1,h2,h3,button,label,p')).slice(0,90).map(x=>(x.textContent||'').toLowerCase()).join(' ');
      return !!user||/\b(sign in|log in|login|forgot password|welcome back)\b/.test(copy);
    };
    const appVisible=()=>!!document.querySelector('main,.home-dashboard-v584,.employee-dashboard-v585,.attendance-premium-page,.mobile-attendance-page,[class*="dashboard" i],a[href*="/attendance"],a[href*="/payroll"],a[href*="/profile"]');
    const rescueSignals=()=>{
      let box=document.getElementById('peopleos-r18-auth-signals');
      const should=!authPath()&&!loginUi()&&appVisible();
      if(should&&!box){box=document.createElement('div');box.id='peopleos-r18-auth-signals';box.hidden=true;box.innerHTML='<a href="/attendance"></a><a href="/payroll"></a><a href="/profile"></a>';document.body?.appendChild(box)}
      if(!should&&box)box.remove();
      if(should){
        d.dataset.nativeAuth='yes';
        try{window.__peopleosR15Sync?.()}catch(_){}
        try{window.__peopleosR17LocaleSync?.()}catch(_){}
      }
      return should;
    };

    const lang=()=>window.PeopleOSLocale?.getLanguage?.()==='ur'||d.dataset.peopleosLanguage==='ur'?'ur':'en';
    const pair=(en,ur)=>({en,ur}),pick=x=>typeof x==='string'?x:(x?.[lang()]||x?.en||'');
    const ensureLanguageControl=()=>{
      const actions=document.querySelector('#peopleos-native-appbar .actions');
      if(!actions)return;
      let b=document.getElementById('peopleos-r18-lang');
      if(!b){
        b=document.createElement('button');b.id='peopleos-r18-lang';b.type='button';b.className='icon';
        b.style.fontSize='10px';b.style.fontWeight='900';b.style.letterSpacing='.01em';
        b.onclick=()=>{const next=lang()==='ur'?'en':'ur';try{window.PeopleOSLocale?.setLanguage?.(next)}catch(_){}try{bridge?.setAppLanguage?.(next)}catch(_){}d.dataset.peopleosLanguage=next;d.lang=next==='ur'?'ur':'en';d.dir=next==='ur'?'rtl':'ltr';setTimeout(sync,30)};
        actions.prepend(b);
      }
      b.textContent=lang()==='ur'?'EN':'اردو';b.title=lang()==='ur'?'Switch to English':'اردو';b.setAttribute('aria-label',b.title);
    };

    const css=document.createElement('style');css.id='peopleos-ai-r18-style';css.textContent=`
      #pos-ai-r17,#pos-ai-r17-sheet,#pos-ai-r17-scrim{display:none!important}
      #pos-ai-r18,#pos-ai-r18-sheet,#pos-ai-r18-scrim{font-family:inherit}
      #pos-ai-r18{display:none;position:fixed;z-index:2147483400;right:13px;bottom:max(88px,calc(env(safe-area-inset-bottom) + 84px));width:48px;height:48px;border:1px solid rgba(231,201,115,.55);border-radius:17px;background:linear-gradient(145deg,#a51d49,#70122f);box-shadow:0 14px 32px rgba(91,13,42,.28);padding:0;color:#fff8e9;place-items:center}
      html[data-native-auth='yes'] #pos-ai-r18{display:grid}
      #pos-ai-r18 .orb{width:35px;height:35px;border-radius:13px;display:grid;place-items:center;background:radial-gradient(circle at 32% 20%,#fff1ba,#dab75d 31%,#9c1a45 64%,#5c0e29);font-weight:950;font-size:12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}
      #pos-ai-r18-scrim{display:none;position:fixed;z-index:2147483401;inset:0;background:rgba(18,10,13,.42);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}#pos-ai-r18-scrim.open{display:block}
      #pos-ai-r18-sheet{display:none;position:fixed;z-index:2147483402;left:7px;right:7px;bottom:max(83px,calc(env(safe-area-inset-bottom) + 79px));height:min(70dvh,620px);min-height:min(420px,calc(100dvh - 112px));border:1px solid color-mix(in srgb,hsl(var(--border)) 80%,#d8b85e 20%);border-radius:24px;background:hsl(var(--card));color:hsl(var(--foreground));overflow:hidden;grid-template-rows:auto auto 1fr auto;box-shadow:0 24px 70px rgba(27,12,18,.36)}#pos-ai-r18-sheet.open{display:grid;animation:r18up .18s ease-out}@keyframes r18up{from{opacity:.2;transform:translateY(16px) scale(.987)}to{opacity:1;transform:none}}
      .r18h{display:grid;grid-template-columns:38px minmax(0,1fr) 36px;gap:9px;align-items:center;padding:9px 10px;border-bottom:1px solid hsl(var(--border));background:linear-gradient(180deg,color-mix(in srgb,hsl(var(--card)) 94%,#d6b762 6%),hsl(var(--card)))}.r18logo{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:radial-gradient(circle at 30% 20%,#fff0b6,#d9b65d 31%,#961940 65%,#500c25);color:#fff9eb;font-weight:950;font-size:11px}.r18title strong{display:block;font-size:15.5px;line-height:1.05}.r18title span{display:block;margin-top:4px;font-size:9.5px;color:hsl(var(--muted-foreground));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.r18close{width:36px;height:36px;border:1px solid hsl(var(--border));border-radius:12px;background:hsl(var(--background));color:inherit;font-size:20px;padding:0}
      .r18chips{display:flex;gap:6px;overflow-x:auto;padding:7px 9px;border-bottom:1px solid hsl(var(--border));scrollbar-width:none}.r18chips::-webkit-scrollbar{display:none}.r18chip{flex:0 0 auto;height:30px;padding:0 10px;border:1px solid hsl(var(--border));border-radius:999px;background:hsl(var(--background));color:inherit;font-size:9.8px;font-weight:760;white-space:nowrap}.r18chip.sup{display:none}#pos-ai-r18-sheet.supervisor .r18chip.sup{display:inline-flex;align-items:center}
      .r18msgs{overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;padding:10px 10px 12px;display:flex;flex-direction:column;gap:8px;background:linear-gradient(180deg,hsl(var(--background)),color-mix(in srgb,hsl(var(--background)) 95%,#9b1842 5%))}.r18msg{max-width:87%;padding:9px 11px;border-radius:15px;font-size:12.4px;line-height:1.48;white-space:pre-wrap;overflow-wrap:anywhere}.r18msg.bot{align-self:flex-start;background:hsl(var(--card));border:1px solid hsl(var(--border));border-bottom-left-radius:5px}.r18msg.user{align-self:flex-end;background:linear-gradient(145deg,#a21c48,#741330);color:#fff9eb;border-bottom-right-radius:5px}.r18msg.wait{opacity:.63;font-style:italic}.r18src{display:block;margin-top:7px;padding-top:6px;border-top:1px dashed color-mix(in srgb,hsl(var(--border)) 72%,transparent);font-size:9.3px;color:hsl(var(--muted-foreground))}
      .r18form{display:grid;grid-template-columns:minmax(0,1fr) 43px;gap:7px;padding:8px 9px calc(8px + env(safe-area-inset-bottom));border-top:1px solid hsl(var(--border));background:hsl(var(--card))}.r18in{height:43px;max-height:86px;resize:none;border:1px solid hsl(var(--border));border-radius:14px;background:hsl(var(--background));color:inherit;padding:10px 12px;font-size:15px!important;line-height:1.35;outline:none}.r18send{width:43px;height:43px;border:0;border-radius:14px;background:linear-gradient(145deg,#a61d49,#70122f);color:#fff8e9;font-size:18px;font-weight:950}
      html[data-peopleos-language='ur'] #pos-ai-r18-sheet{direction:rtl}html[data-peopleos-language='ur'] .r18in{direction:rtl;text-align:right}html[data-peopleos-language='ur'] .r18msg.user{align-self:flex-start}html[data-peopleos-language='ur'] .r18msg.bot{align-self:flex-end;border-bottom-left-radius:15px;border-bottom-right-radius:5px;text-align:right}
      html[data-native-theme='dark'] #pos-ai-r18-sheet{background:#1f171a;border-color:#48363d}html[data-native-theme='dark'] .r18msgs{background:linear-gradient(180deg,#171113,#1c1216)}html[data-native-theme='dark'] .r18msg.bot{background:#24191d}
      @media(max-width:360px){#pos-ai-r18{right:10px;width:44px;height:44px}#pos-ai-r18-sheet{left:5px;right:5px;height:min(72dvh,600px)}.r18msg{font-size:12px;max-width:91%}.r18chip{font-size:9.2px;padding:0 8px}}
      @media(min-width:700px){#pos-ai-r18-sheet{left:auto;right:14px;bottom:14px;width:410px;height:min(630px,calc(100dvh - 28px))}}
    `;(document.head||d).appendChild(css);

    const deep=v=>{if(!v)return null;if(typeof v==='string'){if(v.split('.').length===3&&v.length>60)return v;try{return deep(JSON.parse(v))}catch(_){return null}}if(Array.isArray(v)){for(const x of v){const t=deep(x);if(t)return t}}else if(typeof v==='object'){if(typeof v.access_token==='string')return v.access_token;if(v.session?.access_token)return v.session.access_token;for(const x of Object.values(v)){const t=deep(x);if(t)return t}}return null};
    const tok=store=>{try{let t=deep(store.getItem('sb-xnduhrwozzqfxltbhjnj-auth-token'));if(t)return t;for(let i=0;i<store.length;i++){const k=store.key(i)||'';if(/auth|supabase|session/i.test(k)){t=deep(store.getItem(k));if(t)return t}}}catch(_){}return null};
    const token=()=>tok(localStorage)||tok(sessionStorage);
    const rpc=async(n,p={})=>{const t=token();if(!t)throw Error('SESSION');const r=await fetch(`${U}/rest/v1/rpc/${n}`,{method:'POST',headers:{'Content-Type':'application/json',apikey:K,Authorization:`Bearer ${t}`},body:JSON.stringify(p)}),txt=await r.text();let j;try{j=txt?JSON.parse(txt):null}catch(_){j=txt}if(!r.ok)throw Error(j?.message||j?.error||`HTTP ${r.status}`);return j};
    const pad=n=>String(n).padStart(2,'0'),monthKey=q=>{const now=new Date(),x=new Date(now.getFullYear(),now.getMonth(),1),s=q.toLowerCase();if(/last month|previous month|pichl|گزشتہ|پچھلے/.test(s))x.setMonth(x.getMonth()-1);return `${x.getFullYear()}-${pad(x.getMonth()+1)}-01`};
    const monthName=(k,l='en')=>new Intl.DateTimeFormat(l==='ur'?'ur-PK':'en-PK',{month:'long',year:'numeric'}).format(new Date(k+'T00:00:00'));
    const dateFmt=(x,l='en')=>{if(!x)return'—';try{return new Intl.DateTimeFormat(l==='ur'?'ur-PK':'en-PK',{day:'numeric',month:'short',year:'numeric'}).format(new Date(String(x).slice(0,10)+'T00:00:00'))}catch(_){return String(x)}};
    const timeFmt=(x,l='en')=>{if(!x)return'—';try{return new Intl.DateTimeFormat(l==='ur'?'ur-PK':'en-PK',{hour:'numeric',minute:'2-digit'}).format(new Date(x))}catch(_){return String(x)}};
    const money=n=>`Rs. ${new Intl.NumberFormat('en-PK',{maximumFractionDigits:0}).format(Number(n)||0)}`;
    const hm=(n,l='en')=>{n=Math.max(0,Number(n)||0);const h=Math.floor(n/60),m=n%60;return l==='ur'?`${h} گھنٹے ${m} منٹ`:`${h}h ${m}m`};
    const listDates=(a,l='en')=>a?.length?a.map(x=>dateFmt(x,l)).join(l==='ur'?'، ':', '):(l==='ur'?'کوئی نہیں':'None');
    const sup=r=>['department_head','management','hr_admin','super_admin'].includes(r);
    const syncRole=()=>document.getElementById('pos-ai-r18-sheet')?.classList.toggle('supervisor',sup(S.role));
    const self=async m=>{if(S.self.has(m))return S.self.get(m);const x=await rpc('peopleos_ai_self_context',{p_month:m});S.self.set(m,x);S.role=x?.employee?.role;syncRole();return x};
    const team=async m=>{if(S.team.has(m))return S.team.get(m);const x=await rpc('peopleos_ai_team_context',{p_month:m});S.team.set(m,x);return x};
    const emp=async(c,m)=>{const k=c+'|'+m;if(S.emp.has(k))return S.emp.get(k);const x=await rpc('peopleos_ai_team_employee_context',{p_employee_code:c,p_month:m});S.emp.set(k,x);return x};

    const norm=q=>q.toLowerCase().replace(/[?.,!]/g,' ').replace(/\s+/g,' ').trim();
    const contains=(q,...xs)=>xs.some(x=>q.includes(x));
    const mine=q=>/\b(my|me|mine|i)\b/.test(q)||contains(q,'میری','میرا','مجھے','میرے','mera','meri','mere','mujhe');
    const teamWords=q=>contains(q,'team','staff','department','employees','employee','میری ٹیم','سٹاف','عملہ','ملازم','team ka','staff ka','who is','kon','کون');
    const greeting=q=>/^(hi|hy|hey|hello|salam|assalam|aoa|اسلام علیکم|السلام علیکم|سلام)(\s|$)/i.test(q);
    const intentFlags=q=>({
      leave:contains(q,'leave balance','leaves','leave','چھٹی','چھٹیاں','chutti','chuttiyan'),
      hours:contains(q,'worked hours','work hours','working hours','hour','hours','worked','work time','گھنٹ','کام کے اوقات','ghant','kitne hour','kitnay hour'),
      missing:contains(q,'missing punch','missing punches','punch missing','pa missing','present absent','مسنگ پنچ','پنچ مسنگ','پی اے')||/\bpa\b/.test(q),
      late:contains(q,'late in','lates','late','دیر','لیٹ','kitni late','kitnay late'),
      early:contains(q,'early out','early','جلدی','ارلی','jaldi out'),
      absent:contains(q,'absent','absence','غیر حاضر','ابسینٹ','ghair hazir'),
      payroll:contains(q,'my salary','my payroll','net salary','gross salary','deduction','deductions','salary kitni','میری تنخواہ','میرا پے رول','سیلری','کٹوتی','tankhwa'),
      attendance:contains(q,'attendance summary','my attendance','attendance','present','checked in','check in','حاضری','حاضر','hazri'),
      today:contains(q,'today','آج','aaj'),
      month:contains(q,'my month','monthly summary','month summary','میرا مہینہ','ماہانہ خلاصہ')
    });
    const genericPayroll=q=>contains(q,'how payroll','payroll calculated','calculate payroll','salary calculated','payroll formula','تنخواہ کیسے','پے رول کیسے','حساب کیسے','payroll kaise');
    const helpQ=q=>contains(q,'what can you do','help','how can you help','کیا کر سکتے','مدد','help me');
    const faq=q=>{
      if(greeting(q))return pair('Hello. Ask me about your worked hours, leave balance, missing punches, Late IN, today’s attendance, or your own payroll.','السلام علیکم۔ آپ مجھ سے اپنے کام کے اوقات، چھٹیوں کے بیلنس، مسنگ پنچ، لیٹ اِن، آج کی حاضری یا اپنے پے رول کے بارے میں پوچھ سکتے ہیں۔');
      if(helpQ(q))return pair('I can read your authorized PeopleOS records and answer attendance, worked-hours, leave, missing-punch and payroll questions. Supervisors can ask permitted team attendance questions.','میں آپ کے مجاز PeopleOS ریکارڈ سے حاضری، کام کے اوقات، چھٹی، مسنگ پنچ اور پے رول کے سوالات کا جواب دے سکتا ہوں۔ سپروائزر مجاز عملے کی حاضری بھی پوچھ سکتے ہیں۔');
      if(genericPayroll(q))return pair('Payroll is calculated by the PeopleOS payroll engine from the configured salary, calendar-day basis, attendance deductions, applicable late/absence policy, approved unpaid leave, fines/advances and other configured deductions or additions. I can also show your own live payroll breakdown when it is generated.','پے رول PeopleOS کے پے رول انجن میں کنفیگر شدہ تنخواہ، کیلنڈر دن، حاضری کی کٹوتیوں، لاگو تاخیر/غیر حاضری پالیسی، منظور شدہ بغیر تنخواہ چھٹی، جرمانوں/ایڈوانس اور دیگر کنفیگر شدہ اضافوں یا کٹوتیوں سے بنتا ہے۔ پے رول بن جانے پر میں آپ کی اپنی لائیو تفصیل بھی دکھا سکتا ہوں۔');
      if(contains(q,'camera','selfie','کیمرہ','سیلفی'))return pair('PeopleOS needs Camera permission for mobile attendance evidence. Open Android Settings → Apps → PeopleOS → Permissions and allow Camera.','موبائل حاضری کے ثبوت کے لیے PeopleOS کو کیمرہ اجازت درکار ہے۔ Android Settings → Apps → PeopleOS → Permissions میں Camera کی اجازت دیں۔');
      if(contains(q,'gps','location','لوکیشن','جی پی ایس'))return pair('GPS verifies that a mobile punch is made from an approved attendance location.','GPS تصدیق کرتا ہے کہ موبائل حاضری منظور شدہ مقام سے لگائی گئی ہے۔');
      if(contains(q,'what is missing punch','meaning of missing punch','مسنگ پنچ کیا'))return pair('Missing Punch means the processed attendance is incomplete because a required IN or OUT punch is missing. In PeopleOS, PA is used for the present-but-incomplete case when applicable.','مسنگ پنچ کا مطلب ہے کہ مطلوبہ اِن یا آؤٹ پنچ نہ ہونے کی وجہ سے حاضری نامکمل ہے۔ PeopleOS میں متعلقہ صورت میں PA حاضر مگر نامکمل ریکارڈ کے لیے استعمال ہوتا ہے۔');
      if(contains(q,'checked in','completed','complete attendance','چیک اِن','مکمل حاضری'))return pair('Checked In means an IN punch exists. Completed means both IN and OUT are recorded.','چیک اِن کا مطلب ہے اِن پنچ موجود ہے۔ مکمل کا مطلب ہے اِن اور آؤٹ دونوں ریکارڈ ہو چکے ہیں۔');
      if(contains(q,'late policy','3 late','three late','لیٹ پالیسی'))return pair('PeopleOS tracks Late IN separately. Any absence or payroll impact must come from the currently configured HR policy, not from the chatbot itself.','PeopleOS لیٹ اِن الگ شمار کرتا ہے۔ غیر حاضری یا پے رول پر اثر موجودہ HR پالیسی کے مطابق آتا ہے، چیٹ بوٹ خود کوئی کٹوتی طے نہیں کرتا۔');
      if(contains(q,'theme','dark mode','light mode','ivory','ڈارک','لائٹ'))return pair('Use Appearance in the top app bar to select Ivory, Light, or Dark.','اوپر Appearance سے آئیوری، لائٹ یا ڈارک منتخب کریں۔');
      return null;
    };

    const rosterHit=(q,r=[])=>{q=q.toLowerCase();for(const x of r){const c=String(x.employeeCode||'').toLowerCase(),n=String(x.name||'').toLowerCase();if(c&&new RegExp(`(^|\\s|#)${c}(\\s|$)`).test(q))return x;if(n.length>=4&&q.includes(n))return x;const p=n.split(/\s+/).filter(v=>v.length>=4);if(p.length&&p.filter(v=>q.includes(v)).length>=Math.min(2,p.length))return x}return null};
    const noIntent=()=>pair('I could not match that question to a PeopleOS record safely. Please ask specifically about worked hours, leave balance, missing punches/PA, Late IN, Early OUT, attendance status, or your payroll.','میں اس سوال کو محفوظ طریقے سے کسی PeopleOS ریکارڈ سے نہیں جوڑ سکا۔ براہِ کرم واضح طور پر کام کے اوقات، چھٹیوں کے بیلنس، مسنگ پنچ/PA، لیٹ اِن، ارلی آؤٹ، حاضری کی صورتحال یا اپنے پے رول کے بارے میں پوچھیں۔');

    const selfAnswer=(q,c)=>{const f=intentFlags(q),a=c.attendance||{},e=c.exceptions||{},m=c.period?.monthStart,t=c.today||{},parts=[];
      if(f.month)parts.push(pair(`Monthly summary for ${monthName(m,'en')}: Present records ${a.presentRecords||0}, Absent ${a.absentDays||0}, Late IN ${a.lateDays||0}, Early OUT ${a.earlyOutDays||0}, Missing punches ${a.missingPunches||0}, Worked ${hm(a.workedMinutes,'en')}.`,`${monthName(m,'ur')} کا خلاصہ: حاضری ریکارڈ ${a.presentRecords||0}، غیر حاضر ${a.absentDays||0}، لیٹ اِن ${a.lateDays||0}، ارلی آؤٹ ${a.earlyOutDays||0}، مسنگ پنچ ${a.missingPunches||0}، کام ${hm(a.workedMinutes,'ur')}۔`));
      if(f.hours)parts.push(pair(`Worked time in ${monthName(m,'en')}: ${hm(a.workedMinutes,'en')}.`,`آپ نے ${monthName(m,'ur')} میں ${hm(a.workedMinutes,'ur')} کام ریکارڈ کیا ہے۔`));
      if(f.leave){const b=c.leaveBalances||[];parts.push(b.length?pair(`Leave balance:\n${b.map(x=>`• ${x.name}: ${x.remaining} remaining (${x.used} used)`).join('\n')}\nPending requests: ${c.leaveRequests?.pending||0}.`,`چھٹیوں کا بیلنس:\n${b.map(x=>`• ${x.name}: ${x.remaining} باقی (${x.used} استعمال)`).join('\n')}\nزیرِ التوا درخواستیں: ${c.leaveRequests?.pending||0}۔`):pair(`No leave balance is configured for this year. Pending requests: ${c.leaveRequests?.pending||0}.`,`اس سال چھٹیوں کا بیلنس کنفیگر نہیں ہے۔ زیرِ التوا درخواستیں: ${c.leaveRequests?.pending||0}۔`))}
      if(f.missing)parts.push(a.missingPunches?pair(`You have ${a.missingPunches} processed missing-punch/PA record(s) in ${monthName(m,'en')}. Dates: ${listDates(e.missingPunchDates,'en')}.`,`آپ کے ${monthName(m,'ur')} میں ${a.missingPunches} مسنگ پنچ/PA ریکارڈ ہیں۔ تاریخیں: ${listDates(e.missingPunchDates,'ur')}۔`):pair(`You have no processed missing-punch/PA records in ${monthName(m,'en')} so far.`,`آپ کے ${monthName(m,'ur')} میں اب تک کوئی مسنگ پنچ/PA ریکارڈ نہیں ہے۔`));
      if(f.late)parts.push(a.lateDays?pair(`Late IN: ${a.lateDays} occurrence(s), ${a.lateMinutes||0} total minutes.`,`لیٹ اِن: ${a.lateDays} مرتبہ، کل ${a.lateMinutes||0} منٹ تاخیر۔`):pair('No Late IN occurrences are processed this month.','اس ماہ کوئی لیٹ اِن ریکارڈ نہیں ہے۔'));
      if(f.early)parts.push(a.earlyOutDays?pair(`Early OUT: ${a.earlyOutDays} occurrence(s), ${a.earlyMinutes||0} total minutes.`,`ارلی آؤٹ: ${a.earlyOutDays} مرتبہ، کل ${a.earlyMinutes||0} منٹ۔`):pair('No Early OUT occurrences are processed this month.','اس ماہ کوئی ارلی آؤٹ ریکارڈ نہیں ہے۔'));
      if(f.absent)parts.push(a.absentDays?pair(`Absent days in ${monthName(m,'en')}: ${a.absentDays}. Dates: ${listDates(e.absentDates,'en')}.`,`آپ کے ${monthName(m,'ur')} میں ${a.absentDays} غیر حاضر دن ہیں۔ تاریخیں: ${listDates(e.absentDates,'ur')}۔`):pair('No processed absent days are recorded this month.','اس ماہ کوئی پروسیس شدہ غیر حاضر دن نہیں ہے۔'));
      if(f.today||(f.attendance&&contains(q,'status'))){parts.push(pair(`Today: ${String(t.status||'no record').replaceAll('_',' ')}. IN ${timeFmt(t.firstIn,'en')}, OUT ${timeFmt(t.lastOut,'en')}.`,`آج کی حیثیت: ${String(t.status||'no_record').replaceAll('_',' ')}۔ اِن ${timeFmt(t.firstIn,'ur')}، آؤٹ ${timeFmt(t.lastOut,'ur')}۔`))}
      if(f.payroll){const p=c.payroll||{};parts.push(p.available?pair(`Your ${monthName(m,'en')} payroll (${p.status}): Basic ${money(p.basicSalary)}, Gross ${money(p.grossSalary)}, Absence deduction ${money(p.absenceDeduction)}, Late deduction ${money(p.lateDeduction)}, Other deductions ${money((p.otherDeductions||0)+(p.loanAdvanceDeduction||0)+(p.unpaidLeaveDeduction||0)+(p.statutoryDeduction||0))}, Net salary ${money(p.netSalary)}.`,`${monthName(m,'ur')} کا آپ کا پے رول (${p.status}): بنیادی تنخواہ ${money(p.basicSalary)}، مجموعی ${money(p.grossSalary)}، غیر حاضری کٹوتی ${money(p.absenceDeduction)}، تاخیر کٹوتی ${money(p.lateDeduction)}، دیگر کٹوتیاں ${money((p.otherDeductions||0)+(p.loanAdvanceDeduction||0)+(p.unpaidLeaveDeduction||0)+(p.statutoryDeduction||0))}، خالص تنخواہ ${money(p.netSalary)}۔`):pair('Your payroll has not been generated for this month yet.','اس ماہ آپ کا پے رول ابھی تیار نہیں ہوا۔'))}
      if(f.attendance&&!f.today&&!f.month)parts.push(pair(`Attendance in ${monthName(m,'en')}: Present records ${a.presentRecords||0}, Absent ${a.absentDays||0}, Late IN ${a.lateDays||0}, Missing punches ${a.missingPunches||0}.`,`حاضری ${monthName(m,'ur')}: حاضری ریکارڈ ${a.presentRecords||0}، غیر حاضر ${a.absentDays||0}، لیٹ اِن ${a.lateDays||0}، مسنگ پنچ ${a.missingPunches||0}۔`));
      if(!parts.length)return noIntent();
      return pair(parts.map(x=>x.en).join('\n\n'),parts.map(x=>x.ur).join('\n\n'));
    };

    const teamAnswer=(q,c)=>{const f=intentFlags(q),t=c.today||{},m=c.period?.monthStart;
      if(f.payroll)return pair('I cannot disclose another employee’s salary or payroll through PeopleOS AI.','میں PeopleOS AI کے ذریعے کسی دوسرے ملازم کی تنخواہ یا پے رول ظاہر نہیں کر سکتا۔');
      if(f.missing){const a=c.missingPunches||[];return a.length?pair(`Missing punches in ${monthName(m,'en')}:\n${a.slice(0,15).map(x=>`• ${x.name} (#${x.employeeCode}): ${x.count}`).join('\n')}`,`${monthName(m,'ur')} کے مسنگ پنچ:\n${a.slice(0,15).map(x=>`• ${x.name} (#${x.employeeCode}): ${x.count}`).join('\n')}`):pair('No missing punches are processed in your permitted scope this month.','آپ کے مجاز دائرہ کار میں اس ماہ کوئی مسنگ پنچ نہیں ہے۔')}
      if(f.late){const a=c.lateEmployees||[];return a.length?pair(`Late employees:\n${a.slice(0,15).map(x=>`• ${x.name} (#${x.employeeCode}): ${x.lateDays}`).join('\n')}`,`تاخیر والے ملازمین:\n${a.slice(0,15).map(x=>`• ${x.name} (#${x.employeeCode}): ${x.lateDays}`).join('\n')}`):pair('No Late IN records in your permitted scope this month.','آپ کے مجاز دائرہ کار میں اس ماہ کوئی لیٹ اِن ریکارڈ نہیں ہے۔')}
      if(f.absent){const a=c.absentToday||[];return a.length?pair(`Absent today (${a.length}):\n${a.slice(0,20).map(x=>`• ${x.name} (#${x.employeeCode})`).join('\n')}`,`آج غیر حاضر (${a.length}):\n${a.slice(0,20).map(x=>`• ${x.name} (#${x.employeeCode})`).join('\n')}`):pair('No one is marked Absent today in your permitted scope.','آپ کے مجاز دائرہ کار میں آج کوئی غیر حاضر نشان زد نہیں ہے۔')}
      if(f.today||f.attendance)return pair(`Today in your permitted scope: Active ${t.activeEmployees||0}, Checked in ${t.checkedIn||0}, Completed ${t.completed||0}, Absent ${t.absent||0}, Late ${t.late||0}, No record ${t.noRecord||0}.`,`آج آپ کے مجاز دائرہ کار میں: فعال ${t.activeEmployees||0}، چیک اِن ${t.checkedIn||0}، مکمل ${t.completed||0}، غیر حاضر ${t.absent||0}، تاخیر ${t.late||0}، بغیر ریکارڈ ${t.noRecord||0}۔`);
      return noIntent();
    };

    const employeeAnswer=(q,c)=>{const f=intentFlags(q),a=c.attendance||{},e=c.exceptions||{},x=c.employee||{},m=c.period?.monthStart;
      if(f.payroll)return pair(`I can show ${x.name}’s permitted attendance data, but not their salary or payroll.`,`میں ${x.name} کی مجاز حاضری دکھا سکتا ہوں، مگر ان کی تنخواہ یا پے رول نہیں۔`);
      if(f.hours)return pair(`${x.name} recorded ${hm(a.workedMinutes,'en')} in ${monthName(m,'en')}.`,`${x.name} نے ${monthName(m,'ur')} میں ${hm(a.workedMinutes,'ur')} ریکارڈ شدہ کام کیا ہے۔`);
      if(f.missing)return a.missingPunches?pair(`${x.name} has ${a.missingPunches} missing-punch/PA record(s). Dates: ${listDates(e.missingPunchDates,'en')}.`,`${x.name} کے ${a.missingPunches} مسنگ پنچ/PA ریکارڈ ہیں۔ تاریخیں: ${listDates(e.missingPunchDates,'ur')}۔`):pair(`${x.name} has no processed missing punches this month.`,`${x.name} کا اس ماہ کوئی مسنگ پنچ نہیں ہے۔`);
      if(f.late)return pair(`${x.name} has ${a.lateDays||0} Late IN occurrence(s) this month.`,`${x.name} کے اس ماہ ${a.lateDays||0} لیٹ اِن ہیں۔`);
      if(f.absent)return pair(`${x.name} has ${a.absentDays||0} processed absent day(s) this month.`,`${x.name} کے اس ماہ ${a.absentDays||0} پروسیس شدہ غیر حاضر دن ہیں۔`);
      if(f.attendance||f.month)return pair(`${x.name} (#${x.employeeCode}), ${monthName(m,'en')}: Present ${a.presentRecords||0}, Absent ${a.absentDays||0}, Late ${a.lateDays||0}, Early OUT ${a.earlyOutDays||0}, Missing ${a.missingPunches||0}, Worked ${hm(a.workedMinutes,'en')}.`,`${x.name} (#${x.employeeCode})، ${monthName(m,'ur')}: حاضری ${a.presentRecords||0}، غیر حاضر ${a.absentDays||0}، لیٹ ${a.lateDays||0}، ارلی آؤٹ ${a.earlyOutDays||0}، مسنگ ${a.missingPunches||0}، کام ${hm(a.workedMinutes,'ur')}۔`);
      return noIntent();
    };

    let btn,scrim,sheet,msgs,input,title,subtitle,chips;
    const add=(role,text,source)=>{const m=document.createElement('div');m.className='r18msg '+role;m.textContent=pick(text);if(source){const s=document.createElement('span');s.className='r18src';s.textContent=pick(source);m.appendChild(s)}msgs.appendChild(m);msgs.scrollTop=msgs.scrollHeight;return m};
    const sourceLine=c=>c?.period?pair(`Live PeopleOS records through ${dateFmt(c.period.asOf,'en')}`,`PeopleOS لائیو ریکارڈ تا ${dateFmt(c.period.asOf,'ur')}`):null;
    const renderStatic=()=>{if(!sheet)return;const u=lang()==='ur';title.textContent='PeopleOS AI';subtitle.textContent=u?'ذاتی HR معاون · لائیو ریکارڈ · محفوظ':'Personal HR assistant · Live records · Secure';input.placeholder=u?'حاضری، چھٹی، PA یا پے رول پوچھیں':'Ask about attendance, leave, PA or payroll';sheet.dir=u?'rtl':'ltr';const data=u?[['میرا مہینہ','my month'],['کام کے اوقات','worked hours'],['چھٹیاں','leave balance'],['مسنگ پنچ / PA','missing punches'],['آج کی ٹیم','team attendance today','sup']]:[['My month','my month'],['Worked hours','worked hours'],['Leave balance','leave balance'],['Missing / PA','missing punches'],['Team today','team attendance today','sup']];chips.innerHTML='';data.forEach(([lab,q,cl])=>{const b=document.createElement('button');b.type='button';b.className='r18chip '+(cl||'');b.textContent=lab;b.onclick=()=>ask(q,true);chips.appendChild(b)});syncRole()};
    const ask=async(q,chip=false)=>{q=(q||'').trim();if(!q||S.busy)return;const shown=chip?(lang()==='ur'?({'my month':'میرا ماہانہ خلاصہ','worked hours':'میرے کام کے اوقات کتنے ہیں؟','leave balance':'میری کتنی چھٹیاں باقی ہیں؟','missing punches':'کیا میرے مسنگ پنچ / PA ہیں؟','team attendance today':'آج میری ٹیم کی حاضری کیا ہے؟'}[q]||q):({'my month':'My month summary','worked hours':'How many hours have I worked this month?','leave balance':'What is my leave balance?','missing punches':'Do I have missing punches / PA this month?','team attendance today':'What is my team attendance today?'}[q]||q)):q;add('user',shown);S.busy=true;input.disabled=true;const w=add('bot',pair('Checking the matching live PeopleOS record…','متعلقہ PeopleOS لائیو ریکارڈ چیک کیا جا رہا ہے…'));w.classList.add('wait');try{const nq=norm(q),f=faq(nq);if(f){w.remove();add('bot',f);return}const flags=intentFlags(nq);if(!Object.values(flags).some(Boolean)&&!teamWords(nq)){w.remove();add('bot',noIntent());return}const m=monthKey(nq),me=await self(m);let out,src=sourceLine(me);if(sup(S.role)&&teamWords(nq)&&!mine(nq)){const tc=await team(m),hit=rosterHit(nq,tc.roster||[]);if(hit){const ec=await emp(hit.employeeCode,m);out=employeeAnswer(nq,ec);src=sourceLine(ec)}else{out=teamAnswer(nq,tc);src=sourceLine(tc)}}else out=selfAnswer(nq,me);w.remove();add('bot',out,src)}catch(e){w.remove();add('bot',e?.message==='SESSION'?pair('Your login session is still loading. Please try again in a moment.','آپ کا لاگ اِن سیشن ابھی لوڈ ہو رہا ہے۔ چند لمحوں بعد دوبارہ کوشش کریں۔'):pair(`I could not read PeopleOS data: ${e?.message||'Unknown error'}`,`PeopleOS کا ڈیٹا پڑھا نہیں جا سکا: ${e?.message||'نامعلوم خرابی'}`))}finally{S.busy=false;input.disabled=false}};

    const build=()=>{if(document.getElementById('pos-ai-r18')||!document.body)return;
      btn=document.createElement('button');btn.id='pos-ai-r18';btn.type='button';btn.setAttribute('aria-label','PeopleOS AI');btn.innerHTML='<span class="orb">AI</span>';
      scrim=document.createElement('div');scrim.id='pos-ai-r18-scrim';sheet=document.createElement('section');sheet.id='pos-ai-r18-sheet';sheet.innerHTML='<div class="r18h"><div class="r18logo">AI</div><div class="r18title"><strong></strong><span></span></div><button class="r18close" type="button">×</button></div><div class="r18chips"></div><div class="r18msgs"></div><form class="r18form"><textarea class="r18in" rows="1"></textarea><button class="r18send" type="submit">➜</button></form>';
      document.body.append(btn,scrim,sheet);msgs=sheet.querySelector('.r18msgs');input=sheet.querySelector('.r18in');title=sheet.querySelector('.r18title strong');subtitle=sheet.querySelector('.r18title span');chips=sheet.querySelector('.r18chips');
      const close=()=>{sheet.classList.remove('open');scrim.classList.remove('open')},open=()=>{sheet.classList.add('open');scrim.classList.add('open');setTimeout(()=>input.focus(),80)};btn.onclick=open;scrim.onclick=close;sheet.querySelector('.r18close').onclick=close;sheet.querySelector('.r18form').onsubmit=e=>{e.preventDefault();const q=input.value.trim();if(q){input.value='';ask(q)}};input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sheet.querySelector('.r18form').requestSubmit()}});renderStatic();add('bot',pair('Hi. I will answer only from the PeopleOS topic you ask about. I will not substitute an unrelated monthly summary if I do not understand the question.','السلام علیکم۔ میں صرف اسی PeopleOS موضوع کا جواب دوں گا جو آپ پوچھیں گے۔ اگر سوال سمجھ نہ آیا تو کوئی غیر متعلقہ ماہانہ خلاصہ نہیں دوں گا۔'));
    };

    const sync=()=>{
      const ok=rescueSignals();
      if(ok){
        ensureLanguageControl();
        build();
        if(btn)btn.style.removeProperty('display');
      }else if(btn){btn.style.display='none';sheet?.classList.remove('open');scrim?.classList.remove('open')}
      renderStatic();syncRole();
    };
    window.addEventListener('peopleos:language',()=>{renderStatic();ensureLanguageControl()});
    window.__peopleosR18Sync=sync;
    const observer=new MutationObserver(()=>sync());
    if(document.body)observer.observe(document.body,{subtree:true,childList:true});
    sync();let n=0;const warm=setInterval(()=>{sync();if(++n>40)clearInterval(warm)},250);
  }catch(e){console.warn('PeopleOS R18',e)}
})();