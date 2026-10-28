#!/bin/bash
# Собирает macOS-приложение «Interview Trainer.app» и кладёт ярлык на рабочий стол.
# Запуск: npm run make-app

set -euo pipefail

PROJECT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="Interview Trainer"
APP="$PROJECT/$APP_NAME.app"
DESKTOP="$HOME/Desktop"

echo "Проект: $PROJECT"

# ---------------------------------------------------------------- бандл
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

# Лаунчер: подставляем реальный путь к проекту
sed "s|__PROJECT_DIR__|$PROJECT|" "$PROJECT/scripts/launch.sh" > "$APP/Contents/MacOS/launcher"
chmod +x "$APP/Contents/MacOS/launcher"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>$APP_NAME</string>
  <key>CFBundleDisplayName</key><string>$APP_NAME</string>
  <key>CFBundleIdentifier</key><string>local.interview-trainer</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>launcher</string>
  <key>CFBundleIconFile</key><string>icon</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

# ---------------------------------------------------------------- иконка
ICONSET="$(mktemp -d)/icon.iconset"
mkdir -p "$ICONSET"
BASE="$(mktemp -d)/icon-1024.png"

echo "Рисую иконку…"
python3 "$PROJECT/scripts/make-icon.py" "$BASE" 1024 >/dev/null

for size in 16 32 64 128 256 512; do
  sips -z $size $size "$BASE" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null 2>&1
  double=$((size * 2))
  sips -z $double $double "$BASE" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null 2>&1
done
cp "$BASE" "$ICONSET/icon_512x512@2x.png"

iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/icon.icns"

# ---------------------------------------------------------------- ярлык
# Finder кеширует иконки по дате изменения бандла — трогаем его явно
touch "$APP"

rm -f "$DESKTOP/$APP_NAME.app" "$DESKTOP/$APP_NAME"
/usr/bin/osascript >/dev/null <<OSA
tell application "Finder"
  make new alias file at POSIX file "$DESKTOP" to POSIX file "$APP"
  set name of result to "$APP_NAME"
end tell
OSA

echo
echo "Готово:"
echo "  приложение — $APP"
echo "  ярлык      — $DESKTOP/$APP_NAME"
