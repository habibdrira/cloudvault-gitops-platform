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
	$(MAKE) tf-apply

tf-apply:
	@scp -o StrictHostKeyChecking=no -r infra-services/terraform/* ubuntu@192.168.100.10:/home/habib/cloudvault-gitops-platform/infra-services/terraform/ 2>/dev/null || true
	docker run --rm -e AWS_ACCESS_KEY_ID=test -e AWS_SECRET_ACCESS_KEY=test -e AWS_DEFAULT_REGION=us-east-1 -v $(PWD)/infra-services/terraform:/workspace -w /workspace --network host hashicorp/terraform:1.9 init -input=false
	docker run --rm -e AWS_ACCESS_KEY_ID=test -e AWS_SECRET_ACCESS_KEY=test -e AWS_DEFAULT_REGION=us-east-1 -v $(PWD)/infra-services/terraform:/workspace -w /workspace --network host hashicorp/terraform:1.9 apply -auto-approve

scan:
	@tar --exclude='node_modules' --exclude='.next' --exclude='.git' -cf - . | ssh -o StrictHostKeyChecking=no ubuntu@192.168.100.10 'tar -xf - -C /home/habib/cloudvault-gitops-platform/'
	docker run --rm -v $(PWD):/workspace -w /workspace aquasec/trivy:latest config --severity CRITICAL,HIGH --ignorefile /workspace/.trivyignore .

test:
	cd apps/backend && go test -v -race -cover ./...

demo:
	./scripts/demo-e2e.sh

