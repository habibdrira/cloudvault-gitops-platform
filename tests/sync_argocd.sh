#!/usr/bin/env bash
set -euo pipefail

KUBECONFIG=/home/habib/cloudvault-gitops-platform/kubeconfig
KUBECTL=/home/habib/.local/bin/kubectl

$KUBECTL --kubeconfig=$KUBECONFIG -n argocd annotate application cloudvault-platform argocd.argoproj.io/refresh=normal --overwrite
$KUBECTL --kubeconfig=$KUBECONFIG -n argocd annotate application monitoring-dashboards argocd.argoproj.io/refresh=normal --overwrite
$KUBECTL --kubeconfig=$KUBECONFIG -n argocd annotate application monitoring-stack argocd.argoproj.io/refresh=normal --overwrite

sleep 5
$KUBECTL --kubeconfig=$KUBECONFIG -n argocd get applications
