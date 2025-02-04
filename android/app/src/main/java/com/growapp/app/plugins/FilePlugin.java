package com.growapp.app.plugins;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.util.Log;
import androidx.activity.result.ActivityResult;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.app.Activity;
import java.io.OutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import android.database.Cursor;
import android.provider.OpenableColumns;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "GrowAppFilePlugin",
    requestCodes = {
        FilePlugin.STORAGE_PERMISSION_CODE,
        FilePlugin.MANAGE_STORAGE_PERMISSION_CODE,
        FilePlugin.CREATE_FILE_CODE,
        FilePlugin.PICK_FILE_CODE
    }
)
public class FilePlugin extends Plugin {
    private static final String TAG = "GrowAppFilePlugin";
    public static final int STORAGE_PERMISSION_CODE = 1001;
    public static final int MANAGE_STORAGE_PERMISSION_CODE = 1002;
    public static final int CREATE_FILE_CODE = 1003;
    public static final int PICK_FILE_CODE = 1004;
    private PluginCall savedPermissionCall;
    private PluginCall savedFileCall;
    private PluginCall savedPickFileCall;
    private String pendingContent;
    private String pendingFileName;
    private String pendingMimeType;

    @Override
    public void load() {
        super.load();
        Log.d(TAG, "FilePlugin loaded with requestCodes: STORAGE=" + STORAGE_PERMISSION_CODE 
            + ", MANAGE=" + MANAGE_STORAGE_PERMISSION_CODE 
            + ", CREATE=" + CREATE_FILE_CODE 
            + ", PICK=" + PICK_FILE_CODE);
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        Log.d(TAG, "App resumed");
        // 检查是否有待处理的文件保存请求
        if (pendingContent != null && pendingFileName != null) {
            Log.d(TAG, "Resuming pending file save operation");
            saveFileInternal(pendingContent, pendingFileName, pendingMimeType);
            pendingContent = null;
            pendingFileName = null;
            pendingMimeType = null;
        }
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        Log.d(TAG, "App paused");
    }

