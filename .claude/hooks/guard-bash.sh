#!/bin/bash
# monban 固有の Bash 禁止ルール。
# 汎用ガード（force push to main / --no-verify / git config 改変）は okite プラグインの
# guard-bash が担当する。ここでは monban 固有の npx 禁止のみを扱う。
set -euo pipefail

INPUT=$(cat)

CMD=$(printf '%s' "$INPUT" | node -e '
let s = "";
process.stdin.on("data", (d) => (s += d));
process.stdin.on("end", () => {
  try {
    const j = JSON.parse(s);
    process.stdout.write(j.tool_input?.command ?? "");
  } catch {
    process.stdout.write("");
  }
});
')

deny() {
  echo "[guard-bash] $1" >&2
  echo "[guard-bash] command: $CMD" >&2
  exit 2
}

if [ -z "$CMD" ]; then
  exit 0
fi

if printf '%s' "$CMD" | grep -qE '(^|[^[:alnum:]_./-])npx([[:space:]]|$)'; then
  deny "npx is forbidden in this repository. Use 'npm run <script>' instead (e.g. 'npm run monban -- all')."
fi

exit 0
