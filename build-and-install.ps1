# Set UTF-8 encoding
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

# 构建Vue项目
Write-Host "1. Building Vue project..."
npm run build

# 同步到Android项目
Write-Host "2. Syncing to Android project..."
npx cap sync android

# 构建APK
Write-Host "3. Building APK..."
Set-Location android
./gradlew assembleDebug
Set-Location ..

Write-Host "4. Checking emulator status..."
$devices = & adb devices | Select-Object -Skip 1
if ($devices.Count -eq 0) {
    Write-Host "No emulator found. Please start an Android emulator first."
    exit 1
}

Write-Host "5. Installing to emulator..."
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

Write-Host "Build and install completed!" 