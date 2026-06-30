@echo off
REM ============================================================
REM patch-android.bat — Full fix: prebuild → patch → build
REM ============================================================
cd /d "%~dp0"

echo === Step 1: Regenerate native files ===
call npx expo prebuild --clean

echo.
echo === Step 2: PATCH android/build.gradle (SDK 34, BEFORE plugin) ===
(
echo // Top-level build file where you can add configuration options common to all sub-projects/modules.
echo.
echo // Set SDK versions BEFORE Expo plugin applies - plugin uses setIfNotExist
echo // so it will skip these if we define them first, forcing SDK 34
echo rootProject.ext.buildToolsVersion = "35.0.0"
echo rootProject.ext.minSdkVersion = 24
echo rootProject.ext.compileSdkVersion = 34
echo rootProject.ext.targetSdkVersion = 34
echo rootProject.ext.ndkVersion = "27.1.12297006"
echo.
echo buildscript {
echo   repositories {
echo     google()
echo     mavenCentral()
echo   }
echo   dependencies {
echo     classpath('com.android.tools.build:gradle')
echo     classpath('com.facebook.react:react-native-gradle-plugin')
echo     classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
echo   }
echo }
echo.
echo allprojects {
echo   repositories {
echo     google()
echo     mavenCentral()
echo     maven { url 'https://www.jitpack.io' }
echo   }
echo }
echo.
echo apply plugin: "expo-root-project"
echo apply plugin: "com.facebook.react.rootproject"
) > android\build.gradle

echo.
echo === Step 3: PATCH android/app/build.gradle (hardcode SDK 34) ===
powershell -Command "$f='android\app\build.gradle'; $c=Get-Content $f; $c=$c -replace '(?m)^\s*compileSdk\s+\d+', 'compileSdk 34'; $c=$c -replace '(?m)^\s*minSdk(?:Version)?\s+\d+', 'minSdk 24'; $c=$c -replace '(?m)^\s*targetSdk(?:Version)?\s+\d+', 'targetSdk 34'; $c=$c -replace '(?m)^\s*buildToolsVersion.*', 'buildToolsVersion \"35.0.0\"'; Set-Content $f $c"

echo.
echo === Step 4: Clear stale Gradle cache for core-1.16.0 ===
if exist "%USERPROFILE%\.gradle\caches\8.14.3\transforms" (
    for /d %%d in ("%USERPROFILE%\.gradle\caches\8.14.3\transforms\*") do (
        if exist "%%d\transformed\core-1.16.0" rmdir /s /q "%%d" 2>nul
    )
)

echo.
echo === Step 5: Build ===
cd android
gradlew clean
gradlew app:installDebug
pause
