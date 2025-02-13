#!/bin/bash

# Build and install script for Mac

# Build the project
npm run build

# Sync capacitor
npx cap sync

# Build for Android
echo "Building for Android..."
cd android
./gradlew assembleDebug
cd ..

# Check for Android emulator
echo "Checking for Android emulator..."
EMULATOR_NAME=$(emulator -list-avds | head -n 1)

if [ -z "$EMULATOR_NAME" ]; then
    echo "No Android emulator found. Please create an emulator in Android Studio first."
    exit 1
fi

# Install on Android emulator
echo "Installing on Android emulator..."
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

echo "Build completed. App has been installed on the Android emulator."