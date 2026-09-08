#!/bin/sh
set -eu
umask 077

: "${PEOPLEOS_KEYSTORE_B64:?PEOPLEOS_KEYSTORE_B64 is required}"
: "${PEOPLEOS_KEYSTORE_PASSWORD:?PEOPLEOS_KEYSTORE_PASSWORD is required}"
: "${PEOPLEOS_KEY_PASSWORD:?PEOPLEOS_KEY_PASSWORD is required}"
: "${PEOPLEOS_KEY_ALIAS:=peopleos}"

KEY_FILE=/tmp/peopleos-release.jks
OUT_DIR=/usr/share/nginx/html
APK_FILE="$OUT_DIR/PeopleOS-v5.9.2-R12.apk"

mkdir -p "$OUT_DIR"
printf '%s' "$PEOPLEOS_KEYSTORE_B64" | base64 -d > "$KEY_FILE"

export PEOPLEOS_KEYSTORE_FILE="$KEY_FILE"
export PEOPLEOS_KEYSTORE_PASSWORD
export PEOPLEOS_KEY_PASSWORD
export PEOPLEOS_KEY_ALIAS

cd /app
gradle --no-daemon clean assembleRelease
cp app/build/outputs/apk/release/app-release.apk "$APK_FILE"
chmod 0644 "$APK_FILE"
rm -f "$KEY_FILE"
unset PEOPLEOS_KEYSTORE_B64 PEOPLEOS_KEYSTORE_PASSWORD PEOPLEOS_KEY_PASSWORD

echo "PeopleOS R12 APK ready"
exec nginx -g 'daemon off;'
