package com.umeed.peopleos;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final String APP_ORIGIN = "https://hrm.umeedschool.com";
    private static final String TRUSTED_HOST = "hrm.umeedschool.com";
    private static final int REQ_CAMERA = 4101;
    private static final int REQ_LOCATION = 4102;
    private static final int REQ_FILE_CAMERA = 4103;
    private static final int REQ_FILE_CHOOSER = 4201;

    private WebView webView;
    private ProgressBar progressBar;
    private FrameLayout splashOverlay;
    private TextView splashTitle;
    private TextView splashSubtitle;
    private boolean firstContentReady = false;
    private PermissionRequest pendingWebPermission;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;
    private ValueCallback<Uri[]> pendingFileCallback;
    private Uri pendingCameraUri;
    private String nativeEnhancementScript = "";
    private boolean nativeInjectedForPage = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        String savedTheme = getPreferences(MODE_PRIVATE).getString("peopleos_theme", "ivory");
        String savedLanguage = getPreferences(MODE_PRIVATE).getString("peopleos_language", "en");
        applySystemTheme(savedTheme);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(backgroundForTheme(savedTheme));

        webView = new WebView(this);
        webView.setBackgroundColor(backgroundForTheme(savedTheme));
        webView.setVerticalScrollBarEnabled(true);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setScrollbarFadingEnabled(true);
        webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
        webView.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);
        webView.setNestedScrollingEnabled(true);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, true);

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);

        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        root.addView(progressBar, new FrameLayout.LayoutParams(-1, 4));
        splashOverlay = buildSplash(savedTheme, savedLanguage);
        root.addView(splashOverlay, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);

        nativeEnhancementScript = loadAssetText("native-r15.js") + "\n"
                + loadAssetText("peopleos-l10n-r17.js") + "\n"
                + loadAssetText("peopleos-ai-r17.js");
        configureWebView();

        if (savedInstanceState == null) webView.loadUrl(buildStartUrl());
        else webView.restoreState(savedInstanceState);
    }

    private FrameLayout buildSplash(String mode, String language) {
        FrameLayout overlay = new FrameLayout(this);
        overlay.setBackgroundColor(backgroundForTheme(mode));
        overlay.setClickable(true);
        overlay.setFocusable(true);

        LinearLayout stack = new LinearLayout(this);
        stack.setOrientation(LinearLayout.VERTICAL);
        stack.setGravity(Gravity.CENTER);
        stack.setPadding(32, 32, 32, 32);

        splashTitle = new TextView(this);
        splashTitle.setText("PeopleOS");
        splashTitle.setTextSize(28f);
        splashTitle.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        splashTitle.setGravity(Gravity.CENTER);

        splashSubtitle = new TextView(this);
        splashSubtitle.setTextSize(13f);
        splashSubtitle.setGravity(Gravity.CENTER);
        splashSubtitle.setPadding(0, 8, 0, 22);

        ProgressBar spinner = new ProgressBar(this);
        stack.addView(splashTitle, new LinearLayout.LayoutParams(-2, -2));
        stack.addView(splashSubtitle, new LinearLayout.LayoutParams(-2, -2));
        stack.addView(spinner, new LinearLayout.LayoutParams(-2, -2));
        overlay.addView(stack, new FrameLayout.LayoutParams(-2, -2, Gravity.CENTER));
        applySplashTheme(mode);
        applySplashLanguage(language);
        return overlay;
    }

    private int backgroundForTheme(String mode) {
        if ("dark".equalsIgnoreCase(mode)) return Color.rgb(23, 18, 21);
        if ("light".equalsIgnoreCase(mode)) return Color.rgb(250, 250, 250);
        return Color.rgb(247, 243, 236);
    }

    private void applySplashTheme(String mode) {
        if (splashOverlay == null || splashTitle == null || splashSubtitle == null) return;
        boolean dark = "dark".equalsIgnoreCase(mode);
        splashOverlay.setBackgroundColor(backgroundForTheme(mode));
        splashTitle.setTextColor(dark ? Color.rgb(248, 240, 243) : Color.rgb(50, 34, 41));
        splashSubtitle.setTextColor(dark ? Color.rgb(195, 180, 186) : Color.rgb(117, 96, 104));
    }

    private void applySplashLanguage(String language) {
        if (splashSubtitle == null) return;
        boolean urdu = "ur".equalsIgnoreCase(language);
        splashSubtitle.setText(urdu ? "امید ایجوکیشن سسٹم" : "Umeed Education System");
        splashSubtitle.setGravity(Gravity.CENTER);
    }

    private void hideSplash() {
        if (firstContentReady) return;
        firstContentReady = true;
        if (splashOverlay == null || splashOverlay.getVisibility() != View.VISIBLE) return;
        splashOverlay.animate().alpha(0f).setDuration(180).withEndAction(() -> {
            splashOverlay.setVisibility(View.GONE);
            splashOverlay.setAlpha(1f);
        }).start();
    }

    private String buildStartUrl() {
        String route = getPreferences(MODE_PRIVATE).getString("peopleos_last_route", "/");
        if (route == null || !route.startsWith("/") || isAuthRoute(route)) route = "/";
        return APP_ORIGIN + route + (route.contains("?") ? "&" : "?") + "native=android&v=592r17";
    }

    private boolean isAuthRoute(String route) {
        String value = route == null ? "" : route.toLowerCase();
        return value.contains("/login") || value.contains("/signin") || value.contains("/sign-in")
                || value.contains("/signup") || value.contains("/register")
                || value.contains("forgot-password") || value.contains("reset-password");
    }

    private String loadAssetText(String name) {
        StringBuilder out = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(getAssets().open(name), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) out.append(line).append('\n');
        } catch (IOException e) {
            Toast.makeText(this, "Mobile interface assets could not be loaded.", Toast.LENGTH_SHORT).show();
        }
        return out.toString();
    }

    private boolean isTrusted(Uri uri) {
        return uri != null && "https".equalsIgnoreCase(uri.getScheme()) && TRUSTED_HOST.equalsIgnoreCase(uri.getHost());
    }

    private boolean isTrusted(String value) {
        try { return value != null && isTrusted(Uri.parse(value)); }
        catch (Exception e) { return false; }
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
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setLoadsImagesAutomatically(true);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setOffscreenPreRaster(true);
        s.setUserAgentString(s.getUserAgentString() + " PeopleOSAndroid/5.9.2-R17");

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);
        webView.addJavascriptInterface(new NativeUiBridge(), "PeopleOSNative");

        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isTrusted(uri)) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                catch (Exception e) { Toast.makeText(MainActivity.this, "Unable to open this link.", Toast.LENGTH_SHORT).show(); }
                return true;
            }

            @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                nativeInjectedForPage = false;
                progressBar.setVisibility(View.VISIBLE);
                if (!firstContentReady && splashOverlay != null) splashOverlay.setVisibility(View.VISIBLE);
            }

            @Override public void onPageCommitVisible(WebView view, String url) {
                super.onPageCommitVisible(view, url);
                injectNativeOnce(view);
            }

            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectNativeOnce(view);
                CookieManager.getInstance().flush();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                progressBar.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
                if (newProgress >= 30) injectNativeOnce(view);
            }

            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    String origin = request.getOrigin() == null ? "" : request.getOrigin().toString();
                    if (!isTrusted(origin)) { request.deny(); return; }
                    boolean asksCamera = false;
                    for (String resource : request.getResources()) if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) asksCamera = true;
                    if (!asksCamera) { request.deny(); return; }
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
                        request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    else { pendingWebPermission = request; requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA); }
                });
            }

            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (!isTrusted(origin)) { callback.invoke(origin, false, false); return; }
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) callback.invoke(origin, true, false);
                else {
                    pendingGeoCallback = callback;
                    pendingGeoOrigin = origin;
                    requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOCATION);
                }
            }

            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingFileCallback != null) pendingFileCallback.onReceiveValue(null);
                pendingFileCallback = callback;
                if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED)
                    requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_FILE_CAMERA);
                else launchCamera();
                return true;
            }
        });
    }

    private void injectNativeOnce(WebView view) {
        if (nativeInjectedForPage || view == null || nativeEnhancementScript == null || nativeEnhancementScript.isEmpty()) return;
        nativeInjectedForPage = true;
        view.evaluateJavascript(nativeEnhancementScript, null);
    }

    private void syncNativeShell(WebView view) {
        if (view == null) return;
        view.evaluateJavascript("window.__peopleosR15Sync&&window.__peopleosR15Sync();window.__peopleosR17LocaleSync&&window.__peopleosR17LocaleSync();window.__peopleosAiR17Sync&&window.__peopleosAiR17Sync();", null);
    }

    private class NativeUiBridge {
        @JavascriptInterface public void setSystemTheme(String mode) {
            String safeMode = ("dark".equalsIgnoreCase(mode) || "light".equalsIgnoreCase(mode)) ? mode.toLowerCase() : "ivory";
            getPreferences(MODE_PRIVATE).edit().putString("peopleos_theme", safeMode).apply();
            runOnUiThread(() -> applySystemTheme(safeMode));
        }
        @JavascriptInterface public String getSavedTheme() { return getPreferences(MODE_PRIVATE).getString("peopleos_theme", "ivory"); }
        @JavascriptInterface public void setAppLanguage(String value) {
            String safe = "ur".equalsIgnoreCase(value) ? "ur" : "en";
            getPreferences(MODE_PRIVATE).edit().putString("peopleos_language", safe).apply();
            runOnUiThread(() -> applySplashLanguage(safe));
        }
        @JavascriptInterface public String getSavedLanguage() { return getPreferences(MODE_PRIVATE).getString("peopleos_language", "en"); }
        @JavascriptInterface public void setContentReady(boolean authenticated) { runOnUiThread(MainActivity.this::hideSplash); }
        @JavascriptInterface public void rememberRoute(String route) {
            if (route == null || !route.startsWith("/") || isAuthRoute(route)) return;
            getPreferences(MODE_PRIVATE).edit().putString("peopleos_last_route", route).apply();
        }
    }

    private void applySystemTheme(String mode) {
        boolean dark = "dark".equalsIgnoreCase(mode), light = "light".equalsIgnoreCase(mode);
        int flags;
        if (dark) {
            getWindow().setStatusBarColor(Color.rgb(24,18,21));
            getWindow().setNavigationBarColor(Color.rgb(18,14,16));
            flags = 0;
        } else if (light) {
            getWindow().setStatusBarColor(Color.rgb(250,250,250));
            getWindow().setNavigationBarColor(Color.rgb(250,250,250));
            flags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        } else {
            getWindow().setStatusBarColor(Color.rgb(247,243,236));
            getWindow().setNavigationBarColor(Color.rgb(247,243,236));
            flags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        getWindow().getDecorView().setSystemUiVisibility(flags);
        if (webView != null) webView.setBackgroundColor(backgroundForTheme(mode));
        applySplashTheme(mode);
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

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        if (requestCode == REQ_CAMERA && pendingWebPermission != null) {
            if (granted) pendingWebPermission.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else pendingWebPermission.deny();
            pendingWebPermission = null;
        } else if (requestCode == REQ_LOCATION && pendingGeoCallback != null) {
            pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        } else if (requestCode == REQ_FILE_CAMERA) {
            if (granted) launchCamera();
            else if (pendingFileCallback != null) { pendingFileCallback.onReceiveValue(null); pendingFileCallback = null; }
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
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

    @Override protected void onResume() {
        super.onResume();
        if (webView != null) { webView.onResume(); syncNativeShell(webView); }
    }

    @Override protected void onPause() {
        if (webView != null) webView.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("PeopleOSNative");
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}
