# 构建Vue项目
Write-Host "构建Vue项目..." -ForegroundColor Green
npm run build

# 同步到Android项目
Write-Host "同步到Android项目..." -ForegroundColor Green
npx cap sync

# 构建APK
Write-Host "构建APK..." -ForegroundColor Green
Set-Location android
./gradlew assembleDebug

# 安装到模拟器
Write-Host "安装到模拟器..." -ForegroundColor Green
adb install -r app/build/outputs/apk/debug/app-debug.apk

# 返回项目根目录
Set-Location .. 