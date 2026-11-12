# CloudVault GitOps Platform 🛡️🚀

[![CloudVault CI](https://github.com/habibdrira/cloudvault-gitops-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/habibdrira/cloudvault-gitops-platform/actions/workflows/ci.yml)
[![Kubernetes K3s](https://img.shields.io/badge/Kubernetes-K3s%20v1.31-326CE5?logo=kubernetes&logoColor=white)](https://k3s.io)
[![GitOps ArgoCD](https://img.shields.io/badge/GitOps-Argo%20CD%20v2.12-EF6B48?logo=argo&logoColor=white)](https://argoproj.github.io/cd/)
[![Prometheus](https://img.shields.io/badge/Monitoring-Prometheus%20v2.55-E6522C?logo=prometheus&logoColor=white)](https://prometheus.io)
[![Grafana](https://img.shields.io/badge/Dashboard-Grafana%20v11.3-F46800?logo=grafana&logoColor=white)](https://grafana.com)
[![Terraform](https://img.shields.io/badge/IaC-Terraform%20v1.9-844FBA?logo=terraform&logoColor=white)](https://terraform.io)
[![Ansible](https://img.shields.io/badge/Automation-Ansible%20Core-EE0000?logo=ansible&logoColor=white)](https://ansible.com)
[![DevSecOps](https://img.shields.io/badge/Security-Trivy%200%20Alerts-2496ED?logo=aquasec&logoColor=white)](https://trivy.dev)
[![Go Backend](https://img.shields.io/badge/Backend-Go%201.23%20Clean%20Arch-00ADD8?logo=go&logoColor=white)](https://golang.org)
[![Next.js Frontend](https://img.shields.io/badge/Frontend-Next.js%2014%20Modular-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Standard](https://img.shields.io/badge/Architecture-Gold%20Standard%2010%2F10-success)](https://github.com/habibdrira/cloudvault-gitops-platform)

> **CloudVault** est une plateforme documentaire d'entreprise haute résilience, orchestrée selon les principes **GitOps & SRE de bout en bout**.  
> Elle associe l'automatisation d'infrastructure (**Ansible & Terraform**), un cluster **Kubernetes K3s** multi-nœuds, la réconciliation continue par **Argo CD** (*App-of-Apps*), la sécurité **Zero-Trust** (Conteneurs Distroless, FS Read-Only, NetworkPolicies), une observabilité native (**Prometheus SRE Golden Signals & Grafana as Code**) et un stockage objet **AWS S3 FinOps**.

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
| **GitOps Declaratif** | **Argo CD App-of-Apps** (`cloudvault-root-app`) | Réconciliation continue en cascade de 4 applications sans intervention impérative. |
| **Haute Disponibilité** | **HPA (2 $\rightarrow$ 10 réplicas)** & **PDB (minAvailable: 1)** | Autoscaling basé sur CPU/RAM et zéro coupure de service lors des opérations de maintenance. |
| **Sécurité Zero-Trust** | **Distroless**, `readOnlyRootFilesystem: true`, **TLS Ingress** | Surface d'attaque minimale, disque racine verrouillé, flux réseau isolés par NetworkPolicies. |
| **Gestion d'État IaC** | **Remote Backend S3 LocalStack** (`cloudvault-terraform-state`) | Éradication totale du "Split-Brain" entre poste de travail et nœud d'infrastructure. |
| **Observabilité SRE** | **Golden Signals Go**, **ServiceMonitor**, **Grafana as Code** | Mesure en temps réel des latences HTTP/S3, débit, taux d'erreurs et dashboards versionnés. |
| **Stockage FinOps** | **S3 Versioning**, purge automatique 30 jours, abort multipart 1 jour | Maîtrise des coûts de stockage cloud et traçabilité complète des versions d'objets. |

---

## 🚀 Démarrage Rapide Zero-Touch

L'ensemble du cycle de vie de la plateforme est piloté via le [`Makefile`](Makefile) :

```bash
# 1. Déploiement complet de l'infrastructure (Ansible OS + Terraform S3 conteneurisé)
make bootstrap

# 2. Déploiement/Mise à jour de l'IaC Terraform avec Remote State S3
make tf-apply

# 3. Exécution des tests unitaires Go avec détecteur de concurrence (-race -cover)
make test

# 4. Audit de sécurité DevSecOps local (Scan Trivy IaC, K8s et conteneurs : 0 failles)
make scan

# 5. Validation automatisée de bout en bout (Sondes, URLs pré-signées, upload S3, routage)
make demo
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
Ce projet est sous licence open-source **[MIT](LICENSE)**. Conçu comme une référence d'excellence pour l'ingénierie Cloud, DevOps, SRE et DevSecOps moderne.
