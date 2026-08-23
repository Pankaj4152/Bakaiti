package com.chitput.bakaiti;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private PermissionRequest pendingWebPermissionRequest;
    private static final int PERMISSION_REQ_CODE = 200;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Ask Notification permission on launch if not granted
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }

        // 2. Enable persistent cookies & local storage for WebView session persistence
        try {
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(this.getBridge().getWebView(), true);
            cookieManager.flush();

            WebView webView = this.getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setMediaPlaybackRequiresUserGesture(false);

                // 3. Dynamic on-demand permission handler (Ask ONLY when user taps mic, camera, etc.)
                webView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        List<String> neededPermissions = new ArrayList<>();
                        for (String resource : request.getResources()) {
                            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                                    neededPermissions.add(Manifest.permission.RECORD_AUDIO);
                                }
                            } else if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                                    neededPermissions.add(Manifest.permission.CAMERA);
                                }
                            }
                        }

                        if (!neededPermissions.isEmpty()) {
                            pendingWebPermissionRequest = request;
                            ActivityCompat.requestPermissions(
                                MainActivity.this,
                                neededPermissions.toArray(new String[0]),
                                PERMISSION_REQ_CODE
                            );
                        } else {
                            request.grant(request.getResources());
                        }
                    }
                });
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQ_CODE && pendingWebPermissionRequest != null) {
            boolean allGranted = true;
            for (int res : grantResults) {
                if (res != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }
            if (allGranted) {
                pendingWebPermissionRequest.grant(pendingWebPermissionRequest.getResources());
            } else {
                pendingWebPermissionRequest.deny();
            }
            pendingWebPermissionRequest = null;
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        try {
            CookieManager.getInstance().flush();
        } catch (Exception ignored) {}
    }
}

