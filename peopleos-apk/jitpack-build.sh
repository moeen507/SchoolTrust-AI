#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# JitPack provides Android SDK. Ensure a compatible Gradle is selected.
if command -v sdk >/dev/null 2>&1; then
  sdk use gradle 8.9 >/dev/null 2>&1 || true
fi

GRADLE_BIN="$(command -v gradle || true)"
if [ -z "$GRADLE_BIN" ]; then
  echo "Gradle is not available in the JitPack environment." >&2
  exit 2
fi

"$GRADLE_BIN" --no-daemon clean :app:assembleRelease

APK="app/build/outputs/apk/release/app-release.apk"
if [ ! -s "$APK" ]; then
  echo "APK was not produced: $APK" >&2
  exit 3
fi

VERSION_VALUE="${VERSION:-${GIT_COMMIT:-5.9.2-R11}}"
GROUP_PATH="$HOME/.m2/repository/com/github/moeen507/SchoolTrust-AI/$VERSION_VALUE"
mkdir -p "$GROUP_PATH"
cp "$APK" "$GROUP_PATH/SchoolTrust-AI-$VERSION_VALUE.apk"

cat > "$GROUP_PATH/SchoolTrust-AI-$VERSION_VALUE.pom" <<POM
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.github.moeen507</groupId>
  <artifactId>SchoolTrust-AI</artifactId>
  <version>${VERSION_VALUE}</version>
  <packaging>apk</packaging>
  <name>PeopleOS v5.9.2 R11 Android APK</name>
</project>
POM

# Also copy to the repository build directory so JitPack's artifact scanner sees it.
mkdir -p build/jitpack-artifacts
cp "$APK" "build/jitpack-artifacts/PeopleOS-v5.9.2-R11.apk"

ls -lh "$APK" "$GROUP_PATH"/* build/jitpack-artifacts/*
