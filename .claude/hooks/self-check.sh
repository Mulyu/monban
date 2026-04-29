#!/bin/bash
set -uo pipefail

cd "$CLAUDE_PROJECT_DIR"

if [ -n "${CLAUDE_SELF_CHECK_SKIP:-}" ]; then
  exit 0
fi

if [ ! -f dist/bin.mjs ]; then
  exit 0
fi

BASE=""
for ref in origin/main main origin/master master; do
  if git rev-parse --verify "$ref" >/dev/null 2>&1; then
    BASE=$(git merge-base HEAD "$ref" 2>/dev/null || true)
    [ -n "$BASE" ] && break
  fi
done

if [ -z "$BASE" ]; then
  exit 0
fi

if git diff --quiet "$BASE" -- && git diff --quiet --cached -- && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  exit 0
fi

OUTPUT=$(npm run --silent monban -- all --diff="$BASE" 2>&1)
EXIT=$?

if [ "$EXIT" -ne 0 ]; then
  {
    echo "[self-check] monban detected violations on the diff against $BASE."
    echo "[self-check] Fix them before completing the turn, or set CLAUDE_SELF_CHECK_SKIP=1 to skip."
    echo "---"
    echo "$OUTPUT"
  } >&2
  exit 2
fi

exit 0
