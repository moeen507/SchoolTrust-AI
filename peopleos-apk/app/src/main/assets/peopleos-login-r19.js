(()=>{
  try{
    if(window.__peopleosLoginR19Loaded){window.__peopleosLoginR19Sync?.();return;}
    window.__peopleosLoginR19Loaded=true;
    const d=document.documentElement;
    let formBusy=false;

    const isLogin=()=>{
      if(/\/(login|signin|sign-in)(\/|$)/i.test(location.pathname))return true;
      const pwd=document.querySelector('input[type="password"]');
      if(!pwd)return false;
      const email=document.querySelector('input[type="email"],input[name*="email" i],input[autocomplete="username"]');
      const submit=document.querySelector('button[type="submit"],input[type="submit"]');
      const txt=(document.body?.innerText||'').slice(0,5000).toLowerCase();
      return !!(email&&submit&&/(sign in|log in|login|welcome back)/.test(txt));
    };

    const ensureCss=()=>{
      if(document.getElementById('peopleos-login-r19-style'))return;
      const s=document.createElement('style');s.id='peopleos-login-r19-style';s.textContent=`
        html[data-native-login='yes'] #peopleos-native-appbar,
        html[data-native-login='yes'] #peopleos-native-dock,
        html[data-native-login='yes'] #peopleos-theme-sheet,
        html[data-native-login='yes'] #peopleos-lang-toggle,
        html[data-native-login='yes'] #pos-ai-r17,
        html[data-native-login='yes'] #pos-ai-r17-sheet,
        html[data-native-login='yes'] #pos-ai-r17-scrim{display:none!important}
        html[data-native-login='yes'] #root{padding-top:0!important;overflow-y:auto!important;overflow-x:hidden!important;height:100dvh!important;max-height:100dvh!important;touch-action:pan-y!important;-webkit-overflow-scrolling:touch!important}
        html[data-native-login='yes'] body{overflow:hidden!important;background:#160d11!important;color:#fff!important}
        html[data-native-login='yes'] input:not([type='checkbox']):not([type='radio']),
        html[data-native-login='yes'] textarea,
        html[data-native-login='yes'] select{
          background:#2a151c!important;
          background-color:#2a151c!important;
          color:#fff!important;
          -webkit-text-fill-color:#fff!important;
          caret-color:#f1ce78!important;
          border-color:rgba(232,202,128,.34)!important;
          box-shadow:none!important;
          outline:none!important;
        }
        html[data-native-login='yes'] input::placeholder,html[data-native-login='yes'] textarea::placeholder{color:rgba(255,255,255,.42)!important;-webkit-text-fill-color:rgba(255,255,255,.42)!important}
        html[data-native-login='yes'] input:-webkit-autofill,
        html[data-native-login='yes'] input:-webkit-autofill:hover,
        html[data-native-login='yes'] input:-webkit-autofill:focus,
        html[data-native-login='yes'] textarea:-webkit-autofill,
        html[data-native-login='yes'] select:-webkit-autofill{
          -webkit-text-fill-color:#fff!important;
          caret-color:#f1ce78!important;
          -webkit-box-shadow:0 0 0 1000px #2a151c inset!important;
          box-shadow:0 0 0 1000px #2a151c inset!important;
          transition:background-color 9999s ease-out 0s!important;
        }
        html[data-native-login='yes'] input[type='email'],html[data-native-login='yes'] input[type='password']{font-size:16px!important;min-height:52px!important}
        html[data-native-login='yes'] button[type='submit'],html[data-native-login='yes'] input[type='submit']{touch-action:manipulation!important;pointer-events:auto!important;position:relative!important;z-index:2!important}
        html[data-native-login='yes'][data-login-busy='yes'] button[type='submit']{opacity:.72!important}
        html[data-native-login='yes'] form{pointer-events:auto!important}
        @media(max-width:420px){html[data-native-login='yes'] input[type='email'],html[data-native-login='yes'] input[type='password']{min-height:50px!important}}
      `;document.head.appendChild(s);
    };

    const bindForm=()=>{
      if(!isLogin())return;
      const form=document.querySelector('form');
      if(!form||form.dataset.peopleosR19Bound==='1')return;
      form.dataset.peopleosR19Bound='1';
      form.addEventListener('submit',()=>{
        formBusy=true;d.dataset.loginBusy='yes';
        setTimeout(()=>{formBusy=false;delete d.dataset.loginBusy;sync();},9000);
      },{capture:false});
    };

    const sync=()=>{
      ensureCss();
      const login=isLogin();
      d.dataset.nativeLogin=login?'yes':'no';
      if(login){
        d.dataset.nativeAuth='no';
        document.body?.classList.add('peopleos-native-login-r19');
        bindForm();
      }else{
        document.body?.classList.remove('peopleos-native-login-r19');
        if(!formBusy)delete d.dataset.loginBusy;
      }
    };

    window.__peopleosLoginR19Sync=sync;
    document.addEventListener('focusin',e=>{if(e.target?.matches?.('input,textarea,select'))sync();},{passive:true});
    window.addEventListener('pageshow',sync,{passive:true});
    window.addEventListener('popstate',sync,{passive:true});
    window.addEventListener('hashchange',sync,{passive:true});
    const obs=new MutationObserver(()=>sync());
    if(document.body)obs.observe(document.body,{childList:true,subtree:true});
    sync();setTimeout(sync,300);setTimeout(sync,1000);setTimeout(sync,2500);
  }catch(e){console.warn('PeopleOS login R19',e)}
})();
