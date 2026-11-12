# CloudVault GitOps Platform 🛡️🚀

[![CI/DevSecOps Status](https://github.com/habibdrira/cloudvault-gitops-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/habibdrira/cloudvault-gitops-platform/actions/workflows/ci.yml)
[![Go Version](https://img.shields.io/badge/Go-1.23-00ADD8?logo=go&logoColor=white)](https://golang.org)
[![Next.js Version](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-K3s%20v1.31-326CE5?logo=kubernetes&logoColor=white)](https://k3s.io)
[![GitOps](https://img.shields.io/badge/GitOps-Argo%20CD%20v2.12-EF6B48?logo=argo&logoColor=white)](https://argoproj.github.io/cd/)
[![IaC](https://img.shields.io/badge/IaC-Terraform%201.9-844FBA?logo=terraform&logoColor=white)](https://terraform.io)
[![Security](https://img.shields.io/badge/Trivy-0%20Alerts-2496ED?logo=aquasec&logoColor=white)](https://trivy.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **CloudVault** est une plateforme documentaire d'entreprise haute résilience, orchestrée selon les principes **GitOps & SRE de bout en bout**.  
> Elle associe l'automatisation d'infrastructure (**Ansible & Terraform**), un cluster **Kubernetes K3s** multi-nœuds, la réconciliation continue par **Argo CD** (*App-of-Apps*), la sécurité **Zero-Trust** (Conteneurs Distroless, FS Read-Only, NetworkPolicies), une observabilité native (**Prometheus SRE Golden Signals & Grafana as Code**) et un stockage objet **AWS S3 FinOps**.

---

## 📑 Table des Matières

- [🏛️ Architecture Globale & Flux de Données](#️-architecture-globale--flux-de-données)
- [💎 Les 6 Piliers d'Excellence Technique (Gold Standard)](#-les-6-piliers-dexcellence-technique-gold-standard)
- [🚀 Quickstart & Commandes (Makefile)](#-quickstart--commandes-makefile)
- [🌐 Points d'Accès de la Plateforme](#-points-daccès-de-la-plateforme)
- [☁️ Production Evolution Roadmap (AWS EKS)](#️-production-evolution-roadmap-aws-eks)
- [📂 Structure du Répertoire](#-structure-du-répertoire)
- [📜 Licence](#-licence)

---

## 🏛️ Architecture Globale & Flux de Données

L'infrastructure s'étend sur un réseau virtuel privé dédié (`VMnet8 : 192.168.100.0/24`) piloté depuis une station de contrôle universelle (**WSL2, DevContainer ou VM dédiée**) :

```text
                                  +---------------------------------------+
                                  |   Control Station (WSL2 / DevBox)     |
                                  |   Ansible | Terraform (S3) | Kubectl  |
                                  +-------------------+-------------------+
                                                      |
                  DNS: cloudvault.local (HTTP / HTTPS)| Git Commit & Push (GitHub Actions CI)
                                                      v
  ===================================== VMnet8 (192.168.100.0/24) =====================================
                                                      |
            +-----------------------------------------+-----------------------------------------+
            |                                         |                                         |
            v (Host: cloudvault.local:80 & 443)       v (Cluster Internal / NodePort 30300)     v (Cloud Mocking)
+-----------------------------------+   +-----------------------------------+   +-----------------------------------+
|            k8s-master             |   |            k8s-worker             |   |            infra-node             |
|         (192.168.100.20)          |   |         (192.168.100.21)          |   |         (192.168.100.10)          |
+-----------------------------------+   +-----------------------------------+   +-----------------------------------+
|  [Ingress NGINX] (HostNetwork:80) |   |  [Ingress NGINX] (HostNetwork:80) |   |  [Docker Engine 27+]              |
|  - Ingress Controller TLS (:443)  |   |  - Ingress Controller TLS (:443)  |   |                                   |
|                                   |   |                                   |   |  [LocalStack Container 3.8]       |
|  [Control Plane K3s Server]       |   |  [Worker Node K3s Agent]          |   |  - Gateway Port: 4566             |
|  - CoreDNS, Metrics Server        |   |                                   |   |  - Services: S3, IAM, STS         |
|  - Local-Path Provisioner         |   |  [Application Pods (cloudvault)]  |   |  - Remote State:                  |
|                                   |   |  * cloudvault-backend (Go 1.23)   |   |    cloudvault-terraform-state     |
|  [Argo CD GitOps Engine]          |   |    Clean Arch / Distroless / HPA  |   |  - Bucket Documentaire:           |
|  - Root App (App-of-Apps)         |   |    Port 8080 (NodePort: 30081)    |   |    cloudvault-documents           |
|  - 4 Applications Enfants         |   |  * cloudvault-frontend (Next.js)  |   |    Versioning & FinOps 30j        |
|                                   |   |    Read-Only FS / HPA / PDB       |   |                                   |
|  [Observabilité (monitoring)]     |   |    Port 3000 (NodePort: 30000)    |   |  [Boot Hook Persistence]          |
|  * Prometheus Server (2.55)       |   |                                   |   |  - /etc/localstack/init/ready.d/  |
|  * Prometheus Operator (0.78)     |   |  [Observabilité (monitoring)]     |   |    init-s3.sh (auto-bootstrap)    |
|  * Kube-State-Metrics (2.13)      |   |  * Grafana v11.3 (NodePort:30300) |   +-----------------------------------+
|  * Node Exporter (DaemonSet)      |   |    Dashboard SRE auto-chargé      |                     ^
|  * Node Exporter (DaemonSet)      |   |  * Node Exporter (DaemonSet)      |                     |
+-----------------------------------+   +-----------------------------------+                     |
                  |                                       |                                       |
                  |                                       +--- Demande URL pré-signée S3 -------->|
                  +--- Réconciliation continue GitOps --->|    Direct PUT Client -> S3 -----------+
```

---

## 💎 Les 6 Piliers d'Excellence Technique ("Gold Standard")

| Pilier | Solution Déployée | Bénéfice Opérationnel |
| :--- | :--- | :--- |
| **GitOps Déclaratif** | **Argo CD App-of-Apps** (`cloudvault-root-app`) | Réconciliation continue en cascade de 4 applications sans intervention impérative. |
| **Haute Disponibilité** | **HPA (2 $\rightarrow$ 10 réplicas)** & **PDB (minAvailable: 1)** | Autoscaling basé sur CPU/RAM et zéro coupure de service lors des opérations de maintenance. |
| **Sécurité Zero-Trust** | **Distroless**, `readOnlyRootFilesystem: true`, **TLS Ingress** | Surface d'attaque minimale, disque racine verrouillé, flux réseau isolés par NetworkPolicies. |
| **Gestion d'État IaC** | **Remote Backend S3 LocalStack** (`cloudvault-terraform-state`) | Éradication totale du "Split-Brain" entre poste de travail et nœud d'infrastructure. |
| **Observabilité SRE** | **Golden Signals Go**, **ServiceMonitor**, **Grafana as Code** | Mesure en temps réel des latences HTTP/S3, débit, taux d'erreurs et dashboards versionnés. |
| **Stockage FinOps** | **S3 Versioning**, purge automatique 30 jours, abort multipart 1 jour | Maîtrise des coûts de stockage cloud et traçabilité complète des versions d'objets. |

---

## 🚀 Quickstart & Commandes (`Makefile`)

L'ensemble des opérations du cycle de vie de la plateforme est orchestré de manière standardisée et reproductible via le [`Makefile`](Makefile) :

| Commande | Objectif & Description | Résultat Attendu |
| :--- | :--- | :--- |
| `make bootstrap` | Déploie l'infrastructure complète de zéro via Ansible (OS, Docker, LocalStack, K3s multi-nœuds, Argo CD) et initialise le provisionnement Terraform. | Nœuds opérationnels, cluster K3s prêt et applications Argo CD en cours de synchronisation. |
| `make tf-apply` | Initialise et applique la configuration IaC Terraform conteneurisée avec stockage d'état distant (`s3://cloudvault-terraform-state/infra-services/terraform.tfstate`). | `No changes. Your infrastructure matches the configuration.` (Convergence 100 % idempotente). |
| `make scan` | Lance l'audit de sécurité DevSecOps exhaustif avec Aqua Security Trivy sur les 13 cibles (Dockerfiles, manifestes Kubernetes, code Terraform). | `0 Misconfigurations (0 CRITICAL, 0 HIGH)`. |
| `make test` | Exécute la suite complète de tests unitaires backend Go avec détecteur de concurrence mémoire et couverture de code (`go test -v -race -cover ./...`). | `PASS` avec 0 race condition détectée et couverture robuste. |
| `make demo` | Exécute le pipeline automatisé de vérification E2E (`scripts/demo-e2e.sh`) couvrant les sondes K8s, URLs pré-signées, upload S3, listing avec `version_id` et lien de partage temporaire. | `VALIDATION E2E RÉUSSIE AVEC SUCCÈS ! LA PLATEFORME EST CONFORME`. |

```bash
# Workflow typique de validation complète :
make test      # Validation du code backend & concurrence
make scan      # Audit de sécurité DevSecOps zéro-défaut
make tf-apply  # Vérification de l'alignement de l'infrastructure
make demo      # Validation bout-en-bout en direct
```

---

## 🌐 Points d'Accès de la Plateforme

| Service | URL / Port | Protocole / Authentification |
| :--- | :--- | :--- |
| **Application Web CloudVault** | `https://cloudvault.local/` ou `http://cloudvault.local/` | HTTPS (TLS v1.3) / HTTP (Port 80/443) |
| **Grafana UI & Dashboards** | `http://192.168.100.21:30300` | NodePort / `admin` : `admin` |
| **Dashboard SRE Golden Signals** | `http://192.168.100.21:30300/d/cloudvault-sre-golden-signals` | Direct Dashboard Link |
| **Argo CD UI (GitOps)** | `https://192.168.100.20:30443` | NodePort HTTPS / `admin` |
| **Backend Raw Metrics** | `http://192.168.100.21:30081/metrics` | NodePort format Prometheus |
| **LocalStack S3 Gateway** | `http://192.168.100.10:4566` | REST API AWS S3 & IAM |

---

## ☁️ Production Evolution Roadmap (AWS EKS)

L'architecture de CloudVault a été conçue pour une transposition directe et transparente vers un environnement managé de production hyperscaler (**AWS EKS**) sans refactorisation applicative :

1. **Gestion Dynamique des Secrets (External Secrets Operator) :**
   - Remplacement des `Secret` Kubernetes statiques par des ressources `ExternalSecret` et `SecretStore` connectées à **AWS Secrets Manager** ou **AWS Systems Manager Parameter Store**, avec rotation automatique des clés et rôles IAM via **IRSA** (IAM Roles for Service Accounts).
2. **Gestion Automatisée des Certificats & Ingress TLS (`cert-manager`) :**
   - Déploiement de **cert-manager** avec un `ClusterIssuer` Let's Encrypt (DNS-01 via Route 53 ou HTTP-01 via AWS ALB Ingress Controller) pour le renouvellement automatique des certificats SSL/TLS x509, assurant un chiffrement de bout en bout avec endpoints S3 natifs HTTPS.
3. **Haute Disponibilité & Résilience Avancée :**
   - Exploitation des **Horizontal Pod Autoscalers (HPA)** configurés sur métriques personnalisées Prometheus (latence requêtes, taux d'erreurs 5xx) combinés aux **PodDisruptionBudgets (PDB)** et au provisionneur dynamique **Karpenter / Cluster Autoscaler** pour le dimensionnement élastique des nœuds EC2 multi-AZ.
4. **Télémétrie & Traçabilité Distribuée (OpenTelemetry) :**
   - Intégration d'un collecteur **OpenTelemetry (OTel)** pour la collecte unifiée des traces distribuées, métriques et logs vers **Amazon Managed Prometheus (AMP)**, **Amazon Managed Grafana (AMG)** et **AWS CloudWatch / X-Ray**.

---

## 📂 Structure du Répertoire

```text
cloudvault-gitops-platform/
├── .devcontainer/            # Environnement de contrôle universel multi-OS (Dockerfile + devcontainer.json)
├── .github/workflows/        # Pipeline CI/CD DevSecOps (Backend, Frontend, IaC/K8s, Trivy, golangci-lint)
├── Makefile                  # Point d'entrée Zero-Touch (make bootstrap, tf-apply, scan, test, demo)
├── ansible/                  # Automatisation Ansible multi-nœuds (K3s, Docker, LocalStack, Argo CD)
├── apps/
│   ├── backend/              # Microservice Go 1.23 (Clean Arch, Presigned S3, Partage temporaire 15m/1h/24h)
│   └── frontend/             # Application Next.js 14 (Composants modulaires, XHR Progress, ShareModal)
├── infra-services/
│   ├── localstack/           # Docker Compose & hook de boot persistant init-s3.sh
│   └── terraform/            # IaC S3 (Versioning, FinOps) & IAM avec Remote State S3 LocalStack
├── k8s/                      # Manifestes Kubernetes 100 % déclaratifs
│   ├── applications/         # Les 4 Applications déclaratives du pattern App-of-Apps
│   │   ├── 01-ingress-controller.yaml
│   │   ├── 02-monitoring-stack.yaml
│   │   ├── 03-monitoring-dashboards.yaml
│   │   └── 04-cloudvault-platform.yaml
│   ├── apps/                 # Déploiements, HPA, PDB, Secrets, TLS, NetworkPolicies et Ingress
│   ├── infrastructure/       # Ingress NGINX et stack d'observabilité Prometheus
│   ├── monitoring/           # Dashboards Grafana as Code
│   └── root-application.yaml # Application racine App-of-Apps (cloudvault-root-app)
├── scripts/                  # Script de démonstration et validation E2E (demo-e2e.sh)
└── tests/                    # Suites de validation automatisées (CRUD, Partage, Observabilité, YAML)
```

---

## 📜 Licence

Ce projet est sous licence open-source **[MIT](https://opensource.org/licenses/MIT)**. Conçu comme une référence d'excellence pour l'ingénierie Cloud, DevOps, SRE et DevSecOps moderne.
