#!/bin/zsh

set -euo pipefail

ROOT_DIR="${0:A:h:h}"
PROJECT_REF="${PROJECT_REF:-kozdctbbvrnyddlftmvf}"
SUPABASE_URL="${SUPABASE_URL:-https://${PROJECT_REF}.supabase.co}"
NODE_BIN="${NODE_BIN:-/opt/homebrew/opt/node@20/bin/node}"
REPORT_DIR="${ROOT_DIR}/reports"
LOCAL_BACKUP_ROOT="${LOCAL_BACKUP_ROOT:-${ROOT_DIR}/tmp/legacy-asset-backup}"
KEYS_FILE="$(mktemp)"

cleanup() {
  rm -f "${KEYS_FILE}"
}
trap cleanup EXIT INT TERM

cd "${ROOT_DIR}"
mkdir -p "${REPORT_DIR}"

if [[ ! -x "${NODE_BIN}" ]]; then
  print -u2 "Node 20 was not found at ${NODE_BIN}. Set NODE_BIN to a Node 20 executable."
  exit 1
fi

# The authenticated CLI reveals the server key only into a protected temporary
# file. The key is exported to this process and is never printed or persisted.
npx supabase@latest projects api-keys \
  --project-ref "${PROJECT_REF}" \
  --reveal \
  --output-format json >"${KEYS_FILE}"

export SUPABASE_URL
export SUPABASE_SERVICE_ROLE_KEY="$(jq -er '.keys[] | select(.type == "secret") | .api_key' "${KEYS_FILE}" | head -1)"

for pass in 1 2 3; do
  report="${REPORT_DIR}/legacy-asset-migration-pass-${pass}.json"
  print "[assets-runner] starting pass ${pass}"
  "${NODE_BIN}" node_modules/tsx/dist/cli.mjs scripts/migrate-legacy-assets.ts \
    --project-ref "${PROJECT_REF}" \
    --apply \
    --all \
    --checkpoint-size 1000 \
    --concurrency 12 \
    --update-concurrency 15 \
    --local-backup-root "${LOCAL_BACKUP_ROOT}" \
    --report "${report}"

  failed="$(jq -r '.failed // 0' "${report}")"
  print "[assets-runner] pass ${pass} completed with ${failed} failed assets"
  if [[ "${failed}" == "0" ]]; then
    break
  fi
done

"${NODE_BIN}" node_modules/tsx/dist/cli.mjs scripts/migrate-legacy-assets.ts \
  --project-ref "${PROJECT_REF}" \
  --report "${REPORT_DIR}/legacy-asset-inventory-final.json"

print "[assets-runner] migration and final inventory completed"
