# PowerShell UTF-8 Configuration
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

# Stop on error
$ErrorActionPreference = "Stop"

try {
    Write-Host "=== Build Process Started ===" -ForegroundColor Cyan
    
    Write-Host "[1/5] Building Web Application" -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Web build failed" }
    
    Write-Host "[2/5] Syncing to Android Project" -ForegroundColor Yellow
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw "Android sync failed" }
    
    Write-Host "[3/5] Building Android APK" -ForegroundColor Yellow
    Set-Location android
    ./gradlew assembleDebug
    if ($LASTEXITCODE -ne 0) { throw "Android build failed" }
    
    Write-Host "[4/5] Checking Device Connection" -ForegroundColor Yellow
    $devices = & adb devices | Select-Object -Skip 1 | Where-Object { $_ -match '\w+' }
    if ($devices.Count -eq 0) { throw "No Android device found" }
    
    Write-Host "[5/5] Installing to Device" -ForegroundColor Yellow
    & adb install -r "app/build/outputs/apk/debug/app-debug.apk"
    if ($LASTEXITCODE -ne 0) { throw "App installation failed" }
    
    Set-Location ..
    Write-Host "=== Build and Install Completed ===" -ForegroundColor Green
} catch {
    Write-Host "=== Error ===" -ForegroundColor Red
    Write-Host $_ -ForegroundColor Red
    exit 1
} 