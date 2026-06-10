#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

export DATABASE_URL="${TEST_DATABASE_URL:-postgresql://smartlimp:test@127.0.0.1:54329/smartlimp_test?sslmode=disable}"
export JWT_SECRET="${JWT_SECRET:-e2e-test-secret}"
export PORT="${PORT:-8080}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://127.0.0.1:5173}"
export ENV=test

if command -v docker >/dev/null 2>&1; then
  if ! docker compose -f "$ROOT/docker-compose.test.yml" ps --status running 2>/dev/null | grep -q postgres; then
    docker compose -f "$ROOT/docker-compose.test.yml" up -d --wait
  fi
fi

cd "$ROOT/backend"
go run ./cmd/migrate
exec go run ./cmd/api
