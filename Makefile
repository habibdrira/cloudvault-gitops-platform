# ==============================================================================
# CloudVault GitOps Platform — Zero-Touch Automation Makefile
# ==============================================================================

SHELL := /bin/bash
export PATH := /home/habib/.local/bin:$(PATH)
PWD := $(shell pwd)

.PHONY: all bootstrap tf-apply scan test demo help

all: help

help:
	@echo "CloudVault GitOps Platform - Commandes disponibles :"
	@echo "  make bootstrap  - Exécute le playbook Ansible global (bootstrap)"
	@echo "  make tf-apply   - Déploie l'IaC Terraform conteneurisée (hashicorp/terraform:1.9)"
	@echo "  make scan       - Analyse de sécurité DevSecOps Trivy locale"
	@echo "  make test       - Exécute les tests unitaires et de concurrence Go (-race -cover)"
	@echo "  make demo       - Exécute la validation E2E automatisée (demo-e2e.sh)"

bootstrap:
	ansible-playbook ansible/site.yml

tf-apply:
	@which rsync >/dev/null 2>&1 && rsync -az infra-services/terraform/ ubuntu@192.168.100.10:/home/habib/cloudvault-gitops-platform/infra-services/terraform/ 2>/dev/null || true
	docker run --rm -v $(PWD)/infra-services/terraform:/workspace -w /workspace --network host hashicorp/terraform:1.9 init
	docker run --rm -v $(PWD)/infra-services/terraform:/workspace -w /workspace --network host hashicorp/terraform:1.9 apply -auto-approve
	@which rsync >/dev/null 2>&1 && rsync -az ubuntu@192.168.100.10:/home/habib/cloudvault-gitops-platform/infra-services/terraform/ infra-services/terraform/ 2>/dev/null || true

scan:
	@which rsync >/dev/null 2>&1 && rsync -az --exclude '.git' --exclude 'node_modules' $(PWD)/ ubuntu@192.168.100.10:/home/habib/cloudvault-gitops-platform/ 2>/dev/null || true
	docker run --rm -v $(PWD):/workspace -w /workspace aquasec/trivy:latest config --severity CRITICAL,HIGH .

test:
	cd apps/backend && go test -v -race -cover ./...

demo:
	./scripts/demo-e2e.sh

