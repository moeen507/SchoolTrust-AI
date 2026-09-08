FROM eclipse-temurin:17-jdk AS build

ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=$PATH:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/gradle-8.9/bin

RUN apt-get update && apt-get install -y --no-install-recommends wget unzip ca-certificates && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/android-sdk/cmdline-tools \
    && wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdline-tools.zip \
    && unzip -q /tmp/cmdline-tools.zip -d /opt/android-sdk/cmdline-tools \
    && mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest \
    && yes | sdkmanager --licenses >/dev/null || true \
    && sdkmanager "platforms;android-35" "build-tools;35.0.0" "platform-tools"

RUN wget -q https://services.gradle.org/distributions/gradle-8.9-bin.zip -O /tmp/gradle.zip \
    && unzip -q /tmp/gradle.zip -d /opt

WORKDIR /app
COPY peopleos-apk/ .
RUN gradle --no-daemon clean assembleRelease \
    && mkdir -p /out \
    && cp app/build/outputs/apk/release/app-release.apk /out/PeopleOS-v5.9.2-R11.apk

FROM nginx:1.27-alpine
COPY --from=build /out/PeopleOS-v5.9.2-R11.apk /usr/share/nginx/html/PeopleOS-v5.9.2-R11.apk
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;

    location = /PeopleOS-v5.9.2-R11.apk {
        default_type application/vnd.android.package-archive;
        add_header Content-Disposition 'attachment; filename="PeopleOS-v5.9.2-R11.apk"' always;
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        add_header X-Content-Type-Options "nosniff" always;
        try_files $uri =404;
    }

    location / {
        return 302 /PeopleOS-v5.9.2-R11.apk;
    }
}
EOF
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
