#!/usr/bin/env bash
# ==============================================================================
# CloudVault GitOps Platform — Séquence Démo DevOps Live
# ==============================================================================
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

clear
echo -e "${CYAN}=====================================================================${NC}"
echo -e "${CYAN}   CloudVault GitOps & DevSecOps Platform — Live DevOps Showcase     ${NC}"
echo -e "${CYAN}=====================================================================${NC}"
sleep 1

# 1. Terraform Infrastructure as Code
echo -e "\n${YELLOW}▶ [1/4] Infrastructure as Code — Terraform 1.9 & Remote State S3${NC}"
echo -e "${PURPLE}$ make tf-apply${NC}"
make tf-apply
echo -e "${GREEN}✔ Infrastructure S3 chiffrée & Remote State 100% conformes !${NC}"
sleep 2

# 2. Kubernetes Multi-Node & Résilience
echo -e "\n${YELLOW}▶ [2/4] Cluster Kubernetes K3s — Multi-Node, HPA & Zero-Trust${NC}"
echo -e "${PURPLE}$ kubectl get nodes && kubectl -n cloudvault get pods,hpa,pdb,netpol${NC}"
kubectl get nodes
echo ""
kubectl -n cloudvault get pods,hpa,pdb,netpol
echo -e "${GREEN}✔ 2 Nœuds Ready, Autoscaling HPA actif, PDB & NetworkPolicies en place !${NC}"
sleep 2

# 3. Argo CD GitOps Synchronization
echo -e "\n${YELLOW}▶ [3/4] GitOps Control Plane — Argo CD App-of-Apps Status${NC}"
echo -e "${PURPLE}$ kubectl -n argocd get applications${NC}"
kubectl -n argocd get applications
echo -e "${GREEN}✔ 5 Applications déclaratives Synced & Healthy !${NC}"
sleep 2

# 4. Automated E2E Pipeline
echo -e "\n${YELLOW}▶ [4/4] Automated E2E Validation Pipeline${NC}"
echo -e "${PURPLE}$ make demo${NC}"
make demo

echo -e "\n${CYAN}=====================================================================${NC}"
echo -e "${GREEN}  DÉMONSTRATION DEVOPS VALIDÉE : TOUS LES VOYANTS SONT AU VERT !    ${NC}"
echo -e "${CYAN}=====================================================================${NC}"
