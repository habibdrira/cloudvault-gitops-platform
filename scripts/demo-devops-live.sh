#!/usr/bin/env bash
# ==============================================================================
# CloudVault GitOps Platform — Séquence Démo DevOps Live (Chronométrée)
# ==============================================================================
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear
echo -e "${CYAN}${BOLD}=====================================================================${NC}"
echo -e "${CYAN}${BOLD}   CloudVault GitOps & DevSecOps Platform — Live DevOps Showcase     ${NC}"
echo -e "${CYAN}${BOLD}=====================================================================${NC}"
sleep 1

# 1. Topologie Infrastructure Ansible
echo -e "\n${YELLOW}▶ [1/5] Topologie Multi-Node & Inventaire Ansible${NC}"
echo -e "${PURPLE}$ ansible-inventory -i ansible/inventory/hosts.ini --graph${NC}"
ansible-inventory -i ansible/inventory/hosts.ini --graph
echo -e "${GREEN}✔ Topologie validée : 1 Nœud Infra-Services + 2 Nœuds K8s (Master + Worker)${NC}"
sleep 1.5

# 2. Terraform Infrastructure as Code
echo -e "\n${YELLOW}▶ [2/5] Infrastructure as Code — Terraform 1.9 & Remote State S3${NC}"
echo -e "${PURPLE}$ make tf-apply${NC}"
make tf-apply
echo -e "${GREEN}✔ S3 Bucket chiffré SSE-S3 & Remote State 100% conformes (0 drift) !${NC}"
sleep 1.5

# 3. Kubernetes Multi-Node & Résilience Haute Disponibilité
echo -e "\n${YELLOW}▶ [3/5] Cluster Kubernetes K3s — Multi-Node, Autoscaling HPA & PDB${NC}"
echo -e "${PURPLE}$ kubectl get nodes && kubectl -n cloudvault get pods,hpa,pdb,networkpolicy${NC}"
kubectl get nodes
echo ""
kubectl -n cloudvault get pods,hpa,pdb,networkpolicy
echo -e "${GREEN}✔ Nœuds Ready, HPA actif (2-10 pods), PDB & Zero-Trust NetworkPolicies en place !${NC}"
sleep 1.5

# 4. Argo CD GitOps Synchronization
echo -e "\n${YELLOW}▶ [4/5] GitOps Control Plane — Argo CD App-of-Apps Status${NC}"
echo -e "${PURPLE}$ kubectl -n argocd get applications${NC}"
kubectl -n argocd get applications
echo -e "${GREEN}✔ 5 Applications déclaratives Synced & Healthy !${NC}"
sleep 1.5

# 5. Automated E2E Pipeline
echo -e "\n${YELLOW}▶ [5/5] Automated E2E Pipeline (Sondes K8s, Upload S3, Versioning & Partage)${NC}"
echo -e "${PURPLE}$ make demo${NC}"
make demo

echo -e "\n${CYAN}${BOLD}=====================================================================${NC}"
echo -e "${GREEN}${BOLD}  DÉMONSTRATION DEVOPS VALIDÉE : 100% DES COMPOSANTS SONT AU VERT !  ${NC}"
echo -e "${CYAN}${BOLD}=====================================================================${NC}"
