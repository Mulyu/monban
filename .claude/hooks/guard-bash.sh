#!/bin/bash
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

if printf '%s' "$CMD" | grep -qE '(^|[[:space:]])git[[:space:]]+push'; then
  if printf '%s' "$CMD" | grep -qE '(--force([[:space:]]|=|$)|(^|[[:space:]])-f([[:space:]]|$)|--force-with-lease)'; then
    if printf '%s' "$CMD" | grep -qE '(^|[[:space:]/:])(main|master)([[:space:]]|$)'; then
      deny "Force push to main/master is forbidden."
    fi
  fi
fi

if printf '%s' "$CMD" | grep -qE '(^|[[:space:]])--no-verify([[:space:]]|=|$)'; then
  deny "--no-verify is forbidden. Investigate hook failures instead of bypassing them."
fi

if printf '%s' "$CMD" | grep -qE '(^|[[:space:]])git[[:space:]]+config([[:space:]]|$)'; then
  if ! printf '%s' "$CMD" | grep -qE '(^|[[:space:]])git[[:space:]]+config[[:space:]]+(--get|--list|-l|--show-origin|--show-scope)([[:space:]]|$)'; then
    deny "Modifying git config is forbidden in this session."
  fi
fi

exit 0
