package com.zanhub.pro

import android.os.Bundle
import android.webkit.WebView
import org.apache.cordova.CordovaActivity

class MainActivity : CordovaActivity() {
    public override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val extras = intent.extras
        if (extras != null && extras.getBoolean("cdvStartInBackground", false)) {
            moveTaskToBack(true)
        }

        loadUrl(launchUrl)
        
        // --- JEMBATAN KOTLIN KE JAVASCRIPT ---
        // Mengambil engine webview dari Cordova
        val webView = appView.engine.view as WebView
        
        // Mendaftarkan class Scraper dengan nama "NativeAnichin" di JS
        webView.addJavascriptInterface(AnichinScraper(), "NativeAnichin")
    }
}