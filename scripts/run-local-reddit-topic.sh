#!/usr/bin/env bash
set -euo pipefail

readonly project_dir="/data/project/side/pythonparsing"
readonly community="${1:-}"

case "$community" in
  Frontend|SideProject|ChatGPT|ObsidianMD) ;;
  *)
    echo "Unsupported Reddit community: $community" >&2
    exit 64
    ;;
esac

set -a
# shellcheck disable=SC1091
. "$project_dir/apps/web/.env.local"
# shellcheck disable=SC1091
. "$project_dir/apps/web/.env.production.local"
set +a

if [[ "${REDDIT_TOPICS_ENABLED:-false}" != "true" ]]; then
  echo "Reddit topic collection is disabled."
  exit 0
fi
: "${CRON_SECRET:?CRON_SECRET is required}"

response_file="$(mktemp)"
trap 'rm -f "$response_file"' EXIT

status_code="$(
  curl --silent --show-error --fail-with-body \
    --max-time 300 \
    --output "$response_file" \
    --write-out '%{http_code}' \
    --header "Authorization: Bearer $CRON_SECRET" \
    "http://127.0.0.1:3300/api/cron/reddit-topics/$community"
)"

echo "community=$community http_status=$status_code"
sed -n '1,5p' "$response_file"
