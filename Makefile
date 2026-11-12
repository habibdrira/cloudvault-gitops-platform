# ==============================================================================
# CloudVault GitOps Platform — Zero-Touch Automation Makefile
# ==============================================================================

SHELL := /bin/bash
export PATH := $(HOME)/.local/bin:$(PATH)
PWD := $(shell pwd)
REMOTE_HOST ?= ubuntu@192.168.100.10

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
	@if [ -n "$$DOCKER_HOST" ] || grep -q 'DOCKER_HOST' "$$(which docker 2>/dev/null)" 2>/dev/null; then \
		ssh -o StrictHostKeyChecking=no $(REMOTE_HOST) "mkdir -p $(PWD)/infra-services/terraform" 2>/dev/null || true; \
		scp -o StrictHostKeyChecking=no -r infra-services/terraform/* $(REMOTE_HOST):$(PWD)/infra-services/terraform/ 2>/dev/null || true; \
	fi
	docker run --rm -e AWS_ACCESS_KEY_ID=test -e AWS_SECRET_ACCESS_KEY=test -e AWS_DEFAULT_REGION=us-east-1 -v $(PWD)/infra-services/terraform:/workspace -w /workspace --network host hashicorp/terraform:1.9 init -input=false
	docker run --rm -e AWS_ACCESS_KEY_ID=test -e AWS_SECRET_ACCESS_KEY=test -e AWS_DEFAULT_REGION=us-east-1 -v $(PWD)/infra-services/terraform:/workspace -w /workspace --network host hashicorp/terraform:1.9 apply -auto-approve

scan:
	@if [ -n "$$DOCKER_HOST" ] || grep -q 'DOCKER_HOST' "$$(which docker 2>/dev/null)" 2>/dev/null; then \
		ssh -o StrictHostKeyChecking=no $(REMOTE_HOST) "mkdir -p $(PWD)" 2>/dev/null || true; \
		tar --exclude='node_modules' --exclude='.next' --exclude='.git' -cf - . | ssh -o StrictHostKeyChecking=no $(REMOTE_HOST) "tar -xf - -C $(PWD)/" 2>/dev/null || true; \
	fi
	docker run --rm -v $(PWD):/workspace -w /workspace aquasec/trivy:latest config --severity CRITICAL,HIGH --ignorefile /workspace/.trivyignore .

test:
	cd apps/backend && go test -v -race -cover ./...

demo:
	./scripts/demo-e2e.sh

