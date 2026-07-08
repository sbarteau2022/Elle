#!/bin/bash
# ============================================================
# Elle — reset & launch. The "nuke it and go" button for the workbench.
#
# Wipes the local clone, pulls a fresh copy from GitHub, npm installs, and
# launches `electron:dev`. This is the source of truth the desktop icon
# (scripts/make-desktop-icon.sh) bakes into a double-clickable .app — keep
# any behavior changes HERE, not in the .app builder.
#
# Safety, because "clear the folder" is otherwise a great way to eat real
# work by accident:
#   - refuses to wipe if the existing clone has uncommitted/untracked
#     changes (commit or stash them, or pass --force to discard anyway)
#   - clones into a sibling temp dir first and swaps it in only once the
#     clone succeeds — a failed clone never touches your working copy
#   - .env / .env.local are gitignored (they hold ELLE_SANDBOX_KEY etc.)
#     and would otherwise be silently destroyed; they're carried over
# ============================================================
set -euo pipefail

REPO_URL="${ELLE_REPO_URL:-https://github.com/sbarteau2022/Elle.git}"
TARGET_DIR="${ELLE_APP_DIR:-$HOME/Elle}"
FORCE=0
for a in "$@"; do [ "$a" = "--force" ] && FORCE=1; done

echo "== Elle: reset & launch =="
echo "target: $TARGET_DIR"

if [ -d "$TARGET_DIR/.git" ]; then
  cd "$TARGET_DIR"
  dirty="$(git status --porcelain 2>/dev/null || true)"
  if [ -n "$dirty" ]; then
    echo ""
    echo "REFUSING TO RESET — uncommitted or untracked changes in $TARGET_DIR:"
    echo "$dirty"
    if [ "$FORCE" -ne 1 ]; then
      echo ""
      echo "Commit or stash them first, or re-run with --force to discard them."
      exit 1
    fi
    echo "(--force given: discarding the above)"
  fi
  cd - >/dev/null
fi

BACKUP_DIR="$(mktemp -d)"
for f in .env .env.local; do
  if [ -f "$TARGET_DIR/$f" ]; then
    cp "$TARGET_DIR/$f" "$BACKUP_DIR/$f"
    echo "preserved $f"
  fi
done

FRESH_DIR="$(mktemp -d "${TARGET_DIR}.fresh.XXXXXX" 2>/dev/null || echo "${TARGET_DIR}.fresh.$$")"
echo "cloning $REPO_URL ..."
# git clone accepts an existing EMPTY directory (what mktemp -d just made);
# the plain-string fallback path doesn't exist yet, which clone also accepts.
git clone "$REPO_URL" "$FRESH_DIR"

for f in .env .env.local; do
  [ -f "$BACKUP_DIR/$f" ] && cp "$BACKUP_DIR/$f" "$FRESH_DIR/$f"
done
rm -rf "$BACKUP_DIR"

if [ -d "$TARGET_DIR" ]; then
  OLD_DIR="${TARGET_DIR}.old.$$"
  mv "$TARGET_DIR" "$OLD_DIR"
  rm -rf "$OLD_DIR"
fi
mv "$FRESH_DIR" "$TARGET_DIR"

cd "$TARGET_DIR"
echo "npm install ..."
npm install

echo "launching electron:dev ..."
exec npm run electron:dev
