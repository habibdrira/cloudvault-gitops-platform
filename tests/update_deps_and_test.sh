#!/usr/bin/env bash
set -euo pipefail

cd /home/habib/cloudvault-gitops-platform/apps/backend

tar -czf - . | ssh ubuntu@192.168.100.10 '
  rm -rf /tmp/backend_build_deps
  mkdir -p /tmp/backend_build_deps
  tar -xzf - -C /tmp/backend_build_deps
  sudo docker run --rm -v /tmp/backend_build_deps:/app -w /app golang:1.23-alpine sh -c "
    go get github.com/prometheus/client_golang@v1.20.5
    go mod tidy
    go test -v ./...
  "
'

# Rapatrier go.mod et go.sum mis à jour
ssh ubuntu@192.168.100.10 'cat /tmp/backend_build_deps/go.mod' > /home/habib/cloudvault-gitops-platform/apps/backend/go.mod
ssh ubuntu@192.168.100.10 'cat /tmp/backend_build_deps/go.sum' > /home/habib/cloudvault-gitops-platform/apps/backend/go.sum
echo "Dependencies updated and tests verified successfully!"
