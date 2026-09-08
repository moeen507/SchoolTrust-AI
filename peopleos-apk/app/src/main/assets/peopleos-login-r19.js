(()=>{
  try{
    if(window.__peopleosR19LoginLoaded){window.__peopleosR19LoginSync?.();return}
    window.__peopleosR19LoginLoaded=true;
    const d=document.documentElement;
    const SUPA='https://xnduhrwozzqfxltbhjnj.supabase.co';
    const KEY='sb_publishable_IK5lGzRL54YSSjrWGGOn8g_Flup_ROt';
    let redirecting=false,lastSubmit=0;

    const css=document.createElement('style');
    css.id='peopleos-login-r19-style';
    css.textContent=`
      html[data-pos-login-r19='yes'],html[data-pos-login-r19='yes'] body{height:auto!important;min-height:100%!important;max-height:none!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior-y:auto!important;touch-action:pan-y!important}
      html[data-pos-login-r19='yes'] #root{width:100%!important;min-width:0!important;height:auto!important;min-height:100dvh!important;max-height:none!important;overflow:visible!important;padding-top:0!important;touch-action:pan-y!important;-webkit-overflow-scrolling:touch!important}
      html[data-pos-login-r19='yes'] #root>*{max-height:none!important}
      html[data-pos-login-r19='yes'] #peopleos-native-appbar,
      html[data-pos-login-r19='yes'] #peopleos-native-dock,
      html[data-pos-login-r19='yes'] #peopleos-theme-sheet,
      html[data-pos-login-r19='yes'] #peopleos-lang-toggle,
      html[data-pos-login-r19='yes'] #peopleos-r18-lang,
      html[data-pos-login-r19='yes'] #pos-ai-r17,
      html[data-pos-login-r19='yes'] #pos-ai-r17-sheet,
      html[data-pos-login-r19='yes'] #pos-ai-r17-scrim,
      html[data-pos-login-r19='yes'] #pos-ai-r18,
      html[data-pos-login-r19='yes'] #pos-ai-r18-sheet,
      html[data-pos-login-r19='yes'] #pos-ai-r18-scrim{display:none!important;visibility:hidden!important;pointer-events:none!important}
      html[data-pos-login-r19='yes'] input:not([type='checkbox']):not([type='radio']):not([type='range']),
      html[data-pos-login-r19='yes'] textarea,
      html[data-pos-login-r19='yes'] select{background:rgba(255,255,255,.055)!important;background-color:rgba(255,255,255,.055)!important;color:#fff7f0!important;-webkit-text-fill-color:#fff7f0!important;caret-color:#f2d37a!important;border-color:rgba(255,255,255,.14)!important;box-shadow:none!important;outline:none!important}
      html[data-pos-login-r19='yes'] input::placeholder,html[data-pos-login-r19='yes'] textarea::placeholder{color:rgba(255,255,255,.48)!important;-webkit-text-fill-color:rgba(255,255,255,.48)!important;opacity:1!important}
      html[data-pos-login-r19='yes'] input:-webkit-autofill,
      html[data-pos-login-r19='yes'] input:-webkit-autofill:hover,
      html[data-pos-login-r19='yes'] input:-webkit-autofill:focus,
      html[data-pos-login-r19='yes'] input:-webkit-autofill:active{-webkit-text-fill-color:#fff7f0!important;caret-color:#f2d37a!important;-webkit-box-shadow:0 0 0 1000px #32161f inset!important;box-shadow:0 0 0 1000px #32161f inset!important;transition:background-color 99999s ease-out 0s!important}
      html[data-pos-login-r19='yes'] input:focus,html[data-pos-login-r19='yes'] textarea:focus{border-color:#d8b75e!important;box-shadow:0 0 0 2px rgba(216,183,94,.18)!important}
      html[data-pos-login-r19='yes'] button[type='submit'],html[data-pos-login-r19='yes'] input[type='submit']{touch-action:manipulation!important;pointer-events:auto!important;-webkit-tap-highlight-color:transparent;position:relative!important;z-index:3!important}
      html[data-pos-login-r19='yes'] form,html[data-pos-login-r19='yes'] form *{pointer-events:auto}
      html[data-pos-login-r19='yes'] input,html[data-pos-login-r19='yes'] button,html[data-pos-login-r19='yes'] a{user-select:auto;-webkit-user-select:auto}
    `;
    (document.head||d).appendChild(css);

    const authPath=()=>/\/(login|signin|sign-in|signup|sign-up|register|forgot-password|reset-password)(\/|$)/i.test(location.pathname||'');
    const findLoginForm=()=>{
      const pwd=document.querySelector('input[type="password"]');
      if(!pwd)return null;
      const form=pwd.closest('form');
      const user=document.querySelector('input[type="email"],input[name*="email" i],input[name*="user" i],input[autocomplete="username"]');
      const copy=Array.from(document.querySelectorAll('h1,h2,h3,button,label,p')).slice(0,90).map(x=>(x.textContent||'').trim().toLowerCase()).join(' ');
      return (form||user||/\b(sign in|log in|login|forgot password|welcome back)\b/.test(copy))?(form||pwd.closest('div')):null;
    };
    const isLogin=()=>authPath()||!!findLoginForm();

    const deep=v=>{if(!v)return null;if(typeof v==='string'){if(v.split('.').length===3&&v.length>60)return v;try{return deep(JSON.parse(v))}catch(_){return null}}if(Array.isArray(v)){for(const x of v){const t=deep(x);if(t)return t}}else if(typeof v==='object'){if(typeof v.access_token==='string')return v.access_token;if(v.session?.access_token)return v.session.access_token;for(const x of Object.values(v)){const t=deep(x);if(t)return t}}return null};
    const storeToken=s=>{try{let t=deep(s.getItem('sb-xnduhrwozzqfxltbhjnj-auth-token'));if(t)return t;for(let i=0;i<s.length;i++){const k=s.key(i)||'';if(/supabase|auth-token|session/i.test(k)){t=deep(s.getItem(k));if(t)return t}}}catch(_){}return null};
    const token=()=>storeToken(localStorage)||storeToken(sessionStorage);
    const jwtFresh=t=>{try{const p=t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');const j=JSON.parse(atob(p.padEnd(p.length+(4-p.length%4)%4,'=')));return !j.exp||j.exp*1000>Date.now()+15000}catch(_){return false}};
    const validSession=async()=>{const t=token();if(!t||!jwtFresh(t))return false;try{const r=await fetch(`${SUPA}/auth/v1/user`,{headers:{apikey:KEY,Authorization:`Bearer ${t}`},cache:'no-store'});return r.ok}catch(_){return false}};

    const recoverAfterSubmit=async()=>{
      if(redirecting||!isLogin())return;
      if(!(await validSession()))return;
      redirecting=true;
      location.replace('/?native=android&v=592r19&resume=1');
    };

    const bindForm=()=>{
      const holder=findLoginForm();
      if(!holder)return;
      const form=holder.tagName==='FORM'?holder:holder.closest?.('form');
      const listen=form||holder;
      if(listen.dataset.peopleosR19Bound==='1')return;
      listen.dataset.peopleosR19Bound='1';
      listen.addEventListener('submit',()=>{
        lastSubmit=Date.now();
        [700,1500,2800,4500].forEach(ms=>setTimeout(recoverAfterSubmit,ms));
      },true);
      listen.addEventListener('click',e=>{
        const b=e.target.closest?.('button[type="submit"],button,input[type="submit"]');
        if(!b)return;
        const txt=(b.textContent||b.value||b.getAttribute('aria-label')||'').toLowerCase();
        if(/sign in|log in|login|سائن اِن|لاگ اِن/.test(txt)){
          lastSubmit=Date.now();
          [850,1900,3500,5200].forEach(ms=>setTimeout(recoverAfterSubmit,ms));
        }
      },true);
    };

    const sync=()=>{
      const login=isLogin();
      d.dataset.posLoginR19=login?'yes':'no';
      if(login){
        d.dataset.nativeAuth='no';
        bindForm();
        document.getElementById('peopleos-theme-sheet')?.classList.remove('open');
        document.getElementById('pos-ai-r18-sheet')?.classList.remove('open');
        document.getElementById('pos-ai-r18-scrim')?.classList.remove('open');
      }else{
        try{window.__peopleosR15Sync?.()}catch(_){}
        try{window.__peopleosR17LocaleSync?.()}catch(_){}
        try{window.__peopleosR18Sync?.()}catch(_){}
      }
    };
    window.__peopleosR19LoginSync=sync;
    document.addEventListener('submit',e=>{if(e.target?.querySelector?.('input[type="password"]')){lastSubmit=Date.now();setTimeout(recoverAfterSubmit,900)}},true);
    window.addEventListener('pageshow',sync,{passive:true});
    window.addEventListener('popstate',sync,{passive:true});
    window.addEventListener('hashchange',sync,{passive:true});
    const obs=new MutationObserver(()=>sync());
    if(document.body)obs.observe(document.body,{childList:true,subtree:true});
    sync();
    let n=0;const warm=setInterval(()=>{sync();if(lastSubmit&&Date.now()-lastSubmit<7000)recoverAfterSubmit();if(++n>=40)clearInterval(warm)},250);
  }catch(e){console.warn('PeopleOS R19 login safety',e)}
})();
