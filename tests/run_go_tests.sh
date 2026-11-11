#!/usr/bin/env bash
set -euo pipefail

cd /home/habib/cloudvault-gitops-platform/apps/backend

tar -czf - . | ssh ubuntu@192.168.100.10 '
  rm -rf /tmp/backend_test
  mkdir -p /tmp/backend_test
  tar -xzf - -C /tmp/backend_test
  sudo docker run --rm -v /tmp/backend_test:/app -w /app golang:1.23-alpine go test -v ./...
'

