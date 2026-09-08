(() => {
  try {
    const d = document.documentElement;
    const body = document.body;
    d.dataset.nativeApp = 'android';
    d.dataset.nativeUi = 'r13';
    if (body) body.classList.add('peopleos-native-android', 'peopleos-native-r13');

    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      (document.head || d).appendChild(viewport);
    }
    viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');

    if (!document.getElementById('peopleos-native-r13-style')) {
      const style = document.createElement('style');
      style.id = 'peopleos-native-r13-style';
      style.textContent = `
        *,*::before,*::after{box-sizing:border-box}
        html[data-native-app='android'],
        html[data-native-app='android'] body,
        html[data-native-app='android'] #root{
          width:100%!important;
          max-width:100%!important;
          min-width:0!important;
          min-height:100%!important;
          height:auto!important;
          overflow-x:hidden!important;
          overflow-y:auto!important;
          overscroll-behavior-y:auto!important;
          -webkit-overflow-scrolling:touch!important;
        }
        html[data-native-app='android'] body{
          position:static!important;
          margin:0!important;
          touch-action:pan-y pinch-zoom!important;
          -webkit-tap-highlight-color:transparent;
          text-rendering:optimizeLegibility;
        }
        html[data-native-app='android'] main,
        html[data-native-app='android'] main > *{
          width:100%!important;
          max-width:100%!important;
          min-width:0!important;
          height:auto!important;
          min-height:0!important;
          max-height:none!important;
          overflow:visible!important;
        }
        html[data-native-app='android'] main .page-container{
          width:100%!important;
          max-width:100%!important;
          min-width:0!important;
          height:auto!important;
          min-height:calc(100dvh - 68px)!important;
          max-height:none!important;
          overflow:visible!important;
          margin:0 auto!important;
          padding-left:clamp(10px,3.4vw,18px)!important;
          padding-right:clamp(10px,3.4vw,18px)!important;
          padding-top:clamp(12px,3vw,20px)!important;
          padding-bottom:max(112px,calc(env(safe-area-inset-bottom) + 98px))!important;
        }
        html[data-native-app='android'] main .page-container *,
        html[data-native-app='android'] .attendance-premium-page *,
        html[data-native-app='android'] .employee-dashboard-v585 *,
        html[data-native-app='android'] .home-dashboard-v584 *{min-width:0}
        html[data-native-app='android'] img,
        html[data-native-app='android'] video,
        html[data-native-app='android'] canvas,
        html[data-native-app='android'] svg{max-width:100%}

        html[data-native-app='android'] .employee-dashboard-v585,
        html[data-native-app='android'] .home-dashboard-v584,
        html[data-native-app='android'] .attendance-premium-page,
        html[data-native-app='android'] .mobile-attendance-page{
          width:100%!important;
          max-width:100%!important;
          height:auto!important;
          max-height:none!important;
          overflow:visible!important;
          touch-action:pan-y!important;
        }
        html[data-native-app='android'] .overflow-y-auto,
        html[data-native-app='android'] .emp-modal-body,
        html[data-native-app='android'] .cr-face-list,
        html[data-native-app='android'] .mobile-camera-dialog,
        html[data-native-app='android'] .loan-dialog{
          overflow-y:auto!important;
          -webkit-overflow-scrolling:touch!important;
          overscroll-behavior:contain!important;
          touch-action:pan-y!important;
        }
        html[data-native-app='android'] .overflow-x-auto,
        html[data-native-app='android'] .premium-month-scroll,
        html[data-native-app='android'] .home-trend-summary-v584,
        html[data-native-app='android'] .home-bars-scroll-v584,
        html[data-native-app='android'] .emp-desktop-table,
        html[data-native-app='android'] .cr-audit-table-wrap,
        html[data-native-app='android'] .mobile-audit-table,
        html[data-native-app='android'] .loan-table,
        html[data-native-app='android'] table{
          max-width:100%!important;
          overflow-x:auto!important;
          -webkit-overflow-scrolling:touch!important;
          overscroll-behavior-x:contain!important;
          touch-action:pan-x pan-y!important;
        }

        html[data-native-ui='r13']{
          --native-radius-xl:24px;
          --native-radius-lg:20px;
          --native-radius-md:16px;
          --native-shadow:0 10px 30px rgba(50,25,34,.085);
          --native-shadow-strong:0 18px 46px rgba(57,19,34,.14);
          --native-gold:#d8b45f;
          --native-maroon:#8d163d;
          --native-maroon-deep:#5e102b;
        }
        html[data-native-ui='r13'] body{
          background:radial-gradient(circle at 92% 1%,hsl(var(--accent)/.075),transparent 22rem),radial-gradient(circle at 2% 12%,hsl(var(--primary)/.05),transparent 20rem),hsl(var(--background))!important;
        }
        html[data-native-ui='r13'] h1{
          font-size:clamp(1.75rem,7.3vw,2.35rem)!important;
          line-height:1.06!important;
          letter-spacing:-.042em!important;
          overflow-wrap:anywhere;
        }
        html[data-native-ui='r13'] h2{overflow-wrap:anywhere}
        html[data-native-ui='r13'] p,
        html[data-native-ui='r13'] button,
        html[data-native-ui='r13'] a{overflow-wrap:anywhere}
        html[data-native-ui='r13'] input,
        html[data-native-ui='r13'] select,
        html[data-native-ui='r13'] textarea{font-size:16px!important}
        html[data-native-ui='r13'] button,
        html[data-native-ui='r13'] [role='button']{max-width:100%}

        html[data-native-ui='r13'] main .page-container > .rounded-xl,
        html[data-native-ui='r13'] main .page-container .rounded-xl.border.bg-card,
        html[data-native-ui='r13'] .attendance-mobile-card,
        html[data-native-ui='r13'] .employee-secondary-card-v585,
        html[data-native-ui='r13'] .employee-summary-card-v585,
        html[data-native-ui='r13'] .employee-today-card-v585,
        html[data-native-ui='r13'] .employee-mobile-moments-card-v585,
        html[data-native-ui='r13'] .home-kpi-card-v584,
        html[data-native-ui='r13'] .home-weekly-card-v584{
          border-radius:var(--native-radius-lg)!important;
          border-color:color-mix(in srgb,hsl(var(--border)) 84%,hsl(var(--accent)) 16%)!important;
          box-shadow:var(--native-shadow)!important;
        }
        html[data-native-ui='r13'] .employee-mobile-hero-v585,
        html[data-native-ui='r13'] .mobile-attendance-hero,
        html[data-native-ui='r13'] .cr-attendance-hero{
          border-radius:var(--native-radius-xl)!important;
          box-shadow:var(--native-shadow-strong)!important;
        }
        html[data-native-ui='r13'] .mobile-attendance-hero{
          background:radial-gradient(circle at 88% 18%,rgba(233,196,102,.20),transparent 34%),linear-gradient(140deg,#7f1839 0%,#5e102b 54%,#34101f 100%)!important;
          border-color:rgba(230,196,111,.30)!important;
        }

        html[data-native-ui='r13'] .peopleos-mobile-dock{display:none!important}
        #peopleos-native-appbar,#peopleos-native-dock{font-family:inherit}
        #peopleos-native-appbar{
          display:none;
          position:fixed;
          z-index:2147483000;
          top:0;
          left:0;
          right:0;
          padding-top:env(safe-area-inset-top);
          background:color-mix(in srgb,hsl(var(--background)) 92%,transparent);
          border-bottom:1px solid color-mix(in srgb,hsl(var(--border)) 78%,transparent);
          box-shadow:0 6px 24px rgba(40,18,27,.07);
          -webkit-backdrop-filter:saturate(1.2) blur(18px);
          backdrop-filter:saturate(1.2) blur(18px);
        }
        #peopleos-native-appbar .native-bar-inner{
          height:62px;
          width:100%;
          max-width:760px;
          margin:0 auto;
          display:grid;
          grid-template-columns:44px minmax(0,1fr) auto;
          align-items:center;
          gap:8px;
          padding:8px clamp(10px,3.4vw,18px);
        }
        #peopleos-native-appbar .native-icon-btn{
          width:42px;
          height:42px;
          min-width:42px;
          border-radius:14px;
          border:1px solid color-mix(in srgb,hsl(var(--border)) 88%,transparent);
          background:color-mix(in srgb,hsl(var(--card)) 88%,transparent);
          color:hsl(var(--foreground));
          display:grid;
          place-items:center;
          padding:0;
          box-shadow:0 4px 14px rgba(35,16,23,.045);
        }
        #peopleos-native-appbar .native-icon-btn:active{transform:scale(.96)}
        #peopleos-native-appbar .native-title-wrap{min-width:0;padding:0 2px}
        #peopleos-native-appbar .native-eyebrow{
          display:block;
          color:var(--native-maroon);
          font-size:10px;
          line-height:1;
          font-weight:800;
          text-transform:uppercase;
          letter-spacing:.15em;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        #peopleos-native-appbar .native-title{
          display:block;
          margin-top:4px;
          color:hsl(var(--foreground));
          font-size:17px;
          line-height:1.05;
          font-weight:820;
          letter-spacing:-.025em;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        #peopleos-native-appbar .native-actions{display:flex;align-items:center;gap:7px}
        #peopleos-native-appbar svg{width:21px;height:21px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}

        #peopleos-native-dock{
          display:none;
          position:fixed;
          z-index:2147483000;
          left:50%;
          transform:translateX(-50%);
          bottom:max(7px,env(safe-area-inset-bottom));
          width:min(calc(100vw - 16px),540px);
          height:76px;
          padding:6px;
          grid-template-columns:repeat(5,minmax(0,1fr));
          gap:3px;
          border-radius:25px;
          border:1px solid rgba(218,183,98,.25);
          background:radial-gradient(circle at 50% -35%,rgba(229,196,110,.16),transparent 48%),linear-gradient(155deg,rgba(58,29,38,.985),rgba(24,15,19,.995));
          box-shadow:0 18px 44px rgba(44,18,29,.30),inset 0 1px 0 rgba(255,255,255,.07);
          -webkit-backdrop-filter:blur(20px) saturate(1.1);
          backdrop-filter:blur(20px) saturate(1.1);
        }
        #peopleos-native-dock .native-dock-link{
          min-width:0;
          width:100%;
          height:64px;
          border-radius:18px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:4px;
          padding:5px 2px 4px;
          color:rgba(255,255,255,.56);
          text-decoration:none;
          border:1px solid transparent;
          overflow:hidden;
        }
        #peopleos-native-dock .native-dock-link:active{transform:scale(.97)}
        #peopleos-native-dock .native-dock-link svg{width:24px;height:24px;flex:0 0 auto;stroke:currentColor;fill:none;stroke-width:1.85;stroke-linecap:round;stroke-linejoin:round}
        #peopleos-native-dock .native-dock-label{
          display:block;
          width:100%;
          min-width:0;
          text-align:center;
          font-size:clamp(9px,2.6vw,11px);
          line-height:1;
          font-weight:720;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        #peopleos-native-dock .native-dock-link.is-active{
          color:#fff8e8;
          background:linear-gradient(155deg,#a51c46,#751230);
          border-color:rgba(232,198,112,.34);
          box-shadow:0 8px 22px rgba(105,13,43,.38),inset 0 1px 0 rgba(255,231,166,.18);
        }
        #peopleos-native-dock .native-dock-link.is-active::after{
          content:'';
          width:22px;
          height:3px;
          border-radius:999px;
          margin-top:-1px;
          background:#e6c76e;
          box-shadow:0 0 10px rgba(230,199,110,.36);
        }

        html.dark #peopleos-native-appbar,
        html[data-theme='dark'] #peopleos-native-appbar{
          background:rgba(18,14,16,.90);
          border-bottom-color:rgba(255,255,255,.08);
          box-shadow:0 8px 26px rgba(0,0,0,.25);
        }
        html.dark #peopleos-native-appbar .native-icon-btn,
        html[data-theme='dark'] #peopleos-native-appbar .native-icon-btn{
          background:rgba(255,255,255,.055);
          border-color:rgba(255,255,255,.09);
        }
        html.dark #peopleos-native-appbar .native-eyebrow,
        html[data-theme='dark'] #peopleos-native-appbar .native-eyebrow{color:#e4c574}

        html[data-native-ui='r13'] .attendance-premium-page .grid.grid-cols-2{
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
          gap:clamp(10px,3vw,16px)!important;
        }
        html[data-native-ui='r13'] .attendance-premium-page .attendance-mobile-card{
          width:100%!important;
          max-width:100%!important;
          margin-bottom:0!important;
          padding:clamp(14px,4vw,20px)!important;
        }
        html[data-native-ui='r13'] .attendance-premium-page button,
        html[data-native-ui='r13'] .attendance-premium-page a{max-width:100%!important}
        html[data-native-ui='r13'] .emp-btn,
        html[data-native-ui='r13'] .mobile-attendance-hero-actions button,
        html[data-native-ui='r13'] .mobile-att-actions button{
          min-height:46px!important;
          border-radius:14px!important;
        }
        html[data-native-ui='r13'] .instant-install{display:none!important}

        @media(max-width:900px){
          html[data-native-ui='r13'] header.sticky{display:none!important}
          html[data-native-ui='r13'] #root{padding-top:calc(62px + env(safe-area-inset-top))!important}
          #peopleos-native-appbar.native-visible{display:block!important}
          #peopleos-native-dock.native-visible{display:grid!important}
        }
        @media(max-width:390px){
          #peopleos-native-appbar .native-bar-inner{grid-template-columns:42px minmax(0,1fr) auto;gap:6px;padding-left:8px;padding-right:8px}
          #peopleos-native-appbar .native-icon-btn{width:40px;height:40px;min-width:40px;border-radius:13px}
          #peopleos-native-appbar .native-title{font-size:15.5px}
          #peopleos-native-appbar .native-eyebrow{font-size:9px}
          #peopleos-native-dock{width:calc(100vw - 12px);height:72px;padding:5px;border-radius:23px}
          #peopleos-native-dock .native-dock-link{height:62px;border-radius:16px;gap:3px}
          #peopleos-native-dock .native-dock-link svg{width:22px;height:22px}
          #peopleos-native-dock .native-dock-label{font-size:9px}
        }
        @media(max-width:340px){
          html[data-native-ui='r13'] .attendance-premium-page .grid.grid-cols-2{grid-template-columns:1fr!important}
          #peopleos-native-appbar .native-actions .native-notification-btn{display:none!important}
          #peopleos-native-dock .native-dock-label{font-size:8.5px}
        }
        @media(min-width:901px){#peopleos-native-appbar,#peopleos-native-dock{display:none!important}}
      `;
      (document.head || d).appendChild(style);
    }

    const icons = {
      menu: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>`,
      theme: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg>`,
      bell: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`,
      home: `<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6"/></svg>`,
      punch: `<svg viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M9.5 5.5h5M10 18h4"/></svg>`,
      attendance: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>`,
      payroll: `<svg viewBox="0 0 24 24"><path d="M4 6.5h16v12H4z"/><path d="M4 9.5h16M8 15h3"/></svg>`,
      profile: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>`
    };

    const isAuthPath = () => /\/(login|signin|signup|register|forgot-password|reset-password)(\/|$)/i.test(location.pathname);
    const pageMeta = () => {
      const path = location.pathname.toLowerCase();
      if (path.includes('mobile-attendance')) return ['MOBILE ATTENDANCE', 'Punch attendance'];
      if (path.includes('attendance')) return ['ATTENDANCE', 'Attendance register'];
      if (path.includes('payroll')) return ['PAYROLL', 'Payroll'];
      if (path.includes('profile')) return ['PROFILE', 'My profile'];
      return ['PEOPLE OS', 'Dashboard'];
    };

    const scoreControl = (el, words) => {
      const text = `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.textContent || ''}`.toLowerCase();
      return words.some(w => text.includes(w));
    };
    const originalHeaderButtons = () => Array.from(document.querySelectorAll('header.sticky button, header.sticky [role="button"]'));
    const clickOriginal = (words, fallbackIndex = -1) => {
      const buttons = originalHeaderButtons();
      const hit = buttons.find(el => scoreControl(el, words));
      const target = hit || (fallbackIndex >= 0 ? buttons[fallbackIndex] : null);
      if (target) { target.click(); return true; }
      return false;
    };

    const detectTheme = () => {
      const stored = (localStorage.getItem('theme') || localStorage.getItem('peopleos-theme') || '').toLowerCase();
      const dataTheme = (d.dataset.theme || '').toLowerCase();
      if (d.classList.contains('dark') || dataTheme.includes('dark') || stored === 'dark') return 'dark';
      if (dataTheme.includes('light') || stored === 'light') return 'light';
      return 'ivory';
    };
    const syncNativeBars = () => {
      try {
        if (window.PeopleOSNative && typeof window.PeopleOSNative.setSystemTheme === 'function') window.PeopleOSNative.setSystemTheme(detectTheme());
      } catch (_) {}
    };
    const fallbackThemeCycle = () => {
      const current = detectTheme();
      const next = current === 'ivory' ? 'dark' : current === 'dark' ? 'light' : 'ivory';
      d.classList.toggle('dark', next === 'dark');
      d.classList.toggle('light', next === 'light');
      d.classList.toggle('ivory', next === 'ivory');
      d.dataset.theme = next;
      localStorage.setItem('theme', next);
      window.dispatchEvent(new Event('peopleos-theme-change'));
      syncNativeBars();
    };

    const ensureAppbar = () => {
      let bar = document.getElementById('peopleos-native-appbar');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'peopleos-native-appbar';
        bar.innerHTML = `
          <div class="native-bar-inner">
            <button class="native-icon-btn native-menu-btn" type="button" aria-label="Open menu">${icons.menu}</button>
            <div class="native-title-wrap"><span class="native-eyebrow"></span><strong class="native-title"></strong></div>
            <div class="native-actions">
              <button class="native-icon-btn native-theme-btn" type="button" aria-label="Switch appearance">${icons.theme}</button>
              <button class="native-icon-btn native-notification-btn" type="button" aria-label="Notifications">${icons.bell}</button>
            </div>
          </div>`;
        document.body.appendChild(bar);
        bar.querySelector('.native-menu-btn').addEventListener('click', () => {
          if (!clickOriginal(['menu','sidebar','navigation','drawer'], 0)) history.back();
        });
        bar.querySelector('.native-theme-btn').addEventListener('click', () => {
          if (!clickOriginal(['theme','appearance','dark','light','ivory','mode'])) fallbackThemeCycle();
          setTimeout(syncNativeBars, 180);
        });
        bar.querySelector('.native-notification-btn').addEventListener('click', () => clickOriginal(['notification','bell','alerts']));
      }
      const [eyebrow, title] = pageMeta();
      const eyebrowEl = bar.querySelector('.native-eyebrow');
      const titleEl = bar.querySelector('.native-title');
      if (eyebrowEl && eyebrowEl.textContent !== eyebrow) eyebrowEl.textContent = eyebrow;
      if (titleEl && titleEl.textContent !== title) titleEl.textContent = title;
      bar.classList.toggle('native-visible', !isAuthPath());
      return bar;
    };

    const findHref = (terms, fallback, excludes = []) => {
      const anchors = Array.from(document.querySelectorAll('.peopleos-mobile-dock a, nav a'));
      const hit = anchors.find(a => {
        const hay = `${a.textContent || ''} ${a.getAttribute('href') || ''}`.toLowerCase();
        return terms.some(t => hay.includes(t)) && !excludes.some(t => hay.includes(t));
      });
      return hit && hit.getAttribute('href') ? hit.getAttribute('href') : fallback;
    };
    const ensureDock = () => {
      let dock = document.getElementById('peopleos-native-dock');
      const items = [
        ['home','Home',findHref(['home','dashboard'],'/'),icons.home],
        ['punch','Punch',findHref(['mobile-attendance','mobile attendance','punch'],'/mobile-attendance'),icons.punch],
        ['attendance','Attendance',findHref(['attendance'],'/attendance',['mobile-attendance','mobile attendance']),icons.attendance],
        ['payroll','Payroll',findHref(['payroll'],'/payroll'),icons.payroll],
        ['profile','Profile',findHref(['profile'],'/profile'),icons.profile]
      ];
      if (!dock) {
        dock = document.createElement('nav');
        dock.id = 'peopleos-native-dock';
        dock.setAttribute('aria-label','Primary mobile navigation');
        document.body.appendChild(dock);
      }
      const signature = items.map(([key,label,href]) => `${key}:${label}:${href}`).join('|');
      if (dock.dataset.signature !== signature) {
        dock.dataset.signature = signature;
        dock.innerHTML = items.map(([key,label,href,icon]) => `<a class="native-dock-link" data-native-route="${key}" href="${href}" aria-label="${key === 'punch' ? 'Mobile Attendance' : label}">${icon}<span class="native-dock-label">${label}</span></a>`).join('');
      }
      const path = location.pathname.toLowerCase();
      dock.querySelectorAll('.native-dock-link').forEach(link => {
        const key = link.dataset.nativeRoute;
        const active = key === 'home' ? (path === '/' || path === '') : key === 'punch' ? path.includes('mobile-attendance') : key === 'attendance' ? (path.includes('attendance') && !path.includes('mobile-attendance')) : path.includes(key);
        link.classList.toggle('is-active', !!active);
        if (active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
      });
      dock.classList.toggle('native-visible', !isAuthPath());
      return dock;
    };

    const unlockScroll = () => {
      d.style.setProperty('overflow-y','auto','important');
      d.style.setProperty('overflow-x','hidden','important');
      d.style.setProperty('height','auto','important');
      if (document.body) {
        document.body.style.setProperty('overflow-y','auto','important');
        document.body.style.setProperty('overflow-x','hidden','important');
        document.body.style.setProperty('height','auto','important');
        document.body.style.webkitOverflowScrolling = 'touch';
      }
      const main = document.querySelector('main');
      if (main) main.style.setProperty('overflow','visible','important');
    };

    let syncTimer = 0;
    const syncShell = () => {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        if (document.body && !document.body.classList.contains('peopleos-native-r13')) document.body.classList.add('peopleos-native-android','peopleos-native-r13');
        unlockScroll();
        ensureAppbar();
        ensureDock();
        syncNativeBars();
      }, 40);
    };

    if (!window.__peopleosNativeR13Installed) {
      window.__peopleosNativeR13Installed = true;
      const push = history.pushState.bind(history);
      const replace = history.replaceState.bind(history);
      history.pushState = (...args) => { const r = push(...args); setTimeout(syncShell,0); return r; };
      history.replaceState = (...args) => { const r = replace(...args); setTimeout(syncShell,0); return r; };
      window.addEventListener('popstate', syncShell, {passive:true});
      window.addEventListener('hashchange', syncShell, {passive:true});
      window.addEventListener('resize', syncShell, {passive:true});
      window.addEventListener('orientationchange', syncShell, {passive:true});
      document.addEventListener('visibilitychange', () => { if (!document.hidden) syncShell(); }, {passive:true});

      const treeObserver = new MutationObserver(records => {
        const relevant = records.some(record => {
          const target = record.target && record.target.nodeType === 1 ? record.target : record.target?.parentElement;
          return !(target && target.closest && target.closest('#peopleos-native-appbar,#peopleos-native-dock'));
        });
        if (relevant) syncShell();
      });
      treeObserver.observe(document.documentElement, {childList:true, subtree:true});
      window.__peopleosNativeR13Observer = treeObserver;

      const themeObserver = new MutationObserver(syncShell);
      themeObserver.observe(document.documentElement, {attributes:true, attributeFilter:['class','data-theme']});
      window.__peopleosNativeR13ThemeObserver = themeObserver;
    }

    syncShell();
  } catch (_) {}
})();
