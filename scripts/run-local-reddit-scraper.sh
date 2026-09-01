#!/usr/bin/env bash
set -euo pipefail

readonly project_dir="/data/project/side/pythonparsing"

set -a
# shellcheck disable=SC1091
. "$project_dir/apps/web/.env.local"
# shellcheck disable=SC1091
. "$project_dir/apps/web/.env.production.local"
set +a

export REDDIT_SCRAPER_PORT=3400

exec "$project_dir/apps/reddit-scraper/.venv/bin/python" \
  "$project_dir/apps/reddit-scraper/api/index.py"
