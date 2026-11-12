#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}/apps/backend"

tar -czf - . | ssh ubuntu@192.168.100.10 '
  rm -rf /tmp/backend_test
  mkdir -p /tmp/backend_test
  tar -xzf - -C /tmp/backend_test
  sudo docker run --rm -v /tmp/backend_test:/app -w /app golang:1.23-alpine go test -v ./...
'

