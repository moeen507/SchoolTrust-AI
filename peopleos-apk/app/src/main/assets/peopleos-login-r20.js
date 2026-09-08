(()=>{
  try{
    if(window.__peopleosR20LoginLoaded){window.__peopleosR20LoginSync?.();return;}
    window.__peopleosR20LoginLoaded=true;
    const d=document.documentElement,bridge=window.PeopleOSNative;
    const SUPA='https://xnduhrwozzqfxltbhjnj.supabase.co';
    const KEY='sb_publishable_IK5lGzRL54YSSjrWGGOn8g_Flup_ROt';
    let watcher=null,validationPromise=null,boundForm=null,readyNotified=false;

    const preconnect=()=>{
      if(document.querySelector('link[data-pos-preconnect]'))return;
      const l=document.createElement('link');l.rel='preconnect';l.href=SUPA;l.crossOrigin='anonymous';l.dataset.posPreconnect='1';(document.head||d).appendChild(l);
    };
    preconnect();

    const css=document.createElement('style');css.id='peopleos-login-r20-style';css.textContent=`
      html[data-pos-login-r20='yes'],html[data-pos-login-r20='yes'] body{width:100%!important;min-height:100%!important;overflow-x:hidden!important;overflow-y:auto!important;touch-action:pan-y!important;-webkit-overflow-scrolling:touch!important}
      html[data-pos-login-r20='yes'] #root{width:100%!important;min-width:0!important;height:auto!important;min-height:100dvh!important;max-height:none!important;overflow:visible!important;padding-top:0!important;touch-action:pan-y!important}
      html[data-pos-login-r20='yes'] #peopleos-native-appbar,html[data-pos-login-r20='yes'] #peopleos-native-dock,html[data-pos-login-r20='yes'] #peopleos-theme-sheet,html[data-pos-login-r20='yes'] #peopleos-lang-toggle,html[data-pos-login-r20='yes'] #peopleos-r18-lang,html[data-pos-login-r20='yes'] #pos-ai-r17,html[data-pos-login-r20='yes'] #pos-ai-r17-sheet,html[data-pos-login-r20='yes'] #pos-ai-r17-scrim,html[data-pos-login-r20='yes'] #pos-ai-r18,html[data-pos-login-r20='yes'] #pos-ai-r18-sheet,html[data-pos-login-r20='yes'] #pos-ai-r18-scrim{display:none!important;visibility:hidden!important;pointer-events:none!important}
      html[data-pos-login-r20='yes'] input:not([type='checkbox']):not([type='radio']):not([type='range']),html[data-pos-login-r20='yes'] textarea,html[data-pos-login-r20='yes'] select{background:#2d1720!important;background-color:#2d1720!important;color:#fff8f1!important;-webkit-text-fill-color:#fff8f1!important;caret-color:#f0cf72!important;border:1px solid rgba(236,205,126,.23)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.035)!important;outline:none!important;opacity:1!important}
      html[data-pos-login-r20='yes'] input::placeholder,html[data-pos-login-r20='yes'] textarea::placeholder{color:rgba(255,248,241,.43)!important;-webkit-text-fill-color:rgba(255,248,241,.43)!important;opacity:1!important}
      html[data-pos-login-r20='yes'] input:-webkit-autofill,html[data-pos-login-r20='yes'] input:-webkit-autofill:hover,html[data-pos-login-r20='yes'] input:-webkit-autofill:focus,html[data-pos-login-r20='yes'] input:-webkit-autofill:active{-webkit-text-fill-color:#fff8f1!important;caret-color:#f0cf72!important;-webkit-box-shadow:0 0 0 1000px #2d1720 inset!important;box-shadow:0 0 0 1000px #2d1720 inset!important;transition:background-color 99999s ease-out 0s!important}
      html[data-pos-login-r20='yes'] input:focus,html[data-pos-login-r20='yes'] textarea:focus{border-color:#e2c36d!important;box-shadow:0 0 0 3px rgba(226,195,109,.15)!important}
      html[data-pos-login-r20='yes'] input[type='email'],html[data-pos-login-r20='yes'] input[type='password']{font-size:16px!important;min-height:52px!important;line-height:1.25!important}
      html[data-pos-login-r20='yes'] form,html[data-pos-login-r20='yes'] form *{pointer-events:auto!important}
      html[data-pos-login-r20='yes'] button,html[data-pos-login-r20='yes'] a,html[data-pos-login-r20='yes'] input{touch-action:manipulation!important}
      html[data-pos-login-r20='yes'][data-pos-login-busy='yes'] button[type='submit']{opacity:.76!important;pointer-events:none!important;position:relative!important}
      #peopleos-login-lang-r20{display:none;position:fixed;z-index:2147483200;top:max(12px,calc(env(safe-area-inset-top) + 8px));right:12px;min-width:52px;height:36px;padding:0 11px;border-radius:12px;border:1px solid rgba(236,205,126,.28);background:rgba(36,17,24,.86);color:#f4d67f;font:800 11px/1 system-ui,sans-serif;box-shadow:0 8px 24px rgba(20,8,12,.22)}
      html[data-pos-login-r20='yes'] #peopleos-login-lang-r20{display:block}
      html[data-peopleos-language='ur'][data-pos-login-r20='yes'] body{direction:rtl;font-family:'Noto Sans Arabic','Noto Naskh Arabic','Segoe UI',Tahoma,sans-serif!important}
      html[data-peopleos-language='ur'][data-pos-login-r20='yes'] input[type='email'],html[data-peopleos-language='ur'][data-pos-login-r20='yes'] input[type='password']{direction:ltr;text-align:left}
      @media(max-width:380px){#peopleos-login-lang-r20{top:max(8px,calc(env(safe-area-inset-top) + 5px));right:8px;height:34px}}
    `;(document.head||d).appendChild(css);

    const authPath=()=>/\/(login|signin|sign-in|signup|sign-up|register|forgot-password|reset-password)(\/|$)/i.test(location.pathname||'');
    const loginForm=()=>{
      const pwd=document.querySelector('input[type="password"]');if(!pwd)return null;
      const form=pwd.closest('form');
      const email=document.querySelector('input[type="email"],input[name*="email" i],input[name*="user" i],input[autocomplete="username"]');
      if(form&&email)return form;
      const copy=(document.body?.innerText||'').slice(0,3500).toLowerCase();
      return /sign in|log in|login|welcome back|forgot password/.test(copy)?(form||pwd.closest('div')):null;
    };
    const isLogin=()=>authPath()||!!loginForm();

    const deep=v=>{if(!v)return null;if(typeof v==='string'){if(v.split('.').length===3&&v.length>60)return v;try{return deep(JSON.parse(v))}catch(_){return null}}if(Array.isArray(v)){for(const x of v){const t=deep(x);if(t)return t}}else if(typeof v==='object'){if(typeof v.access_token==='string')return v.access_token;if(v.session?.access_token)return v.session.access_token;for(const x of Object.values(v)){const t=deep(x);if(t)return t}}return null};
    const storeToken=s=>{try{let t=deep(s.getItem('sb-xnduhrwozzqfxltbhjnj-auth-token'));if(t)return t;for(let i=0;i<s.length;i++){const k=s.key(i)||'';if(/supabase|auth-token|session/i.test(k)){t=deep(s.getItem(k));if(t)return t}}}catch(_){}return null};
    const token=()=>storeToken(localStorage)||storeToken(sessionStorage);
    const jwtFresh=t=>{try{const p=t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');const j=JSON.parse(atob(p.padEnd(p.length+(4-p.length%4)%4,'=')));return !j.exp||j.exp*1000>Date.now()+10000}catch(_){return false}};
    const validate=()=>{
      const t=token();if(!t||!jwtFresh(t))return Promise.resolve(false);
      if(validationPromise)return validationPromise;
      validationPromise=fetch(`${SUPA}/auth/v1/user`,{headers:{apikey:KEY,Authorization:`Bearer ${t}`},cache:'no-store'}).then(r=>r.ok).catch(()=>false).finally(()=>{setTimeout(()=>validationPromise=null,700)});
      return validationPromise;
    };

    const lang=()=>{try{const x=bridge?.getSavedLanguage?.();if(x==='ur'||x==='en')return x}catch(_){}try{const x=localStorage.getItem('peopleos_language');if(x==='ur'||x==='en')return x}catch(_){}return'en'};
    const T={
      'Welcome Back':'خوش آمدید','Sign in to your secure workspace':'اپنے محفوظ ورک اسپیس میں سائن اِن کریں','Email address':'ای میل ایڈریس','Password':'پاس ورڈ','Remember me':'مجھے یاد رکھیں','Forgot Password?':'پاس ورڈ بھول گئے؟','Forgot password?':'پاس ورڈ بھول گئے؟','Sign In':'سائن اِن','Sign in':'سائن اِن','Register Yourself':'اپنا اکاؤنٹ رجسٹر کریں','Secure Human Capital Management':'محفوظ ہیومن کیپیٹل مینجمنٹ'
    };
    const localizeLogin=()=>{
      const ur=lang()==='ur';d.dataset.peopleosLanguage=ur?'ur':'en';d.lang=ur?'ur':'en';d.dir=ur?'rtl':'ltr';
      document.querySelectorAll('h1,h2,h3,label,button,a,p,span').forEach(el=>{
        if(el.closest('#peopleos-login-lang-r20'))return;
        const raw=(el.dataset.posR20En||el.textContent||'').trim();if(!raw)return;
        if(!el.dataset.posR20En&&T[raw])el.dataset.posR20En=raw;
        if(el.dataset.posR20En)el.textContent=ur?(T[el.dataset.posR20En]||el.dataset.posR20En):el.dataset.posR20En;
      });
      let b=document.getElementById('peopleos-login-lang-r20');if(!b){b=document.createElement('button');b.id='peopleos-login-lang-r20';b.type='button';document.body?.appendChild(b);b.onclick=()=>{const next=lang()==='ur'?'en':'ur';try{localStorage.setItem('peopleos_language',next)}catch(_){}try{bridge?.setAppLanguage?.(next)}catch(_){}localizeLogin()}};
      if(b)b.textContent=ur?'EN':'اردو';
    };

    const setBusy=busy=>{
      if(busy)d.dataset.posLoginBusy='yes';else delete d.dataset.posLoginBusy;
      const f=loginForm();const btn=f?.querySelector?.('button[type="submit"],input[type="submit"]');
      if(btn){if(!btn.dataset.posR20Label)btn.dataset.posR20Label=btn.textContent||btn.value||'Sign In';const txt=busy?(lang()==='ur'?'سائن اِن ہو رہا ہے…':'Signing in…'):btn.dataset.posR20Label;if(btn.tagName==='INPUT')btn.value=txt;else btn.textContent=txt;}
    };

    const finishAuth=async()=>{
      if(!isLogin())return;
      const ok=await validate();if(!ok)return;
      if(watcher){clearInterval(watcher);watcher=null;}
      try{window.dispatchEvent(new CustomEvent('peopleos:auth-confirmed'))}catch(_){}
      try{bridge?.authConfirmed?.()}catch(_){}
      location.replace('/?native=android&v=592r20&resume=1');
    };
    const watchForSession=()=>{
      if(watcher)clearInterval(watcher);
      const started=Date.now();
      watcher=setInterval(()=>{
        if(!isLogin()){clearInterval(watcher);watcher=null;return;}
        const t=token();
        if(t&&jwtFresh(t)){clearInterval(watcher);watcher=null;finishAuth();return;}
        if(Date.now()-started>8000){clearInterval(watcher);watcher=null;setBusy(false);}
      },120);
    };

    const bind=()=>{
      const f=loginForm();if(!f||f===boundForm)return;
      boundForm=f;
      const target=f.tagName==='FORM'?f:(f.closest?.('form')||f);
      target.addEventListener('submit',()=>{setBusy(true);watchForSession();},true);
      target.addEventListener('click',e=>{const b=e.target.closest?.('button[type="submit"],input[type="submit"]');if(!b)return;setBusy(true);watchForSession();},true);
    };

    const sync=()=>{
      const login=isLogin();d.dataset.posLoginR20=login?'yes':'no';
      if(login){d.dataset.nativeAuth='no';bind();localizeLogin();if(!readyNotified){readyNotified=true;try{bridge?.setContentReady?.(false)}catch(_){}}}
      else{document.getElementById('peopleos-login-lang-r20')?.remove();setBusy(false);try{window.__peopleosR15Sync?.()}catch(_){}}
    };
    window.__peopleosR20LoginSync=sync;
    window.addEventListener('pageshow',sync,{passive:true});window.addEventListener('popstate',sync,{passive:true});window.addEventListener('hashchange',sync,{passive:true});
    sync();
    let pass=0;const boot=setInterval(()=>{sync();if(++pass>=12)clearInterval(boot)},200);
    setTimeout(()=>{if(isLogin()&&token()&&jwtFresh(token()))finishAuth()},250);
  }catch(e){console.warn('PeopleOS R20 login',e)}
})();