package com.livroponto.digital;

import android.app.*;
import android.os.*;
import android.content.*;
import android.net.Uri;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.Settings;
import android.webkit.*;
import android.widget.Toast;
import java.io.*;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private WebView web;
    private static final int OPEN_BACKUP = 2001;

    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        web = new WebView(this);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setBuiltInZoomControls(false);
        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView v, String url) {
                v.evaluateJavascript("" +
                  "window.desktopAPI={" +
                  "saveBackup:async d=>JSON.parse(AndroidBridge.saveBackup(JSON.stringify(d)))," +
                  "exportCSV:async c=>JSON.parse(AndroidBridge.exportCSV(c))," +
                  "printPDF:async()=>{AndroidBridge.printPDF();return {ok:true}}," +
                  "loadBackup:()=>new Promise(r=>{window.__backupResolve=r;AndroidBridge.loadBackup();})" +
                  "};", null);
            }
        });
        web.loadUrl("file:///android_asset/index.html");
    }

    public class Bridge {
        @JavascriptInterface public String saveBackup(String json) {
            return saveText("livro-de-ponto-backup-" + System.currentTimeMillis() + ".json", json, "application/json");
        }
        @JavascriptInterface public String exportCSV(String csv) {
            return saveText("relatorio-ponto-" + System.currentTimeMillis() + ".csv", "\uFEFF" + csv, "text/csv");
        }
        private String saveText(String name, String text, String mime) {
            try {
                if (Build.VERSION.SDK_INT >= 29) {
                    android.content.ContentValues v = new android.content.ContentValues();
                    v.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, name);
                    v.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, mime);
                    v.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, android.os.Environment.DIRECTORY_DOWNLOADS);
                    Uri u = getContentResolver().insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    try(OutputStream o=getContentResolver().openOutputStream(u)){o.write(text.getBytes(StandardCharsets.UTF_8));}
                } else {
                    File f = new File(getExternalFilesDir(android.os.Environment.DIRECTORY_DOWNLOADS), name);
                    try(OutputStream o=new FileOutputStream(f)){o.write(text.getBytes(StandardCharsets.UTF_8));}
                }
                runOnUiThread(()->Toast.makeText(MainActivity.this,"Arquivo salvo em Downloads",Toast.LENGTH_LONG).show());
                return "{\"ok\":true}";
            } catch(Exception e) { return "{\"ok\":false}"; }
        }
        @JavascriptInterface public void loadBackup() {
            runOnUiThread(()->{
                Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT); i.setType("application/json"); i.addCategory(Intent.CATEGORY_OPENABLE); startActivityForResult(i,OPEN_BACKUP);
            });
        }
        @JavascriptInterface public void printPDF() {
            runOnUiThread(()->{
                PrintManager pm=(PrintManager)getSystemService(PRINT_SERVICE);
                pm.print("Relatório Livro de Ponto",web.createPrintDocumentAdapter("Livro de Ponto"),new PrintAttributes.Builder().build());
            });
        }
    }

    @Override protected void onActivityResult(int req,int result,Intent data) {
        super.onActivityResult(req,result,data);
        if(req==OPEN_BACKUP){
            if(result!=RESULT_OK || data==null){ web.evaluateJavascript("window.__backupResolve&&window.__backupResolve({ok:false})",null); return; }
            try(InputStream in=getContentResolver().openInputStream(data.getData())){
                ByteArrayOutputStream out=new ByteArrayOutputStream(); byte[] buf=new byte[8192]; int n; while((n=in.read(buf))>0) out.write(buf,0,n);
                String json=out.toString("UTF-8");
                String encoded=android.util.Base64.encodeToString(json.getBytes(StandardCharsets.UTF_8),android.util.Base64.NO_WRAP);
                web.evaluateJavascript("window.__backupResolve({ok:true,data:JSON.parse(decodeURIComponent(escape(atob('"+encoded+"'))))})",null);
            }catch(Exception e){ web.evaluateJavascript("window.__backupResolve({ok:false})",null); }
        }
    }

    @Override public void onBackPressed() { if(web.canGoBack()) web.goBack(); else super.onBackPressed(); }
}
