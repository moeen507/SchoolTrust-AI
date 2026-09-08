package com.umeed.peopleos;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.MotionEvent;
import android.view.View;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.IOException;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://hrm.umeedschool.com/?native=android&v=592r12";
    private static final String TRUSTED_ORIGIN = "https://hrm.umeedschool.com";
    private static final int REQ_CAMERA = 4101;
    private static final int REQ_LOCATION = 4102;
    private static final int REQ_FILE_CAMERA = 4103;
    private static final int REQ_FILE_CHOOSER = 4201;

    private WebView webView;
    private ProgressBar progressBar;
    private PermissionRequest pendingWebPermission;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;
    private ValueCallback<Uri[]> pendingFileCallback;
    private Uri pendingCameraUri;

    private static final String NATIVE_ENHANCEMENT_SCRIPT = """
        (() => {
          try {
            const d = document.documentElement;
            const b = document.body;
            d.dataset.nativeApp = 'android';
            d.dataset.nativeUi = 'r12';
            if (b) b.classList.add('peopleos-native-android','peopleos-native-r12');

            let style = document.getElementById('peopleos-native-r12-style');
            if (!style) {
              style = document.createElement('style');
              style.id = 'peopleos-native-r12-style';
              style.textContent = `
                html[data-native-app='android'],
                html[data-native-app='android'] body,
                html[data-native-app='android'] #root{
                  width:100%!important;
                  max-width:100%!important;
                  min-height:100%!important;
                  height:auto!important;
                  overflow-y:auto!important;
                  overflow-x:hidden!important;
                  overscroll-behavior-y:auto!important;
                  -webkit-overflow-scrolling:touch!important;
                }
                html[data-native-app='android'] body{
                  position:static!important;
                  touch-action:pan-y pinch-zoom!important;
                  -webkit-tap-highlight-color:transparent;
                  text-rendering:optimizeLegibility;
                }
                html[data-native-app='android'] main,
                html[data-native-app='android'] main > *{
                  height:auto!important;
                  min-height:0!important;
                  max-height:none!important;
                  overflow:visible!important;
                  touch-action:pan-y pinch-zoom!important;
                }
                html[data-native-app='android'] main .page-container{
                  width:100%!important;
                  max-width:100%!important;
                  height:auto!important;
                  min-height:calc(100dvh - 74px)!important;
                  max-height:none!important;
                  overflow:visible!important;
                  padding-left:14px!important;
                  padding-right:14px!important;
                  padding-top:16px!important;
                  padding-bottom:max(136px,calc(env(safe-area-inset-bottom) + 118px))!important;
                  box-sizing:border-box!important;
                }
                html[data-native-app='android'] .employee-dashboard-v585,
                html[data-native-app='android'] .home-dashboard-v584,
                html[data-native-app='android'] .attendance-premium-page,
                html[data-native-app='android'] .mobile-attendance-page{
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
                html[data-native-app='android'] .loan-table{
                  overflow-x:auto!important;
                  -webkit-overflow-scrolling:touch!important;
                  overscroll-behavior-x:contain!important;
                  touch-action:pan-x pan-y!important;
                }

                html[data-native-ui='r12']{
                  --native-radius-xl:24px;
                  --native-radius-lg:20px;
                  --native-shadow:0 12px 34px rgba(42,23,30,.085);
                  --native-shadow-strong:0 18px 46px rgba(57,19,34,.13);
                }
                html[data-native-ui='r12'] body{
                  background:
                    radial-gradient(circle at 92% 2%,hsl(var(--accent)/.075),transparent 24rem),
                    radial-gradient(circle at 4% 14%,hsl(var(--primary)/.055),transparent 22rem),
                    hsl(var(--background))!important;
                }
                html[data-native-ui='r12'] header.sticky{
                  min-height:64px!important;
                  border-bottom:1px solid color-mix(in srgb,hsl(var(--border)) 72%,transparent)!important;
                  background:color-mix(in srgb,hsl(var(--background)) 94%,transparent)!important;
                  box-shadow:0 6px 22px rgba(44,20,29,.055)!important;
                  -webkit-backdrop-filter:saturate(1.15) blur(18px)!important;
                  backdrop-filter:saturate(1.15) blur(18px)!important;
                }
                html[data-native-ui='r12'] main .page-container > .rounded-xl,
                html[data-native-ui='r12'] main .page-container .rounded-xl.border.bg-card,
                html[data-native-ui='r12'] .attendance-mobile-card,
                html[data-native-ui='r12'] .employee-secondary-card-v585,
                html[data-native-ui='r12'] .employee-summary-card-v585,
                html[data-native-ui='r12'] .employee-today-card-v585,
                html[data-native-ui='r12'] .employee-mobile-moments-card-v585,
                html[data-native-ui='r12'] .home-kpi-card-v584,
                html[data-native-ui='r12'] .home-weekly-card-v584{
                  border-radius:var(--native-radius-lg)!important;
                  border-color:color-mix(in srgb,hsl(var(--border)) 84%,hsl(var(--accent)) 16%)!important;
                  box-shadow:var(--native-shadow)!important;
                }
                html[data-native-ui='r12'] .employee-mobile-hero-v585,
                html[data-native-ui='r12'] .mobile-attendance-hero,
                html[data-native-ui='r12'] .cr-attendance-hero{
                  border-radius:var(--native-radius-xl)!important;
                  box-shadow:var(--native-shadow-strong)!important;
                }
                html[data-native-ui='r12'] .mobile-attendance-hero{
                  background:
                    radial-gradient(circle at 88% 18%,rgba(233,196,102,.20),transparent 34%),
                    linear-gradient(140deg,#7f1839 0%,#5e102b 54%,#34101f 100%)!important;
                  border-color:rgba(230,196,111,.30)!important;
                }
                html[data-native-ui='r12'] .peopleos-mobile-dock{
                  left:10px!important;
                  right:10px!important;
                  bottom:max(8px,env(safe-area-inset-bottom))!important;
                  min-height:70px!important;
                  padding:6px!important;
                  gap:4px!important;
                  border-radius:24px!important;
                  border:1px solid rgba(218,183,98,.24)!important;
                  background:
                    radial-gradient(circle at 50% -40%,rgba(229,196,110,.16),transparent 48%),
                    linear-gradient(155deg,rgba(54,27,35,.985),rgba(23,15,19,.995))!important;
                  box-shadow:0 18px 44px rgba(44,18,29,.28),inset 0 1px 0 rgba(255,255,255,.07)!important;
                  overflow-x:auto!important;
                  overflow-y:hidden!important;
                  touch-action:pan-x!important;
                  scrollbar-width:none!important;
                }
                html[data-native-ui='r12'] .peopleos-mobile-dock::-webkit-scrollbar{display:none!important}
                html[data-native-ui='r12'] .peopleos-dock-link{
                  min-width:58px!important;
                  min-height:56px!important;
                  border-radius:17px!important;
                  padding:5px 3px!important;
                  gap:3px!important;
                }
                html[data-native-ui='r12'] .peopleos-dock-icon{
                  width:29px!important;
                  height:27px!important;
                }
                html[data-native-ui='r12'] .peopleos-dock-label{
                  font-size:9.7px!important;
                  line-height:1.05!important;
                  font-weight:760!important;
                }
                html[data-native-ui='r12'] .peopleos-dock-link.is-active{
                  background:linear-gradient(155deg,#a51c46,#771334)!important;
                  border-color:rgba(232,198,112,.30)!important;
                  box-shadow:0 9px 24px rgba(105,13,43,.35),inset 0 1px 0 rgba(255,231,166,.15)!important;
                }
                html[data-native-ui='r12'] input,
                html[data-native-ui='r12'] select,
                html[data-native-ui='r12'] textarea{
                  font-size:16px!important;
                }
                html[data-native-ui='r12'] .emp-btn,
                html[data-native-ui='r12'] .mobile-attendance-hero-actions button,
                html[data-native-ui='r12'] .mobile-att-actions button{
                  min-height:48px!important;
                  border-radius:14px!important;
                }
                html[data-native-ui='r12'] h1{letter-spacing:-.035em}
                html[data-native-ui='r12'] .attendance-mobile-card{margin-bottom:12px!important}
                html[data-native-ui='r12'] .instant-install{display:none!important}
                @media(max-width:760px){
                  html[data-native-ui='r12'] main .page-container{
                    padding-left:12px!important;
                    padding-right:12px!important;
                  }
                  html[data-native-ui='r12'] .home-kpi-grid-v584{gap:10px!important}
                  html[data-native-ui='r12'] .home-kpi-card-v584{
                    min-height:122px!important;
                    padding:14px!important;
                  }
                  html[data-native-ui='r12'] .home-kpi-value-v584{font-size:1.9rem!important}
                }
              `;
              (document.head || d).appendChild(style);
            }

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
            };
            unlockScroll();

            if (!window.__peopleosNativeR12Observer) {
              window.__peopleosNativeR12Observer = new MutationObserver(() => {
                if (document.body && !document.body.classList.contains('peopleos-native-r12')) {
                  document.body.classList.add('peopleos-native-android','peopleos-native-r12');
                }
                const main = document.querySelector('main');
                if (main) main.style.setProperty('overflow','visible','important');
              });
              window.__peopleosNativeR12Observer.observe(document.documentElement,{childList:true,subtree:true});
              window.addEventListener('popstate',()=>setTimeout(unlockScroll,0),{passive:true});
              window.addEventListener('hashchange',()=>setTimeout(unlockScroll,0),{passive:true});
              document.addEventListener('visibilitychange',()=>{ if(!document.hidden) setTimeout(unlockScroll,0); },{passive:true});
            }
          } catch (e) {}
        })();
        """;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(112, 21, 47));
        getWindow().setNavigationBarColor(Color.rgb(245, 239, 228));

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(245, 239, 228));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(245, 239, 228));
        webView.setVerticalScrollBarEnabled(true);
        webView.setHorizontalScrollBarEnabled(true);
        webView.setScrollbarFadingEnabled(true);
        webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
        webView.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);
        webView.setNestedScrollingEnabled(true);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.setOnTouchListener((v, event) -> {
            if (event.getActionMasked() == MotionEvent.ACTION_DOWN ||
                    event.getActionMasked() == MotionEvent.ACTION_MOVE) {
                v.getParent().requestDisallowInterceptTouchEvent(true);
            }
            return false;
        });

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);

        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        root.addView(progressBar, new FrameLayout.LayoutParams(-1, 5));
        setContentView(root);

        configureWebView();
        if (savedInstanceState == null) webView.loadUrl(APP_URL);
        else webView.restoreState(savedInstanceState);
    }

    private boolean isTrusted(String value) {
        return value != null && value.startsWith(TRUSTED_ORIGIN);
    }

    private void configureWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setSupportZoom(false);
        s.setTextZoom(100);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);
        s.setUserAgentString(s.getUserAgentString() + " PeopleOSAndroid/5.9.2-R12");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String url = uri == null ? "" : uri.toString();
                if (isTrusted(url)) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Unable to open this link.", Toast.LENGTH_SHORT).show();
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                applyNativeEnhancements(view);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                progressBar.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
                if (newProgress >= 70) applyNativeEnhancements(view);
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    String origin = request.getOrigin() == null ? "" : request.getOrigin().toString();
                    if (!isTrusted(origin)) {
                        request.deny();
                        return;
                    }
                    boolean asksCamera = false;
                    for (String r : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) asksCamera = true;
                    }
                    if (!asksCamera) {
                        request.deny();
                        return;
                    }
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    } else {
                        pendingWebPermission = request;
                        requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
                    }
                });
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (!isTrusted(origin)) {
                    callback.invoke(origin, false, false);
                    return;
                }
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false);
                } else {
                    pendingGeoCallback = callback;
                    pendingGeoOrigin = origin;
                    requestPermissions(new String[]{
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                    }, REQ_LOCATION);
                }
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingFileCallback != null) pendingFileCallback.onReceiveValue(null);
                pendingFileCallback = callback;
                if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_FILE_CAMERA);
                } else {
                    launchCamera();
                }
                return true;
            }
        });
    }

    private void applyNativeEnhancements(WebView view) {
        if (view == null) return;
        view.evaluateJavascript(NATIVE_ENHANCEMENT_SCRIPT, null);
    }

    private void launchCamera() {
        try {
            File dir = new File(getCacheDir(), "camera");
            if (!dir.exists() && !dir.mkdirs()) throw new IOException("Unable to create camera cache");
            File image = File.createTempFile("peopleos-selfie-", ".jpg", dir);
            pendingCameraUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", image);
            Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            camera.putExtra(MediaStore.EXTRA_OUTPUT, pendingCameraUri);
            camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(camera, REQ_FILE_CHOOSER);
        } catch (Exception e) {
            if (pendingFileCallback != null) pendingFileCallback.onReceiveValue(null);
            pendingFileCallback = null;
            pendingCameraUri = null;
            Toast.makeText(this, "No camera app is available.", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        if (requestCode == REQ_CAMERA) {
            if (pendingWebPermission != null) {
                if (granted) pendingWebPermission.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                else pendingWebPermission.deny();
                pendingWebPermission = null;
            }
        } else if (requestCode == REQ_LOCATION) {
            if (pendingGeoCallback != null) {
                pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
                pendingGeoCallback = null;
                pendingGeoOrigin = null;
            }
        } else if (requestCode == REQ_FILE_CAMERA) {
            if (granted) launchCamera();
            else if (pendingFileCallback != null) {
                pendingFileCallback.onReceiveValue(null);
                pendingFileCallback = null;
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_FILE_CHOOSER || pendingFileCallback == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK) {
            if (data != null && data.getData() != null) result = new Uri[]{data.getData()};
            else if (pendingCameraUri != null) result = new Uri[]{pendingCameraUri};
        }
        pendingFileCallback.onReceiveValue(result);
        pendingFileCallback = null;
        pendingCameraUri = null;
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            applyNativeEnhancements(webView);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}
