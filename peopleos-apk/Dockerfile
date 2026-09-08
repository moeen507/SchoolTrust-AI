FROM eclipse-temurin:17-jdk

ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=$PATH:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/gradle-8.9/bin

RUN apt-get update \
    && apt-get install -y --no-install-recommends wget unzip ca-certificates coreutils nginx nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/android-sdk/cmdline-tools \
    && wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdline-tools.zip \
    && unzip -q /tmp/cmdline-tools.zip -d /opt/android-sdk/cmdline-tools \
    && mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest \
    && yes | sdkmanager --licenses >/dev/null || true \
    && sdkmanager "platforms;android-35" "build-tools;35.0.0" "platform-tools" \
    && rm -f /tmp/cmdline-tools.zip

RUN wget -q https://services.gradle.org/distributions/gradle-8.9-bin.zip -O /tmp/gradle.zip \
    && unzip -q /tmp/gradle.zip -d /opt \
    && rm -f /tmp/gradle.zip

WORKDIR /app
COPY peopleos-apk/ .

RUN node --check app/src/main/assets/peopleos-l10n-r17.js \
    && node --check app/src/main/assets/peopleos-ai-r17.js \
    && gradle --no-daemon clean assembleRelease \
    && mkdir -p /opt/peopleos \
    && cp app/build/outputs/apk/release/app-release-unsigned.apk /opt/peopleos/PeopleOS-v5.9.2-R17-unsigned.apk \
    && test -s /opt/peopleos/PeopleOS-v5.9.2-R17-unsigned.apk \
    && chmod 0755 /app/runtime-build.sh \
    && mkdir -p /usr/share/nginx/html \
    && rm -f /etc/nginx/sites-enabled/default \
    && cat > /etc/nginx/conf.d/peopleos.conf <<'EOF'
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;

    location = /PeopleOS-v5.9.2-R17.apk {
        default_type application/vnd.android.package-archive;
        add_header Content-Disposition 'attachment; filename="PeopleOS-v5.9.2-R17.apk"' always;
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        add_header X-Content-Type-Options "nosniff" always;
        try_files $uri =404;
    }

    location / {
        return 302 /PeopleOS-v5.9.2-R17.apk;
    }
}
EOF

EXPOSE 8080
CMD ["/app/runtime-build.sh"]
