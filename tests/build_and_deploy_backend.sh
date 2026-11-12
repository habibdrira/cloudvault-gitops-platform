#!/usr/bin/env bash
set -euo pipefail

echo "=== 1. Transfert du code backend vers infra-node ==="
ssh ubuntu@192.168.100.10 "rm -rf /tmp/backend_build && mkdir -p /tmp/backend_build"
tar -C /home/habib/cloudvault-gitops-platform/apps/backend -czf - . | ssh ubuntu@192.168.100.10 "tar -xzf - -C /tmp/backend_build"

echo "=== 2. Compilation de l'image Docker cloudvault-backend:latest ==="
ssh ubuntu@192.168.100.10 "sudo docker build -t cloudvault-backend:latest /tmp/backend_build"

echo "=== 3. Streaming et importation de l'image dans containerd (k8s-worker) ==="
ssh ubuntu@192.168.100.10 "sudo docker save cloudvault-backend:latest" | ssh ubuntu@192.168.100.21 "sudo k3s ctr -n k8s.io images import -"

echo "=== 4. Streaming et importation de l'image dans containerd (k8s-master) ==="
ssh ubuntu@192.168.100.10 "sudo docker save cloudvault-backend:latest" | ssh ubuntu@192.168.100.20 "sudo k3s ctr -n k8s.io images import -"

echo "=== 5. Redémarrage du déploiement backend ==="
/home/habib/.local/bin/kubectl --kubeconfig=/home/habib/cloudvault-gitops-platform/kubeconfig -n cloudvault rollout restart deployment cloudvault-backend
/home/habib/.local/bin/kubectl --kubeconfig=/home/habib/cloudvault-gitops-platform/kubeconfig -n cloudvault rollout status deployment cloudvault-backend --timeout=60s

echo "=== Backend mis à jour et validé avec succès ==="

