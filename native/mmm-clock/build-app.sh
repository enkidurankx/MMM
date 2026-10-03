#!/bin/bash
# Builds MMMClock.app (ad-hoc signed) next to this script. Needs Xcode or the Command Line Tools.
set -euo pipefail
cd "$(dirname "$0")"
./fetch-link.sh
swift build -c release
APP=MMMClock.app
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
cp .build/release/MMMClock "$APP/Contents/MacOS/MMMClock"
# App icon (Dock / Finder): iconset PNGs in icon/ -> AppIcon.icns. Regenerate the PNGs with icon/make_icon.py.
mkdir -p "$APP/Contents/Resources"
if command -v iconutil >/dev/null && [ -d icon/AppIcon.iconset ]; then
  iconutil -c icns icon/AppIcon.iconset -o "$APP/Contents/Resources/AppIcon.icns"
fi
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>MMM Clock</string>
  <key>CFBundleDisplayName</key><string>MMM Clock</string>
  <key>CFBundleIdentifier</key><string>com.enkidurankx.mmm-clock</string>
  <key>CFBundleExecutable</key><string>MMMClock</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.2</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSPrincipalClass</key><string>NSApplication</string>
</dict></plist>
PLIST
codesign --force --sign - "$APP"
echo "Built $(pwd)/$APP"
