#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# robu-setup-autopull.sh — run this ONCE on each laptop to install the 6AM auto-pull
# Usage: bash robu-setup-autopull.sh [path-to-repo]
# Example: bash robu-setup-autopull.sh ~/Developer/robu-valuation-next
# ─────────────────────────────────────────────────────────────────────────────

set -e

REPO_DIR="${1:-$HOME/robu-valuation-next}"
SCRIPT_DST="$REPO_DIR/robu-autopull.sh"
PLIST_DST="$HOME/Library/LaunchAgents/com.robu.autopull.plist"
LOG_FILE="$HOME/.robu-autopull.log"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ROBU Auto-Pull Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Repo path : $REPO_DIR"
echo "Script    : $SCRIPT_DST"
echo "Plist     : $PLIST_DST"
echo "Log       : $LOG_FILE"
echo ""

# Verify repo exists
if [ ! -d "$REPO_DIR/.git" ]; then
  echo "ERROR: $REPO_DIR is not a git repo."
  echo "Clone it first: git clone https://github.com/rohitbhutra26-bit/robu-valuation-next.git $REPO_DIR"
  exit 1
fi

# Write the pull script into the repo folder
cat > "$SCRIPT_DST" << SHEOF
#!/bin/bash
REPO_DIR="$REPO_DIR"
LOG_FILE="$LOG_FILE"
TIMESTAMP=\$(date '+%Y-%m-%d %H:%M:%S')
log() { echo "[\$TIMESTAMP] \$1" >> "\$LOG_FILE"; }

if [ ! -d "\$REPO_DIR/.git" ]; then log "ERROR: not a git repo"; exit 1; fi
cd "\$REPO_DIR" || exit 1
git fetch origin main --quiet 2>&1
LOCAL=\$(git rev-parse HEAD)
REMOTE=\$(git rev-parse origin/main)
if [ "\$LOCAL" = "\$REMOTE" ]; then log "Up-to-date (\$LOCAL)"; exit 0; fi
log "Pulling \$LOCAL → \$REMOTE"
git pull origin main --ff-only
CHANGED=\$(git diff --name-only "\$LOCAL" HEAD)
log "Changed: \$CHANGED"
log "Done — \$(git log -1 --format='%s')"
SHEOF
chmod +x "$SCRIPT_DST"
echo "✓ Pull script written to $SCRIPT_DST"

# Write LaunchAgent plist
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST_DST" << PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.robu.autopull</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$SCRIPT_DST</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key><integer>6</integer>
        <key>Minute</key><integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>$LOG_FILE</string>
    <key>StandardErrorPath</key>
    <string>$LOG_FILE</string>
    <key>KeepAlive</key><false/>
    <key>RunAtLoad</key><false/>
</dict>
</plist>
PLISTEOF
echo "✓ LaunchAgent plist written"

# Load it
launchctl unload "$PLIST_DST" 2>/dev/null || true
launchctl load "$PLIST_DST"
echo "✓ LaunchAgent loaded — will run daily at 6:00 AM"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Setup complete!"
echo "  Test now:  bash $SCRIPT_DST"
echo "  View log:  cat $LOG_FILE"
echo "  Uninstall: launchctl unload $PLIST_DST && rm $PLIST_DST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
