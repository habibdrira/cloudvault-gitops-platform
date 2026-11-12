#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
KUBECTL="${KUBECTL:-kubectl}"
KUBECONFIG="${KUBECONFIG:-${REPO_ROOT}/kubeconfig}"

echo "=== 1. Transfert du code frontend vers infra-node ==="
ssh ubuntu@192.168.100.10 "rm -rf /tmp/frontend_build && mkdir -p /tmp/frontend_build"
tar -C "${REPO_ROOT}/apps/frontend" --exclude='node_modules' --exclude='.next' -czf - . | ssh ubuntu@192.168.100.10 "tar -xzf - -C /tmp/frontend_build"

echo "=== 2. Compilation de l'image Docker cloudvault-frontend:latest ==="
ssh ubuntu@192.168.100.10 "sudo docker build -t cloudvault-frontend:latest /tmp/frontend_build"

echo "=== 3. Streaming et importation de l'image dans containerd (k8s-worker) ==="
ssh ubuntu@192.168.100.10 "sudo docker save cloudvault-frontend:latest" | ssh ubuntu@192.168.100.21 "sudo k3s ctr -n k8s.io images import -"

echo "=== 4. Streaming et importation de l'image dans containerd (k8s-master) ==="
ssh ubuntu@192.168.100.10 "sudo docker save cloudvault-frontend:latest" | ssh ubuntu@192.168.100.20 "sudo k3s ctr -n k8s.io images import -"

echo "=== 5. Redémarrage du déploiement frontend ==="
${KUBECTL} --kubeconfig="${KUBECONFIG}" -n cloudvault rollout restart deployment cloudvault-frontend
${KUBECTL} --kubeconfig="${KUBECONFIG}" -n cloudvault rollout status deployment cloudvault-frontend --timeout=120s

echo "=== Frontend mis à jour et validé avec succès ==="

