package com.growapp.app;

import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PluginCall;
import com.getcapacitor.JSObject;

@CapacitorPlugin(name = "Permissions")
public class PermissionsPlugin extends Plugin {
    private static final int PERMISSION_REQUEST_CODE = 123;

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (ContextCompat.checkSelfPermission(getActivity(), Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(getActivity(), Manifest.permission.READ_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED) {

                ActivityCompat.requestPermissions(getActivity(),
                    new String[]{
                        Manifest.permission.WRITE_EXTERNAL_STORAGE,
                        Manifest.permission.READ_EXTERNAL_STORAGE
                    },
                    PERMISSION_REQUEST_CODE);
            } else {
                JSObject ret = new JSObject();
                ret.put("granted", true);
                call.resolve(ret);
                notifyPermissionResult(true);
            }
            saveCall(call);
        });
    }

    @Override
    protected void handleRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.handleRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            
            PluginCall savedCall = getSavedCall();
            if (savedCall != null) {
                JSObject ret = new JSObject();
                ret.put("granted", granted);
                savedCall.resolve(ret);
            }
            
            notifyPermissionResult(granted);
        }
    }

    private void notifyPermissionResult(boolean granted) {
        JSObject data = new JSObject();
        data.put("granted", granted);
        notifyListeners("permissionResult", data);
        getBridge().triggerWindowJSEvent("permissionResult", "{ \"granted\": " + granted + " }");
    }
}
