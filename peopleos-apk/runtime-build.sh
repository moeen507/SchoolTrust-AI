#!/bin/sh
set -eu
umask 077

: "${PEOPLEOS_KEYSTORE_B64:?PEOPLEOS_KEYSTORE_B64 is required}"
: "${PEOPLEOS_KEYSTORE_PASSWORD:?PEOPLEOS_KEYSTORE_PASSWORD is required}"
: "${PEOPLEOS_KEY_PASSWORD:?PEOPLEOS_KEY_PASSWORD is required}"
: "${PEOPLEOS_KEY_ALIAS:=peopleos}"

KEY_FILE=/tmp/peopleos-release.jks
UNSIGNED_APK=/opt/peopleos/PeopleOS-v5.9.2-R18-unsigned.apk
OUT_DIR=/usr/share/nginx/html
APK_FILE="$OUT_DIR/PeopleOS-v5.9.2-R18.apk"
APKSIGNER=/opt/android-sdk/build-tools/35.0.0/apksigner

mkdir -p "$OUT_DIR"
test -s "$UNSIGNED_APK"
test -x "$APKSIGNER"
printf '%s' "$PEOPLEOS_KEYSTORE_B64" | base64 -d > "$KEY_FILE"

export PEOPLEOS_KEYSTORE_PASSWORD PEOPLEOS_KEY_PASSWORD
"$APKSIGNER" sign \
  --ks "$KEY_FILE" \
  --ks-key-alias "$PEOPLEOS_KEY_ALIAS" \
  --ks-pass env:PEOPLEOS_KEYSTORE_PASSWORD \
  --key-pass env:PEOPLEOS_KEY_PASSWORD \
  --out "$APK_FILE" \
  "$UNSIGNED_APK"

"$APKSIGNER" verify --verbose "$APK_FILE"
chmod 0644 "$APK_FILE"
rm -f "$KEY_FILE"
unset PEOPLEOS_KEYSTORE_B64 PEOPLEOS_KEYSTORE_PASSWORD PEOPLEOS_KEY_PASSWORD

echo "PeopleOS R18 APK ready"
exec nginx -g 'daemon off;'
