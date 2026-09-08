(() => {
  try {
    if (window.__peopleosR15Loaded) {
      if (typeof window.__peopleosR15Sync === 'function') window.__peopleosR15Sync();
      return;
    }
    window.__peopleosR15Loaded = true;

    const d = document.documentElement;
    const bridge = window.PeopleOSNative;
    d.dataset.nativeApp = 'android';
    d.dataset.nativeUi = 'r15';
    d.dataset.nativeAuth = 'pending';
    if (document.body) document.body.classList.add('peopleos-native-android','peopleos-native-r15');

    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      (document.head || d).appendChild(viewport);
    }
    viewport.setAttribute('content','width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');

    const css = `
      *,*::before,*::after{box-sizing:border-box}
      html[data-native-app='android']{width:100%!important;height:100%!important;max-width:100%!important;overflow:hidden!important}
      html[data-native-app='android'] body{width:100%!important;height:100dvh!important;min-height:100dvh!important;max-width:100%!important;margin:0!important;overflow:hidden!important;position:static!important;-webkit-tap-highlight-color:transparent}
      html[data-native-app='android'] #root{
        width:100%!important;max-width:100%!important;min-width:0!important;height:100dvh!important;min-height:0!important;max-height:100dvh!important;
        overflow-y:scroll!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-y:contain!important;touch-action:pan-y!important;
        scroll-behavior:smooth!important;position:relative!important
      }
      html[data-native-app='android'] #root>*{min-width:0!important;max-width:100%!important;height:auto!important;max-height:none!important}
      html[data-native-app='android'] #root>[class*='h-screen'],html[data-native-app='android'] #root>[class*='min-h-screen']{height:auto!important;min-height:100%!important;max-height:none!important;overflow:visible!important}
      html[data-native-app='android'] main,html[data-native-app='android'] main>*{width:100%!important;max-width:100%!important;min-width:0!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;touch-action:pan-y!important}
      html[data-native-app='android'] main .page-container{width:100%!important;max-width:100%!important;min-width:0!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;margin:0 auto!important;padding:14px clamp(10px,3.4vw,18px) max(116px,calc(env(safe-area-inset-bottom) + 102px))!important}
      html[data-native-app='android'] .employee-dashboard-v585,
      html[data-native-app='android'] .home-dashboard-v584,
      html[data-native-app='android'] .attendance-premium-page,
      html[data-native-app='android'] .mobile-attendance-page{width:100%!important;max-width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;touch-action:pan-y!important}
      html[data-native-app='android'] img,html[data-native-app='android'] video,html[data-native-app='android'] canvas,html[data-native-app='android'] svg{max-width:100%}
      html[data-native-app='android'] .overflow-x-auto,
      html[data-native-app='android'] .premium-month-scroll,
      html[data-native-app='android'] .home-trend-summary-v584,
      html[data-native-app='android'] .home-bars-scroll-v584,
      html[data-native-app='android'] .emp-desktop-table,
      html[data-native-app='android'] .cr-audit-table-wrap,
      html[data-native-app='android'] .mobile-audit-table,
      html[data-native-app='android'] .loan-table{max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-x:contain!important;touch-action:pan-x pan-y!important}
      html[data-native-app='android'] .overflow-y-auto,
      html[data-native-app='android'] .emp-modal-body,
      html[data-native-app='android'] .cr-face-list,
      html[data-native-app='android'] .mobile-camera-dialog,
      html[data-native-app='android'] .loan-dialog{overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important;touch-action:pan-y!important}

      html[data-native-ui='r15']{--n-maroon:#8f173f;--n-maroon2:#65112e;--n-gold:#ddbd67;--n-radius:20px;--n-shadow:0 12px 30px rgba(55,25,35,.09)}
      html[data-native-theme='ivory']{color-scheme:light;--background:38 34% 96%!important;--foreground:330 16% 14%!important;--card:38 40% 99%!important;--card-foreground:330 16% 14%!important;--popover:38 40% 99%!important;--popover-foreground:330 16% 14%!important;--muted:36 24% 91%!important;--muted-foreground:330 7% 43%!important;--border:34 16% 81%!important;--input:34 16% 81%!important;--primary:340 72% 32%!important;--primary-foreground:42 100% 96%!important;--accent:43 58% 62%!important}
      html[data-native-theme='light']{color-scheme:light;--background:0 0% 100%!important;--foreground:330 13% 12%!important;--card:0 0% 100%!important;--card-foreground:330 13% 12%!important;--popover:0 0% 100%!important;--popover-foreground:330 13% 12%!important;--muted:330 8% 95%!important;--muted-foreground:330 6% 42%!important;--border:330 6% 86%!important;--input:330 6% 86%!important;--primary:340 72% 32%!important;--primary-foreground:42 100% 96%!important;--accent:43 58% 62%!important}
      html[data-native-theme='dark']{color-scheme:dark;--background:330 14% 8%!important;--foreground:330 15% 94%!important;--card:330 12% 11%!important;--card-foreground:330 15% 94%!important;--popover:330 12% 11%!important;--popover-foreground:330 15% 94%!important;--muted:330 10% 16%!important;--muted-foreground:330 7% 68%!important;--border:330 8% 23%!important;--input:330 8% 23%!important;--primary:340 67% 42%!important;--primary-foreground:42 100% 96%!important;--accent:43 58% 62%!important}

      html[data-native-theme] body,
      html[data-native-theme] #root,
      html[data-native-theme] main,
      html[data-native-theme] .page-container{background-color:hsl(var(--background))!important;color:hsl(var(--foreground))!important}
      html[data-native-theme] .bg-background{background-color:hsl(var(--background))!important}
      html[data-native-theme] .bg-card{background-color:hsl(var(--card))!important}
      html[data-native-theme] .bg-popover{background-color:hsl(var(--popover))!important}
      html[data-native-theme] .bg-muted{background-color:hsl(var(--muted))!important}
      html[data-native-theme] .text-foreground,html[data-native-theme] .text-card-foreground,html[data-native-theme] .text-popover-foreground{color:hsl(var(--foreground))!important}
      html[data-native-theme] .text-muted-foreground{color:hsl(var(--muted-foreground))!important}
      html[data-native-theme] .border-border,html[data-native-theme] .border-input{border-color:hsl(var(--border))!important}
      html[data-native-theme='dark'] .bg-white{background-color:hsl(var(--card))!important}
      html[data-native-theme='dark'] .text-black,
      html[data-native-theme='dark'] .text-gray-900,
      html[data-native-theme='dark'] .text-slate-900,
      html[data-native-theme='dark'] .text-zinc-900{color:hsl(var(--foreground))!important}
      html[data-native-theme='dark'] .text-gray-500,
      html[data-native-theme='dark'] .text-gray-600,
      html[data-native-theme='dark'] .text-slate-500,
      html[data-native-theme='dark'] .text-slate-600{color:hsl(var(--muted-foreground))!important}
      html[data-native-theme='dark'] input:not([type='checkbox']):not([type='radio']),
      html[data-native-theme='dark'] select,
      html[data-native-theme='dark'] textarea{background:hsl(var(--card))!important;color:hsl(var(--foreground))!important;border-color:hsl(var(--border))!important}
      html[data-native-theme='light'] input:not([type='checkbox']):not([type='radio']),
      html[data-native-theme='light'] select,
      html[data-native-theme='light'] textarea{background:#fff!important;color:#21191d!important}
      html[data-native-theme='ivory'] input:not([type='checkbox']):not([type='radio']),
      html[data-native-theme='ivory'] select,
      html[data-native-theme='ivory'] textarea{background:#fffdf9!important;color:#2c2025!important}

      html[data-native-ui='r15'] h1{font-size:clamp(1.7rem,7vw,2.25rem)!important;line-height:1.07!important;letter-spacing:-.04em!important;overflow-wrap:anywhere}
      html[data-native-ui='r15'] input,html[data-native-ui='r15'] select,html[data-native-ui='r15'] textarea{font-size:16px!important}
      html[data-native-ui='r15'] .peopleos-mobile-dock{display:none!important}
      html[data-native-auth='yes'] header.sticky{display:none!important}
      html[data-native-auth='yes'] #root{padding-top:calc(60px + env(safe-area-inset-top))!important}
      html[data-native-auth='no'] #root,html[data-native-auth='pending'] #root{padding-top:0!important}
      html[data-native-ui='r15'] .attendance-premium-page .grid.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:clamp(9px,2.8vw,14px)!important}
      html[data-native-ui='r15'] .attendance-mobile-card{width:100%!important;max-width:100%!important;margin-bottom:0!important;padding:clamp(13px,3.6vw,18px)!important;border-radius:18px!important;box-shadow:var(--n-shadow)!important}
      html[data-native-ui='r15'] button,html[data-native-ui='r15'] [role='button'],html[data-native-ui='r15'] a{max-width:100%}

      #peopleos-native-appbar,#peopleos-native-dock,#peopleos-theme-sheet{font-family:inherit}
      #peopleos-native-appbar{display:none;position:fixed;z-index:2147483000;top:0;left:0;right:0;padding-top:env(safe-area-inset-top);background:rgba(248,244,237,.94);border-bottom:1px solid rgba(98,73,82,.12);backdrop-filter:blur(18px) saturate(1.15);-webkit-backdrop-filter:blur(18px) saturate(1.15);box-shadow:0 5px 20px rgba(50,24,34,.06)}
      html[data-native-auth='yes'] #peopleos-native-appbar{display:block}
      #peopleos-native-appbar .bar{height:60px;display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:8px;padding:7px clamp(9px,3vw,16px);max-width:760px;margin:0 auto}
      #peopleos-native-appbar .icon{width:42px;height:42px;min-width:42px;border:1px solid rgba(92,66,75,.13);border-radius:14px;background:rgba(255,255,255,.58);color:#302329;display:grid;place-items:center;padding:0;box-shadow:0 3px 12px rgba(40,20,28,.04)}
      #peopleos-native-appbar .icon:active{transform:scale(.96)}
      #peopleos-native-appbar svg{width:21px;height:21px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
      #peopleos-native-appbar .titlewrap{min-width:0}
      #peopleos-native-appbar .eyebrow{display:block;font-size:9px;line-height:1;font-weight:800;letter-spacing:.15em;color:var(--n-maroon);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #peopleos-native-appbar .title{display:block;margin-top:4px;font-size:16.5px;line-height:1.05;font-weight:820;color:#2b2024;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #peopleos-native-appbar .actions{display:flex;gap:6px}

      #peopleos-native-dock{display:none;position:fixed;z-index:2147483000;left:50%;transform:translateX(-50%);bottom:max(7px,env(safe-area-inset-bottom));width:min(calc(100vw - 14px),540px);height:74px;padding:5px;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px;border-radius:24px;border:1px solid rgba(223,190,102,.25);background:linear-gradient(155deg,rgba(57,27,37,.985),rgba(22,15,18,.995));box-shadow:0 18px 40px rgba(44,18,29,.31),inset 0 1px 0 rgba(255,255,255,.07);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
      html[data-native-auth='yes'] #peopleos-native-dock{display:grid}
      #peopleos-native-dock .dockbtn{appearance:none;border:1px solid transparent;background:transparent;color:rgba(255,255,255,.58);min-width:0;width:100%;height:64px;border-radius:17px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:4px 2px;overflow:hidden}
      #peopleos-native-dock .dockbtn:active{transform:scale(.97)}
      #peopleos-native-dock .dockbtn svg{width:23px;height:23px;stroke:currentColor;fill:none;stroke-width:1.85;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}
      #peopleos-native-dock .docklabel{display:block;width:100%;font-size:clamp(8.8px,2.45vw,10.6px);line-height:1;font-weight:720;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
      #peopleos-native-dock .dockbtn.active{color:#fff9eb;background:linear-gradient(155deg,#a61d48,#771332);border-color:rgba(232,198,112,.34);box-shadow:0 8px 20px rgba(105,13,43,.38),inset 0 1px 0 rgba(255,231,166,.18)}
      #peopleos-native-dock .dockbtn.active::after{content:'';width:22px;height:3px;border-radius:99px;background:#e5c76f;margin-top:-1px;box-shadow:0 0 9px rgba(230,199,110,.34)}
      #peopleos-native-dock.busy .dockbtn:not(.active){opacity:.55}

      #peopleos-theme-sheet{position:fixed;z-index:2147483001;top:calc(58px + env(safe-area-inset-top));right:10px;width:min(260px,calc(100vw - 20px));padding:10px;border-radius:18px;border:1px solid rgba(98,73,82,.14);background:rgba(252,249,244,.98);box-shadow:0 18px 44px rgba(45,20,29,.2);display:none}
      html[data-native-auth='yes'] #peopleos-theme-sheet.open{display:block}
      #peopleos-theme-sheet .sheettitle{font-size:12px;font-weight:800;color:#4a373e;padding:3px 4px 8px}
      #peopleos-theme-sheet .themes{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
      #peopleos-theme-sheet button{min-height:44px;border-radius:13px;border:1px solid rgba(98,73,82,.13);background:#fff;color:#3b2c32;font-size:11px;font-weight:760;padding:7px 4px}
      #peopleos-theme-sheet button.active{background:linear-gradient(155deg,#9f1b45,#741330);color:#fff8e8;border-color:rgba(218,184,96,.42)}

      html[data-native-theme='dark'] #peopleos-native-appbar{background:rgba(20,15,17,.96);border-bottom-color:rgba(255,255,255,.08)}
      html[data-native-theme='dark'] #peopleos-native-appbar .icon{background:rgba(255,255,255,.055);border-color:rgba(255,255,255,.09);color:#f4ecef}
      html[data-native-theme='dark'] #peopleos-native-appbar .title{color:#f7eff1}
      html[data-native-theme='dark'] #peopleos-native-appbar .eyebrow{color:#e5c875}
      html[data-native-theme='dark'] #peopleos-theme-sheet{background:rgba(28,21,24,.99);border-color:rgba(255,255,255,.08)}
      html[data-native-theme='dark'] #peopleos-theme-sheet .sheettitle{color:#f4ecef}
      html[data-native-theme='dark'] #peopleos-theme-sheet button{background:rgba(255,255,255,.055);color:#f2e9ec;border-color:rgba(255,255,255,.08)}
      html[data-native-theme='light'] #peopleos-native-appbar{background:rgba(255,255,255,.95)}

      @media(max-width:390px){#peopleos-native-appbar .bar{grid-template-columns:40px minmax(0,1fr) auto;gap:6px;padding-left:7px;padding-right:7px}#peopleos-native-appbar .icon{width:40px;height:40px;min-width:40px}#peopleos-native-appbar .title{font-size:15.5px}#peopleos-native-dock{width:calc(100vw - 10px);height:72px;padding:4px;border-radius:22px}#peopleos-native-dock .dockbtn{height:63px;border-radius:16px}#peopleos-native-dock .dockbtn svg{width:22px;height:22px}}
      @media(max-width:340px){html[data-native-ui='r15'] .attendance-premium-page .grid.grid-cols-2{grid-template-columns:1fr!important}#peopleos-native-appbar .notify{display:none!important}}
      @media(min-width:901px){#peopleos-native-appbar,#peopleos-native-dock,#peopleos-theme-sheet{display:none!important}html[data-native-auth='yes'] header.sticky{display:flex!important}html[data-native-ui='r15'] #root{padding-top:0!important}}
    `;

    const style = document.createElement('style');
    style.id = 'peopleos-native-r15-style';
    style.textContent = css;
    (document.head || d).appendChild(style);

    const icons = {
      menu:`<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></svg>`,
      theme:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
      bell:`<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`,
      home:`<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6"/></svg>`,
      punch:`<svg viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M9.5 5.5h5M10 18h4"/></svg>`,
      attendance:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>`,
      payroll:`<svg viewBox="0 0 24 24"><path d="M4 6.5h16v12H4z"/><path d="M4 9.5h16M8 15h3"/></svg>`,
      profile:`<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>`
    };

    const routes = {
      home:{label:'Home',fallback:'/',terms:['dashboard','home'],icon:icons.home},
      punch:{label:'Punch',fallback:'/mobile-attendance',terms:['mobile-attendance','mobile attendance','punch'],icon:icons.punch},
      attendance:{label:'Attendance',fallback:'/attendance',terms:['attendance'],icon:icons.attendance},
      payroll:{label:'Payroll',fallback:'/payroll',terms:['payroll'],icon:icons.payroll},
      profile:{label:'Profile',fallback:'/profile',terms:['profile'],icon:icons.profile}
    };

    const authPath = () => /\/(login|signin|sign-in|signup|sign-up|register|forgot-password|reset-password)(\/|$)/i.test(location.pathname);
    const loginUiPresent = () => {
      const pwd = document.querySelector('input[type="password"]');
      if (!pwd) return false;
      const user = document.querySelector('input[type="email"],input[name*="email" i],input[name*="user" i],input[autocomplete="username"]');
      const copy = Array.from(document.querySelectorAll('h1,h2,h3,button,label,p')).slice(0,80).map(el => (el.textContent||'').trim().toLowerCase()).join(' ');
      return !!user || /\b(sign in|log in|login|forgot password|welcome back)\b/.test(copy);
    };
    const appSignalCount = () => {
      const selectors = [
        '.home-dashboard-v584','.employee-dashboard-v585','.attendance-premium-page','.mobile-attendance-page',
        'a[href*="/attendance"]','a[href*="/payroll"]','a[href*="/profile"]','header.sticky','nav'
      ];
      return selectors.reduce((n,s) => n + (document.querySelector(s) ? 1 : 0),0);
    };
    const authState = () => {
      if (authPath()) return 'login';
      const login = loginUiPresent();
      const signals = appSignalCount();
      if (signals >= 2 && !login) return 'app';
      if (login && signals < 2) return 'login';
      return 'pending';
    };

    const pageMeta = () => {
      const p = location.pathname.toLowerCase();
      if (p.includes('mobile-attendance')) return ['MOBILE ATTENDANCE','Punch attendance'];
      if (p.includes('attendance')) return ['ATTENDANCE','Attendance register'];
      if (p.includes('payroll')) return ['PAYROLL','Payroll'];
      if (p.includes('profile')) return ['PROFILE','My profile'];
      return ['PEOPLE OS','Dashboard'];
    };

    const controlText = el => `${el.getAttribute('aria-label')||''} ${el.getAttribute('title')||''} ${el.textContent||''}`.toLowerCase();
    const originalControls = () => Array.from(document.querySelectorAll('header button,header [role="button"],nav button')).filter(el => !el.closest('#peopleos-native-appbar') && !el.closest('#peopleos-native-dock'));
    const clickOriginalControl = (words,fallbackIndex=-1) => {
      const controls = originalControls();
      const hit = controls.find(el => words.some(w => controlText(el).includes(w)));
      const target = hit || (fallbackIndex >= 0 ? controls[fallbackIndex] : null);
      if (!target) return false;
      try { target.click(); return true; } catch (_) { return false; }
    };

    const savedTheme = () => {
      try {
        if (bridge && typeof bridge.getSavedTheme === 'function') {
          const native = String(bridge.getSavedTheme() || '').toLowerCase();
          if (['ivory','light','dark'].includes(native)) return native;
        }
      } catch (_) {}
      try {
        const stored = String(localStorage.getItem('peopleos-theme') || localStorage.getItem('theme') || localStorage.getItem('vite-ui-theme') || '').toLowerCase();
        if (['ivory','light','dark'].includes(stored)) return stored;
      } catch (_) {}
      return 'ivory';
    };

    const syncThemeSheet = () => {
      const mode = d.dataset.nativeTheme || savedTheme();
      const sheet = document.getElementById('peopleos-theme-sheet');
      if (sheet) sheet.querySelectorAll('button[data-theme]').forEach(btn => btn.classList.toggle('active',btn.dataset.theme === mode));
    };

    const applyTheme = (mode,persist=true) => {
      if (!['ivory','light','dark'].includes(mode)) mode = 'ivory';
      d.dataset.nativeTheme = mode;
      d.dataset.theme = mode;
      d.classList.toggle('dark',mode === 'dark');
      d.classList.toggle('light',mode === 'light');
      d.classList.toggle('ivory',mode === 'ivory');
      if (document.body) {
        document.body.classList.toggle('dark',mode === 'dark');
        document.body.classList.toggle('light',mode === 'light');
        document.body.classList.toggle('ivory',mode === 'ivory');
      }
      if (persist) {
        try {
          localStorage.setItem('peopleos-theme',mode);
          localStorage.setItem('theme',mode);
          localStorage.setItem('vite-ui-theme',mode);
        } catch (_) {}
      }
      try { window.dispatchEvent(new CustomEvent('peopleos-theme-change',{detail:{theme:mode}})); } catch (_) {}
      try { window.dispatchEvent(new CustomEvent('theme-change',{detail:{theme:mode}})); } catch (_) {}
      try { if (bridge && typeof bridge.setSystemTheme === 'function') bridge.setSystemTheme(mode); } catch (_) {}
      syncThemeSheet();
    };

    const ensureAppbar = () => {
      let bar = document.getElementById('peopleos-native-appbar');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'peopleos-native-appbar';
        bar.innerHTML = `<div class="bar"><button class="icon menu" type="button" aria-label="Open menu">${icons.menu}</button><div class="titlewrap"><span class="eyebrow"></span><strong class="title"></strong></div><div class="actions"><button class="icon theme" type="button" aria-label="Appearance">${icons.theme}</button><button class="icon notify" type="button" aria-label="Notifications">${icons.bell}</button></div></div>`;
        document.body.appendChild(bar);
        bar.querySelector('.menu').addEventListener('click',() => clickOriginalControl(['menu','sidebar','drawer','navigation'],0));
        bar.querySelector('.notify').addEventListener('click',() => clickOriginalControl(['notification','notifications','bell','alerts']));
        bar.querySelector('.theme').addEventListener('click',e => { e.stopPropagation(); ensureThemeSheet().classList.toggle('open'); });
      }
      const [eyebrow,title] = pageMeta();
      bar.querySelector('.eyebrow').textContent = eyebrow;
      bar.querySelector('.title').textContent = title;
      return bar;
    };

    const ensureThemeSheet = () => {
      let sheet = document.getElementById('peopleos-theme-sheet');
      if (!sheet) {
        sheet = document.createElement('div');
        sheet.id = 'peopleos-theme-sheet';
        sheet.innerHTML = `<div class="sheettitle">Appearance</div><div class="themes"><button type="button" data-theme="ivory">Ivory</button><button type="button" data-theme="light">Light</button><button type="button" data-theme="dark">Dark</button></div>`;
        document.body.appendChild(sheet);
        sheet.addEventListener('click',e => {
          const btn = e.target.closest('button[data-theme]');
          if (!btn) return;
          applyTheme(btn.dataset.theme,true);
          sheet.classList.remove('open');
        });
      }
      syncThemeSheet();
      return sheet;
    };

    const findHref = key => {
      const cfg = routes[key];
      const anchors = Array.from(document.querySelectorAll('a[href]')).filter(a => !a.closest('#peopleos-native-dock'));
      const hit = anchors.find(a => {
        const href = (a.getAttribute('href') || '').toLowerCase();
        const text = (a.textContent || '').toLowerCase();
        if (key === 'attendance' && href.includes('mobile-attendance')) return false;
        return cfg.terms.some(t => href.includes(t) || text.includes(t));
      });
      return hit?.getAttribute('href') || cfg.fallback;
    };

    const currentKey = () => {
      const p = location.pathname.toLowerCase();
      if (p.includes('mobile-attendance')) return 'punch';
      if (p.includes('attendance')) return 'attendance';
      if (p.includes('payroll')) return 'payroll';
      if (p.includes('profile')) return 'profile';
      return 'home';
    };

    const navigateSpa = key => {
      if (d.dataset.nativeAuth !== 'yes') return;
      const dock = document.getElementById('peopleos-native-dock');
      const href = findHref(key);
      let url;
      try { url = new URL(href,location.href); } catch (_) { return; }
      if (url.origin !== location.origin) { location.href = url.href; return; }
      const target = `${url.pathname}${url.search}${url.hash}`;
      const current = `${location.pathname}${location.search}${location.hash}`;
      if (target === current || (key === currentKey() && url.pathname === location.pathname)) {
        const root = document.getElementById('root');
        if (root) root.scrollTo({top:0,behavior:'smooth'}); else window.scrollTo({top:0,behavior:'smooth'});
        syncShell();
        return;
      }
      dock?.classList.add('busy');
      try {
        history.pushState(Object.assign({},history.state || {},{__peopleosNative:true}),'',target);
        window.dispatchEvent(new PopStateEvent('popstate',{state:history.state}));
        window.dispatchEvent(new CustomEvent('peopleos:navigation',{detail:{path:target}}));
      } catch (_) {
        location.href = target;
        return;
      }
      syncShell();
      setTimeout(syncShell,60);
      setTimeout(syncShell,180);
      setTimeout(() => { dock?.classList.remove('busy'); syncShell(); },520);
    };

    const ensureDock = () => {
      let dock = document.getElementById('peopleos-native-dock');
      if (!dock) {
        dock = document.createElement('nav');
        dock.id = 'peopleos-native-dock';
        dock.setAttribute('aria-label','Primary mobile navigation');
        dock.innerHTML = Object.entries(routes).map(([key,cfg]) => `<button type="button" class="dockbtn" data-route="${key}" aria-label="${cfg.label}">${cfg.icon}<span class="docklabel">${cfg.label}</span></button>`).join('');
        document.body.appendChild(dock);
        dock.addEventListener('click',e => {
          const btn = e.target.closest('button[data-route]');
          if (!btn) return;
          e.preventDefault();
          navigateSpa(btn.dataset.route);
        });
      }
      const active = currentKey();
      dock.querySelectorAll('.dockbtn').forEach(btn => {
        const on = btn.dataset.route === active;
        btn.classList.toggle('active',on);
        if (on) btn.setAttribute('aria-current','page'); else btn.removeAttribute('aria-current');
      });
      return dock;
    };

    let loginSeenAt = 0;
    let readySent = false;
    const sendReady = authenticated => {
      if (readySent) return;
      readySent = true;
      try { if (bridge && typeof bridge.setContentReady === 'function') bridge.setContentReady(!!authenticated); } catch (_) {}
    };

    const syncAuth = () => {
      const state = authState();
      if (state === 'app') {
        d.dataset.nativeAuth = 'yes';
        loginSeenAt = 0;
        ensureAppbar(); ensureDock(); ensureThemeSheet();
        try { if (bridge && typeof bridge.rememberRoute === 'function') bridge.rememberRoute(location.pathname); } catch (_) {}
        sendReady(true);
      } else if (state === 'login') {
        d.dataset.nativeAuth = 'no';
        document.getElementById('peopleos-theme-sheet')?.classList.remove('open');
        if (!loginSeenAt) loginSeenAt = Date.now();
        if (Date.now() - loginSeenAt >= 1000) sendReady(false);
      } else {
        d.dataset.nativeAuth = 'pending';
        if (Date.now() - bootStartedAt > 3200) sendReady(false);
      }
      return state;
    };

    let syncing = false;
    const syncShell = () => {
      if (syncing) return;
      syncing = true;
      requestAnimationFrame(() => {
        try {
          if (document.body) document.body.classList.add('peopleos-native-android','peopleos-native-r15');
          const state = syncAuth();
          if (state === 'app') { ensureAppbar(); ensureDock(); ensureThemeSheet(); }
          applyTheme(d.dataset.nativeTheme || savedTheme(),false);
        } finally { syncing = false; }
      });
    };
    window.__peopleosR15Sync = syncShell;

    const bootStartedAt = Date.now();
    applyTheme(savedTheme(),false);

    const rawPush = history.pushState.bind(history);
    const rawReplace = history.replaceState.bind(history);
    history.pushState = function(...args){ const out = rawPush(...args); setTimeout(syncShell,0); return out; };
    history.replaceState = function(...args){ const out = rawReplace(...args); setTimeout(syncShell,0); return out; };
    window.addEventListener('popstate',syncShell,{passive:true});
    window.addEventListener('hashchange',syncShell,{passive:true});
    window.addEventListener('pageshow',syncShell,{passive:true});
    document.addEventListener('visibilitychange',() => { if (!document.hidden) syncShell(); },{passive:true});
    document.addEventListener('click',e => {
      const sheet = document.getElementById('peopleos-theme-sheet');
      if (sheet?.classList.contains('open') && !e.target.closest('#peopleos-theme-sheet') && !e.target.closest('#peopleos-native-appbar .theme')) sheet.classList.remove('open');
    },true);

    const root = document.getElementById('root') || document.body;
    const bootObserver = new MutationObserver(() => syncShell());
    if (root) bootObserver.observe(root,{childList:true,subtree:true});

    syncShell();
    let passes = 0;
    const warm = setInterval(() => {
      syncShell();
      passes += 1;
      if (passes >= 20) {
        clearInterval(warm);
        try { bootObserver.disconnect(); } catch (_) {}
      }
    },200);
  } catch (_) {
    try { if (window.PeopleOSNative && typeof window.PeopleOSNative.setContentReady === 'function') window.PeopleOSNative.setContentReady(false); } catch (__){ }
  }
})();
