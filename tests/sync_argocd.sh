#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
KUBECTL="${KUBECTL:-kubectl}"
KUBECONFIG="${KUBECONFIG:-${REPO_ROOT}/kubeconfig}"

$KUBECTL --kubeconfig="${KUBECONFIG}" -n argocd annotate application cloudvault-root-app argocd.argoproj.io/refresh=normal --overwrite 2>/dev/null || true
$KUBECTL --kubeconfig="${KUBECONFIG}" -n argocd annotate application cloudvault-platform argocd.argoproj.io/refresh=normal --overwrite
$KUBECTL --kubeconfig="${KUBECONFIG}" -n argocd annotate application monitoring-dashboards argocd.argoproj.io/refresh=normal --overwrite
$KUBECTL --kubeconfig="${KUBECONFIG}" -n argocd annotate application monitoring-stack argocd.argoproj.io/refresh=normal --overwrite

sleep 5
$KUBECTL --kubeconfig="${KUBECONFIG}" -n argocd get applications
