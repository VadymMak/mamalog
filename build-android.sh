#!/bin/bash
echo "🔨 Building Mamalog — APK + AAB..."
cd ~/Documents/projects/mamalog/apps/mobile
npx expo prebuild --platform android --clean
cd android

export JAVA_HOME=/usr/local/Cellar/openjdk@17/17.0.16/libexec/openjdk.jdk/Contents/Home

echo "📦 Building APK (for local testing)..."
./gradlew assembleRelease --no-daemon

echo "📦 Building AAB (for Google Play)..."
./gradlew bundleRelease --no-daemon

echo "📋 Copying files to Desktop..."
cp app/build/outputs/apk/release/app-release.apk ~/Desktop/mamalog.apk
cp app/build/outputs/bundle/release/app-release.aab ~/Desktop/mamalog.aab

echo "✅ Done!"
echo "   APK → ~/Desktop/mamalog.apk (install on phone)"
echo "   AAB → ~/Desktop/mamalog.aab (upload to Google Play)"
