#!/bin/bash
export JAVA_HOME=/usr/local/Cellar/openjdk@17/17.0.16/libexec/openjdk.jdk/Contents/Home
echo "Building Mamalog APK locally..."
cd ~/Documents/projects/mamalog/apps/mobile

npx expo prebuild --platform android --clean || { echo "PREBUILD FAILED"; exit 1; }

cd android
./gradlew assembleRelease --no-daemon || { echo "GRADLE FAILED"; exit 1; }
cp app/build/outputs/apk/release/app-release.apk ~/Desktop/mamalog.apk
echo "Done! APK saved to ~/Desktop/mamalog.apk"