    private void saveFileInternal(String content, String fileName, String mimeType) {
        Log.d(TAG, "Starting internal file save: " + fileName);
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType != null ? mimeType : "text/csv");
        intent.putExtra(Intent.EXTRA_TITLE, fileName);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | 
                       Intent.FLAG_GRANT_WRITE_URI_PERMISSION | 
                       Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);

        try {
            if (savedFileCall != null) {
                startActivityForResult(savedFileCall, intent, CREATE_FILE_CODE);
            } else {
                Log.e(TAG, "No saved call available for file save");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to open file picker", e);
            if (savedFileCall != null) {
                savedFileCall.reject("Failed to open file picker: " + e.getMessage(), e);
                savedFileCall = null;
            }
        }
    }

    @PluginMethod(returnType = PluginMethod.RETURN_PROMISE)
    public void saveFile(PluginCall call) {
        String content = call.getString("content");
        String fileName = call.getString("fileName");
        String childName = call.getString("childName", "未命名");
        String mimeType = call.getString("mimeType", "text/csv");

        if (content == null || fileName == null) {
            call.reject("Content and fileName are required");
            return;
        }

        // 确保文件名以.csv结尾
        if (!fileName.toLowerCase().endsWith(".csv")) {
            fileName = fileName + ".csv";
        }

        // 在内容开头添加儿童姓名，并确保格式统一
        content = "儿童姓名:" + childName + "\n" + content;

        Log.d(TAG, "Saving file: " + fileName + ", content length: " + content.length());
        Log.d(TAG, "Content preview: " + (content.length() > 100 ? content.substring(0, 100) + "..." : content));
        
        // 保存调用以便后续使用
        call.setKeepAlive(true);
        savedFileCall = call;
        
        // 保存参数以便恢复时使用
        pendingContent = content;
        pendingFileName = fileName;
        pendingMimeType = mimeType;

        saveFileInternal(content, fileName, mimeType);
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        Log.d(TAG, "handleOnActivityResult - requestCode: " + requestCode 
            + ", resultCode: " + resultCode 
            + ", data: " + (data != null ? data.toString() : "null"));
        
        super.handleOnActivityResult(requestCode, resultCode, data);
        
        if (requestCode == CREATE_FILE_CODE) {
            PluginCall savedCall = savedFileCall;
            
            if (savedCall == null) {
                Log.e(TAG, "No saved call found");
                return;
            }

            if (resultCode == Activity.RESULT_OK && data != null && data.getData() != null) {
                Uri uri = data.getData();
                try {
                    String content = pendingContent;
                    if (content == null) {
                        content = savedCall.getString("content");
                    }
                    if (content == null) {
                        throw new Exception("Content is null");
                    }
                    
                    Log.d(TAG, "Writing content length: " + content.length());
                    Log.d(TAG, "Content preview: " + (content.length() > 100 ? content.substring(0, 100) + "..." : content));
                    
                    OutputStream outputStream = null;
                    try {
                        // 获取持久性权限
                        final int takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
                        getContext().getContentResolver().takePersistableUriPermission(uri, takeFlags);
                        
                        outputStream = getContext().getContentResolver().openOutputStream(uri, "rwt");
                        if (outputStream == null) {
                            throw new Exception("Failed to open output stream");
                        }
                        
                        // 写入UTF-8 BOM
                        byte[] bom = new byte[]{(byte)0xEF, (byte)0xBB, (byte)0xBF};
                        outputStream.write(bom);
                        outputStream.flush();
                        Log.d(TAG, "Wrote BOM: " + bom.length + " bytes");
                        
                        // 写入内容
                        String normalizedContent = content.replace("\n", "\r\n"); // 确保使用Windows换行符
                        byte[] bytes = normalizedContent.getBytes("UTF-8");
                        Log.d(TAG, "Original content length: " + content.length());
                        Log.d(TAG, "Normalized content length: " + normalizedContent.length());
                        Log.d(TAG, "Content bytes length: " + bytes.length);
                        Log.d(TAG, "Content bytes: " + bytesToHex(bytes));
                        outputStream.write(bytes);
                        outputStream.flush();
                        
                        Log.d(TAG, "Successfully wrote " + bytes.length + " bytes");
                        
                        JSObject result = new JSObject();
                        result.put("uri", uri.toString());
                        result.put("bytesWritten", bytes.length + bom.length);
                        savedCall.resolve(result);
                        
                        Log.d(TAG, "File saved successfully to: " + uri.toString());
                    } finally {
                        if (outputStream != null) {
                            try {
                                outputStream.close();
                                Log.d(TAG, "Output stream closed successfully");
                            } catch (Exception e) {
                                Log.e(TAG, "Error closing stream", e);
                            }
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Failed to write file", e);
                    savedCall.reject("Failed to write file: " + e.getMessage(), e);
                }
            } else {
                Log.d(TAG, "User cancelled file save");
                savedCall.reject("User cancelled file save");
            }
            
            // 清理状态
            savedFileCall = null;
            pendingContent = null;
            pendingFileName = null;
            pendingMimeType = null;
        } else if (requestCode == MANAGE_STORAGE_PERMISSION_CODE && savedPermissionCall != null) {
            JSObject result = new JSObject();
            boolean isGranted = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && 
                              Environment.isExternalStorageManager();
            result.put("granted", isGranted);
            savedPermissionCall.resolve(result);
            savedPermissionCall = null;
            Log.d(TAG, "MANAGE_EXTERNAL_STORAGE result: " + isGranted);
        } else if (requestCode == PICK_FILE_CODE) {
            PluginCall savedCall = savedPickFileCall;
            
            if (savedCall == null) {
                Log.e(TAG, "No saved call found for file picker result");
                return;
            }

            try {
                if (resultCode == Activity.RESULT_OK && data != null && data.getData() != null) {
                    Uri uri = data.getData();
                    Log.d(TAG, "File picked with uri: " + uri.toString());
                    
                    // 获取持久化权限
                    final int takeFlags = data.getFlags() & Intent.FLAG_GRANT_READ_URI_PERMISSION;
                    getContext().getContentResolver().takePersistableUriPermission(uri, takeFlags);
                    
                    String path = uri.toString();
                    String name = getFileName(uri);
                    
                    Log.d(TAG, "Resolved file name: " + name);
                    Log.d(TAG, "File path: " + path);
                    
                    JSObject result = new JSObject();
                    result.put("path", path);
                    result.put("name", name);
                    savedCall.resolve(result);
                    Log.d(TAG, "Resolved call with result");
                } else {
                    Log.d(TAG, "File selection cancelled or no data returned");
                    savedCall.reject("File selection cancelled");
                }
            } catch (Exception e) {
                Log.e(TAG, "Error processing file picker result", e);
                savedCall.reject("Failed to process selected file: " + e.getMessage());
            } finally {
                bridge.releaseCall(savedCall.getCallbackId());
                savedPickFileCall = null;
            }
        }
    }

    @Override
    public boolean hasRequiredPermissions() {
        boolean hasPermissions;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            hasPermissions = Environment.isExternalStorageManager();
            Log.d(TAG, "Check required permissions (Android 11+): " + hasPermissions);
        } else {
            hasPermissions = hasPermission(Manifest.permission.READ_EXTERNAL_STORAGE) &&
                           hasPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE);
            Log.d(TAG, "Check required permissions (Android 10-): " + hasPermissions);
        }
        return hasPermissions;
    }

    @PluginMethod(returnType = PluginMethod.RETURN_PROMISE)
    public void checkPermissions(PluginCall call) {
        Log.d(TAG, "Checking permissions");
        JSObject result = new JSObject();
        boolean isGranted = false;
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            isGranted = Environment.isExternalStorageManager();
            Log.d(TAG, "Android 11+: isExternalStorageManager = " + isGranted);
        } else {
            boolean hasReadPermission = hasPermission(Manifest.permission.READ_EXTERNAL_STORAGE);
            boolean hasWritePermission = hasPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE);
            isGranted = hasReadPermission && hasWritePermission;
            Log.d(TAG, "Android 10-: hasReadPermission = " + hasReadPermission + ", hasWritePermission = " + hasWritePermission);
        }
        
        result.put("granted", isGranted);
        call.resolve(result);
        Log.d(TAG, "Permission check result: " + isGranted);
    }

    @PluginMethod(returnType = PluginMethod.RETURN_PROMISE)
    public void requestPermissions(PluginCall call) {
        Log.d(TAG, "Requesting permissions");
        savedPermissionCall = call;
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                try {
                    Log.d(TAG, "Requesting MANAGE_EXTERNAL_STORAGE permission");
                    Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                    Uri uri = Uri.fromParts("package", getActivity().getPackageName(), null);
                    intent.setData(uri);
                    startActivityForResult(call, intent, MANAGE_STORAGE_PERMISSION_CODE);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to request app-specific permission", e);
                    // 如果上面的意图失败，尝试使用通用设置
                    Intent intent = new Intent();
                    intent.setAction(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                    startActivityForResult(call, intent, MANAGE_STORAGE_PERMISSION_CODE);
                }
            } else {
                Log.d(TAG, "Already have MANAGE_EXTERNAL_STORAGE permission");
                JSObject result = new JSObject();
                result.put("granted", true);
                call.resolve(result);
            }
        } else {
            String[] permissions = {
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            };
            
            // 检查是否已经有权限
            boolean hasReadPermission = hasPermission(Manifest.permission.READ_EXTERNAL_STORAGE);
            boolean hasWritePermission = hasPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE);
            
            Log.d(TAG, "Current permissions: READ=" + hasReadPermission + ", WRITE=" + hasWritePermission);
            
            if (hasReadPermission && hasWritePermission) {
                Log.d(TAG, "Already have READ and WRITE permissions");
                JSObject result = new JSObject();
                result.put("granted", true);
                call.resolve(result);
                return;
            }
            
            Log.d(TAG, "Requesting READ and WRITE permissions");
            pluginRequestPermissions(permissions, STORAGE_PERMISSION_CODE);
        }
    }

    @Override
    protected void handleRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.handleRequestPermissionsResult(requestCode, permissions, grantResults);
        Log.d(TAG, "Handle permission result: requestCode=" + requestCode);

        if (savedPermissionCall == null) {
            Log.e(TAG, "No saved permission call");
            return;
        }

        JSObject result = new JSObject();

        if (requestCode == STORAGE_PERMISSION_CODE) {
            boolean allGranted = true;
            for (int i = 0; i < permissions.length; i++) {
                Log.d(TAG, "Permission " + permissions[i] + ": " + (grantResults[i] == PackageManager.PERMISSION_GRANTED));
                if (grantResults[i] != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }
            result.put("granted", allGranted);
            savedPermissionCall.resolve(result);
            savedPermissionCall = null;
            Log.d(TAG, "Permission result: " + allGranted);
        }
    }

    @PluginMethod(returnType = PluginMethod.RETURN_PROMISE)
    public void pickFile(PluginCall call) {
        Log.d(TAG, "pickFile method called with params: " + call.getData().toString());
        try {
            String type = call.getString("type", "*/*");
            String title = call.getString("title", "选择文件");
            
            Log.d(TAG, "Launching file picker with type: " + type + ", title: " + title);
            
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.setType(type);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"text/csv", "text/comma-separated-values"});
            intent.putExtra(Intent.EXTRA_LOCAL_ONLY, true);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
            
            // 保存 call
            call.setKeepAlive(true);
            bridge.saveCall(call);
            savedPickFileCall = call;
            
            startActivityForResult(call, intent, PICK_FILE_CODE);
            Log.d(TAG, "Successfully started activity for result");
        } catch (Exception e) {
            Log.e(TAG, "Error launching file picker", e);
            call.reject("Failed to launch file picker: " + e.getMessage());
        }
    }

    @PluginMethod(returnType = PluginMethod.RETURN_PROMISE)
    public void readFile(PluginCall call) {
        String path = call.getString("path");
        String encoding = call.getString("encoding", "utf8");
        
        if (path == null) {
            call.reject("Path is required");
            return;
        }
        
        try {
            Uri uri = Uri.parse(path);
            InputStream inputStream = getContext().getContentResolver().openInputStream(uri);
            if (inputStream == null) {
                call.reject("Failed to open file");
                return;
            }
            
            ByteArrayOutputStream result = new ByteArrayOutputStream();
            byte[] buffer = new byte[1024];
            int length;
            while ((length = inputStream.read(buffer)) != -1) {
                result.write(buffer, 0, length);
            }
            
            byte[] bytes = result.toByteArray();
            String content;
            
            if ("base64".equals(encoding)) {
                content = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP);
            } else {
                content = result.toString(encoding);
            }
            
            Log.d(TAG, "File read successfully, encoding: " + encoding + ", content length: " + content.length());
            
            inputStream.close();
            result.close();
            
            JSObject ret = new JSObject();
            ret.put("content", content);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to read file", e);
            call.reject("Failed to read file: " + e.getMessage(), e);
        }
    }

    private String getFileName(Uri uri) {
        String result = null;
        if (uri.getScheme().equals("content")) {
            try (Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (index >= 0) {
                        result = cursor.getString(index);
                    }
                }
            }
        }
        if (result == null) {
            result = uri.getPath();
            int cut = result.lastIndexOf('/');
            if (cut != -1) {
                result = result.substring(cut + 1);
            }
        }
        return result;
    }

    // 添加辅助方法用于调试
    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X ", b));
        }
        return sb.toString();
    }
} 