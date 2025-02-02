package com.growapp.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.DocumentsContract;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.documentfile.provider.DocumentFile;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "GrowApp")
public class GrowAppPlugin extends Plugin {
    private static final int PERMISSION_REQUEST_CODE = 12345;
    private PluginCall savedCall;

    @PluginMethod
    public void requestStoragePermission(PluginCall call) {
        savedCall = call;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                    Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
                    intent.setData(uri);
                    startActivityForResult(call, intent, "handleManageStorageResult");
                    return;
                } catch (Exception e) {
                    try {
                        Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                        startActivityForResult(call, intent, "handleManageStorageResult");
                        return;
                    } catch (Exception e2) {
                        JSObject ret = new JSObject();
                        ret.put("granted", false);
                        ret.put("error", e2.getMessage());
                        call.resolve(ret);
                        return;
                    }
                }
            } else {
                JSObject ret = new JSObject();
                ret.put("granted", true);
                call.resolve(ret);
                return;
            }
        }

        // 检查基本存储权限
        String[] permissions = {
            Manifest.permission.READ_EXTERNAL_STORAGE,
            Manifest.permission.WRITE_EXTERNAL_STORAGE
        };

        List<String> permissionsToRequest = new ArrayList<>();
        for (String permission : permissions) {
            if (ContextCompat.checkSelfPermission(getContext(), permission) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(permission);
            }
        }

        if (permissionsToRequest.isEmpty()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        ActivityCompat.requestPermissions(
            getActivity(),
            permissionsToRequest.toArray(new String[0]),
            PERMISSION_REQUEST_CODE
        );
    }

    @ActivityCallback
    private void handleManageStorageResult(PluginCall call, ActivityResult result) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            JSObject ret = new JSObject();
            ret.put("granted", Environment.isExternalStorageManager());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void pickDirectory(PluginCall call) {
        savedCall = call;
        
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION |
            Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
            Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION |
            Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
        );
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent.putExtra(DocumentsContract.EXTRA_INITIAL_URI, 
                Uri.parse("content://com.android.externalstorage.documents/document/primary%3A"));
        }
        
        startActivityForResult(call, intent, "handleDirectoryPickerResult");
    }

    @ActivityCallback
    private void handleDirectoryPickerResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        if (result.getResultCode() == android.app.Activity.RESULT_OK && result.getData() != null) {
            Intent data = result.getData();
            Uri treeUri = data.getData();
            
            try {
                final int takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
                getContext().getContentResolver().takePersistableUriPermission(treeUri, takeFlags);
                
                DocumentFile pickedDir = DocumentFile.fromTreeUri(getContext(), treeUri);
                
                if (pickedDir != null && pickedDir.canWrite()) {
                    JSObject ret = new JSObject();
                    ret.put("path", treeUri.toString());
                    ret.put("name", pickedDir.getName());
                    call.resolve(ret);
                } else {
                    call.reject("无法写入所选目录");
                }
            } catch (Exception e) {
                call.reject("获取目录权限失败: " + e.getMessage());
            }
        } else {
            call.reject("用户取消了选择");
        }
    }

    @Override
    protected void handleRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.handleRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == PERMISSION_REQUEST_CODE && savedCall != null) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }

            JSObject ret = new JSObject();
            ret.put("granted", allGranted);
            savedCall.resolve(ret);
            savedCall = null;
        }
    }
} 