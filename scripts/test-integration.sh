#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if command -v docker >/dev/null 2>&1; then
  docker compose -f "$ROOT/docker-compose.test.yml" up -d --wait || {
    echo "Aviso: docker compose falhou; tentando TEST_DATABASE_URL existente" >&2
  }
fi

export TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgresql://smartlimp:test@127.0.0.1:54329/smartlimp_test?sslmode=disable}"

cd "$ROOT/backend"
go test -tags=integration -count=1 ./...
