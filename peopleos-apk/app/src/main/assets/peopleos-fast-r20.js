(()=>{
  try{
    if(window.__peopleosFastR20Loaded)return;window.__peopleosFastR20Loaded=true;
    const d=document.documentElement;
    let v=document.querySelector('meta[name="viewport"]');if(v)v.setAttribute('content','width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
    const pre=(rel,href)=>{if(document.querySelector(`link[rel="${rel}"][href="${href}"]`))return;const l=document.createElement('link');l.rel=rel;l.href=href;if(rel==='preconnect')l.crossOrigin='anonymous';(document.head||d).appendChild(l)};
    pre('preconnect','https://xnduhrwozzqfxltbhjnj.supabase.co');pre('dns-prefetch','https://xnduhrwozzqfxltbhjnj.supabase.co');
    const s=document.createElement('style');s.id='peopleos-fast-r20-style';s.textContent=`
      html[data-native-app='android'] #root{scroll-behavior:auto!important;scrollbar-width:thin!important}
      html[data-native-app='android'] button,html[data-native-app='android'] a,html[data-native-app='android'] [role='button']{touch-action:manipulation!important;-webkit-tap-highlight-color:transparent}
      html[data-native-app='android'] #peopleos-native-appbar,html[data-native-app='android'] #peopleos-native-dock,html[data-native-app='android'] #peopleos-theme-sheet{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;transform:translateZ(0)}
      html[data-native-theme='ivory'] #peopleos-native-appbar{background:rgba(248,244,237,.985)!important}
      html[data-native-theme='light'] #peopleos-native-appbar{background:rgba(255,255,255,.99)!important}
      html[data-native-theme='dark'] #peopleos-native-appbar{background:rgba(20,15,17,.99)!important}
      html[data-native-app='android'] #peopleos-native-dock{background:linear-gradient(155deg,#3a1c26,#171013)!important;box-shadow:0 12px 28px rgba(35,14,23,.28)!important}
      html[data-native-app='android'] #peopleos-native-appbar .icon,html[data-native-app='android'] #peopleos-native-dock .dockbtn,html[data-native-app='android'] #peopleos-theme-sheet button{transition:transform .11s ease,opacity .11s ease,background-color .11s ease,color .11s ease!important}
      html[data-native-app='android'] .attendance-mobile-card,html[data-native-app='android'] .employee-dashboard-v585>*,html[data-native-app='android'] .home-dashboard-v584>*{contain:layout style paint}
      html[data-native-app='android'] img{image-rendering:auto}
      html[data-native-app='android'] .animate-pulse{animation-duration:1.35s!important}
      @media(max-width:380px){html[data-native-auth='yes'] #root{padding-top:calc(58px + env(safe-area-inset-top))!important}#peopleos-native-appbar .bar{height:58px!important}#peopleos-native-dock{height:69px!important;border-radius:21px!important}#peopleos-native-dock .dockbtn{height:60px!important}}
      @media(prefers-reduced-motion:reduce){html[data-native-app='android'] *,html[data-native-app='android'] *::before,html[data-native-app='android'] *::after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}
    `;(document.head||d).appendChild(s);
    if(window.CSS?.supports?.('content-visibility','auto')){
      const c=document.createElement('style');c.id='peopleos-r20-content-visibility';c.textContent=`html[data-native-auth='yes'] .attendance-mobile-card{content-visibility:auto;contain-intrinsic-size:220px 1px}html[data-native-auth='yes'] .attendance-premium-page>section,html[data-native-auth='yes'] .employee-dashboard-v585>section{content-visibility:auto;contain-intrinsic-size:420px 1px}`;(document.head||d).appendChild(c);
    }
    const lazy=()=>document.querySelectorAll('img:not([loading])').forEach((img,i)=>{if(i>2)img.loading='lazy';img.decoding='async'});
    lazy();setTimeout(lazy,700);
    window.__peopleosFastR20Sync=lazy;
  }catch(e){console.warn('PeopleOS fast R20',e)}
})();