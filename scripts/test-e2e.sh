#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker é necessário para subir o Postgres de teste (docker-compose.test.yml)." >&2
  exit 1
fi

docker compose -f "$ROOT/docker-compose.test.yml" up -d --wait

npx playwright test "$@"
