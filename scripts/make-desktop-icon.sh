#!/bin/bash
# ============================================================
# Elle — build the desktop "Reset & Launch" icon (macOS only).
#
# Run this locally on the Mac that will host the shortcut. It bundles
# scripts/reset-and-launch.sh + electron/branding/icon.icns into a real,
# double-clickable .app and drops it on the Desktop (or wherever DEST
# points). The .app is fully self-contained — the reset logic is baked in
# at build time, so wiping/re-cloning ~/Elle at run time never touches the
# icon that triggered it. Re-run this script whenever reset-and-launch.sh
# changes, to refresh the icon with the latest logic.
#
# Usage:
#   bash scripts/make-desktop-icon.sh                  # -> ~/Desktop
#   DEST="$HOME/Applications" bash scripts/make-desktop-icon.sh
# ============================================================
set -euo pipefail

if [ "$(uname)" != "Darwin" ]; then
  echo "make-desktop-icon.sh builds a macOS .app bundle — this isn't macOS." >&2
  exit 1
fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGIC="$HERE/scripts/reset-and-launch.sh"
ICON="$HERE/electron/branding/icon.icns"
DEST="${DEST:-$HOME/Desktop}"
APP="$DEST/Elle Reset & Launch.app"

[ -f "$LOGIC" ] || { echo "missing $LOGIC" >&2; exit 1; }
[ -f "$ICON" ]  || { echo "missing $ICON — run: node electron/branding/make-icns.cjs" >&2; exit 1; }

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Elle Reset &amp; Launch</string>
  <key>CFBundleDisplayName</key><string>Elle Reset &amp; Launch</string>
  <key>CFBundleIdentifier</key><string>com.sbarteau.elle.reset-launch</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>launcher</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>10.13</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

cp "$ICON" "$APP/Contents/Resources/AppIcon.icns"

{
  echo '#!/bin/bash'
  echo '# Double-clicked via Finder: not attached to a terminal yet — relaunch'
  echo '# this same executable inside Terminal.app so the reset/clone/install/'
  echo '# launch output is actually visible, then get out of the way.'
  echo 'if [ ! -t 1 ]; then'
  echo '  osascript <<OSA'
  echo 'tell application "Terminal"'
  echo '  activate'
  echo '  do script "\"$0\""'
  echo 'end tell'
  echo 'OSA'
  echo '  exit 0'
  echo 'fi'
  echo ''
  echo '# Now running inside Terminal, attached to a tty — do the real work.'
  echo '# (embedded verbatim from scripts/reset-and-launch.sh at build time,'
  echo '# so this .app never depends on the repo it is about to wipe/reclone)'
  tail -n +2 "$LOGIC"   # drop the shebang line — we already wrote our own above
} > "$APP/Contents/MacOS/launcher"
chmod +x "$APP/Contents/MacOS/launcher"

echo "built: $APP"
echo "First launch needs one manual step (unsigned app, Gatekeeper):"
echo "  right-click the icon -> Open -> Open. After that, double-click works normally."
