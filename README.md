# CloudVault GitOps Platform 🛡️🚀

[![CloudVault CI](https://github.com/habibdrira/cloudvault-gitops-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/habibdrira/cloudvault-gitops-platform/actions/workflows/ci.yml)
[![Kubernetes K3s](https://img.shields.io/badge/Kubernetes-K3s%20v1.31-326CE5?logo=kubernetes&logoColor=white)](https://k3s.io)
[![GitOps ArgoCD](https://img.shields.io/badge/GitOps-Argo%20CD%20v2.12-EF6B48?logo=argo&logoColor=white)](https://argoproj.github.io/cd/)
[![Prometheus](https://img.shields.io/badge/Monitoring-Prometheus%20v2.55-E6522C?logo=prometheus&logoColor=white)](https://prometheus.io)
[![Grafana](https://img.shields.io/badge/Dashboard-Grafana%20v11.3-F46800?logo=grafana&logoColor=white)](https://grafana.com)
[![Terraform](https://img.shields.io/badge/IaC-Terraform%20v1.9-844FBA?logo=terraform&logoColor=white)](https://terraform.io)
[![Ansible](https://img.shields.io/badge/Automation-Ansible%20Core-EE0000?logo=ansible&logoColor=white)](https://ansible.com)
[![LocalStack S3](https://img.shields.io/badge/AWS%20Mock-LocalStack%203.8-0052CC?logo=amazons3&logoColor=white)](https://localstack.cloud)
[![Go Backend](https://img.shields.io/badge/Backend-Go%201.23%20Clean%20Arch-00ADD8?logo=go&logoColor=white)](https://golang.org)
[![Next.js Frontend](https://img.shields.io/badge/Frontend-Next.js%2014%20Modular-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **CloudVault** est une plateforme documentaire d'entreprise moderne, hautement disponible et orchestrée selon les principes **GitOps & SRE de bout en bout**.  
> Elle associe l'automatisation d'infrastructure déclarative (**Ansible** & **Terraform**), un cluster **Kubernetes K3s** multi-nœuds, la réconciliation continue par **Argo CD**, une pile d'observabilité complète (**kube-prometheus-stack** & **Grafana** auto-provisionné), un stockage objet mocké **AWS S3 (LocalStack)** et une architecture microservices ultra-légère en conteneurs **Distroless non-root**.

---

## 🏛️ Architecture Technique & Flux de Données

L'infrastructure s'étend sur un réseau virtuel privé dédié (`VMnet8 : 192.168.100.0/24`) piloté depuis une station de contrôle **WSL2** :

```text
                                  +---------------------------------------+
                                  |   WSL2 Control Station (Admin / CI)  |
                                  |   Ansible | Terraform | Kubectl       |
                                  +-------------------+-------------------+
                                                      |
                          DNS: cloudvault.local:80    | Git Commit & Push (GitHub Actions CI)
                                                      v
  ===================================== VMnet8 (192.168.100.0/24) =====================================
                                                      |
            +-----------------------------------------+-----------------------------------------+
            |                                         |                                         |
            v (HTTP Host: cloudvault.local)           v (Cluster Internal / NodePort 30300)     v (Cloud Mocking)
+-----------------------------------+   +-----------------------------------+   +-----------------------------------+
|            k8s-master             |   |            k8s-worker             |   |            infra-node             |
|         (192.168.100.20)          |   |         (192.168.100.21)          |   |         (192.168.100.10)          |
+-----------------------------------+   +-----------------------------------+   +-----------------------------------+
|  [Ingress NGINX] (HostNetwork:80) |   |  [Ingress NGINX] (HostNetwork:80) |   |  [Docker Engine 27+]              |
|  - Ingress Controller             |   |  - Ingress Controller             |   |                                   |
|                                   |   |                                   |   |  [LocalStack Container 3.8]       |
|  [Control Plane K3s Server]       |   |  [Worker Node K3s Agent]          |   |  - Gateway Port: 4566             |
|  - CoreDNS, Metrics Server        |   |                                   |   |  - Services: S3, IAM, STS         |
|  - Local-Path Provisioner         |   |  [Application Pods (cloudvault)]  |   |  - Bucket: cloudvault-documents   |
|                                   |   |  * cloudvault-backend (Go 1.23)   |   |                                   |
|  [Argo CD GitOps Engine]          |   |    Port 8080 (NodePort: 30081)    |   |  [Boot Hook Persistence]          |
|  - Application Controller         |   |    Clean Arch / slog JSON         |   |  - /etc/localstack/init/ready.d/  |
|  - Repo Server & API Server       |   |  * cloudvault-frontend (Next.js)  |   |    init-s3.sh (auto-recreate)     |
|  - 4 Applications Synced          |   |    Port 3000 (NodePort: 30000)    |   +-----------------------------------+
|                                   |   |                                   |                     ^
|  [Observabilité (monitoring)]     |   |  [Observabilité (monitoring)]     |                     |
|  * Prometheus Server (2.55)       |   |  * Grafana v11.3 (NodePort:30300) |                     |
|  * Prometheus Operator (0.78)     |   |    Dashboard SRE auto-chargé      |                     |
|  * Kube-State-Metrics (2.13)      |   |  * Node Exporter (DaemonSet)      |                     |
|  * Node Exporter (DaemonSet)      |   |                                   |                     |
+-----------------------------------+   +-----------------------------------+                     |
                  |                                       |                                       |
                  |                                       +--- Demande URL pré-signée S3 -------->|
                  +--- Réconciliation continue GitOps --->|    Direct PUT Client -> S3 -----------+
```

---

## 🔄 Les 4 Piliers GitOps (Argo CD Applications)

L'intégralité de la plateforme est orchestrée de manière 100 % déclarative via 4 applications Argo CD :

| Application Argo CD | Namespace Cible | Source / Path | Description |
| :--- | :---: | :--- | :--- |
| **`cloudvault-platform`** | `cloudvault` | `k8s/apps` (recurse) | Microservices backend Go, frontend Next.js, services, Ingress et `ServiceMonitor`. |
| **`ingress-controller`** | `ingress-nginx` | `k8s/infrastructure/ingress-controller` | Ingress NGINX DaemonSet exposé sur le port hôte 80 avec classe `nginx`. |
| **`monitoring-stack`** | `monitoring` | Helm `kube-prometheus-stack` (v65.8.1) | Opérateur Prometheus, Prometheus Server, Kube-State-Metrics, Node Exporter et Grafana. |
| **`monitoring-dashboards`** | `monitoring` | `k8s/monitoring/dashboards` | ConfigMaps des Dashboards Grafana auto-découvertes et montées via sidecar. |

```text
$ kubectl --kubeconfig=./kubeconfig -n argocd get applications
NAME                    SYNC STATUS   HEALTH STATUS
cloudvault-platform     Synced        Healthy
ingress-controller      Synced        Healthy
monitoring-dashboards   Synced        Healthy
monitoring-stack        Synced        Healthy
```

---

## 📈 Observabilité & Golden Signals (Prometheus / Grafana)

La plateforme intègre une stack d'observabilité de classe entreprise basée sur **Prometheus**, **Prometheus Operator** et **Grafana**, configurée pour un environnement de laboratoire sobre en ressources (Alertmanager désactivé, rétention 24h).

### 1. Collecte Déclarative via ServiceMonitor
Un manifest [`k8s/apps/servicemonitor.yaml`](k8s/apps/servicemonitor.yaml) cible le service `cloudvault-backend` et collecte les métriques toutes les 15 secondes sur le port `http` (`:8080/metrics`). Les 2 réplicas backend sont audités à l'état `UP`.

### 2. Métriques SRE Instrumentées (Golden Signals)
Le backend Go implémente nativement les métriques Prometheus suivantes (`internal/metrics/`) :
* `cloudvault_http_requests_total` (`CounterVec`) : Nombre total de requêtes HTTP ventilées par `method`, `path` (normalisé sans explosion de cardinalité) et `status`.
* `cloudvault_http_request_duration_seconds` (`HistogramVec`) : Latence des requêtes avec 9 buckets d'observation (`5ms`, `10ms`, `25ms`, `50ms`, `100ms`, `250ms`, `500ms`, `1s`, `2.5s`).
* `cloudvault_s3_operation_duration_seconds` (`HistogramVec`) : Durée des opérations S3 LocalStack par opération (`presign_put`, `list_objects`, `delete_object`).
* `cloudvault_s3_operations_total` (`CounterVec`) : Compteur des opérations S3 par opération et statut (`success`, `error`).

### 3. Dashboard Grafana Déclaratif Auto-Provisionné
Grafana est exposé sur le NodePort **`30300`** (`http://192.168.100.21:30300`, login : `admin` / `admin`).  
Le dashboard `"CloudVault Platform - Performance & SRE Golden Signals"` ([`grafana-dashboard-cloudvault.yaml`](k8s/monitoring/dashboards/grafana-dashboard-cloudvault.yaml)) est détecté et monté automatiquement par le sidecar `k8s-sidecar` grâce au label `grafana_dashboard: "1"` :

1. **Taux de Requêtes par Seconde (RPS) :** Débit en temps réel ventilé par codes HTTP 2xx (vert), 4xx (orange), et 5xx (rouge).
2. **Latence HTTP (Golden Signals) :** Percentiles P95 et P99 calculés via `histogram_quantile`.
3. **Durée des Opérations S3 LocalStack :** Latence P95 des interactions avec le bucket (`presign_put`, `list_objects`, `delete_object`).
4. **Empreinte Pods Backend Go :** Consommation CPU (`container_cpu_usage_seconds_total`) et RAM (`container_memory_working_set_bytes`) en temps réel.

---

## 🛠️ Architecture Logicielle & Cycle CRUD Sécurisé

### 1. Clean Architecture Backend Go (`apps/backend/`)
Le backend a été restructuré selon les standards CNCF :
```text
apps/backend/
├── cmd/server/main.go              # Point d'entrée, injection des dépendances, Graceful Shutdown (10s)
├── internal/
│   ├── config/config.go           # Configuration via variables d'environnement & whitelist MIME
│   ├── domain/document.go         # Entités métier & interface mockable DocumentStorage
│   ├── storage/s3.go              # Implémentation S3 AWS SDK v2 & mesure des latences
│   ├── handlers/                  # Handlers HTTP purs (net/http)
│   │   ├── document_handler.go    # Génération upload-url, inventaire et suppression DELETE
│   │   ├── health_handler.go      # Sondes Kubernetes /healthz et /readyz (check S3 réel)
│   │   └── document_handler_test.go # Tests unitaires mockés (100 % passants)
│   ├── middleware/                # Logging JSON slog, métriques Prometheus & CORS
│   └── metrics/metrics.go         # Définition des collecteurs Prometheus
```

### 2. Validation MIME Stricte & Cycle CRUD Complet
* **Validation MIME Stricte :** Tout fichier téléversé fait l'objet d'un contrôle strict de type MIME (`application/pdf`, `image/png`, `image/jpeg`, `text/plain`, `application/json`). Tout fichier exécutable ou non autorisé (ex: `.exe`, `application/x-msdownload`) est immédiatement rejeté avec le code **HTTP 400** (`INVALID_MIME_TYPE`).
* **Cycle CRUD Complet :**
  1. `POST /api/v1/documents/upload-url` : Allocation d'URL pré-signée S3.
  2. `PUT` direct vers S3 LocalStack (`cloudvault-documents`).
  3. `GET /api/v1/documents` : Liste horodatée des documents indexés.
  4. `DELETE /api/v1/documents/{key}` : Suppression physique irréversible de l'objet dans S3 LocalStack avec code HTTP 200.
* **Logging Structuré `log/slog` :** Toutes les requêtes sont tracées en JSON standardisé (`method`, `path`, `status`, `duration_ms`, `remote_addr`, `bytes_written`, `user_agent`).
* **Graceful Shutdown :** Écoute des signaux `SIGINT`/`SIGTERM` via `signal.NotifyContext` garantissant l'extinction propre et la vidange des connexions actives sous un délai de grâce de 10 secondes.

### 3. Frontend Next.js Modulaire (`apps/frontend/`)
* **Composants Découplés (`src/components/`) :** `UploadDropzone.tsx`, `DocumentList.tsx`, `DeleteModal.tsx`, `ProgressBar.tsx`.
* **Jauge de Progression Réelle XHR :** L'upload direct vers S3 utilise l'événement `xhr.upload.onprogress` de l'API `XMLHttpRequest`, offrant une jauge de progression réelle et continue de 0 % à 100 %.
* **Modale de Confirmation :** Protection contre les suppressions accidentelles avec modale interactive avant l'appel `DELETE`.

---

## ⚙️ Pipeline d'Intégration Continue (GitHub Actions CI)

Le fichier [`.github/workflows/ci.yml`](.github/workflows/ci.yml) automatise l'assurance qualité à chaque push et pull request sur la branche `main` :

1. **Job `backend-ci` (Go 1.23) :**
   - Vérification des modules Go (`go mod verify`).
   - Analyse statique (`go vet ./...`).
   - Exécution des tests avec race detector et profilage de couverture : `go test -v -race -cover ./...`.
2. **Job `frontend-ci` (Node.js 20) :**
   - Installation reproductible des dépendances : `npm ci`.
   - Contrôle strict des types TypeScript : `npx tsc --noEmit`.
   - Validation du lint Next.js et compilation de production : `npm run build`.
3. **Job `iac-k8s-ci` :**
   - Contrôle de formatage et validation Terraform : `terraform fmt -check`, `terraform validate`.
   - Contrôle syntaxique récursif des manifests YAML Kubernetes via script automatisé.

---

## 📊 Métriques de Performance & Empreinte Runtime

Mesures auditées en conditions réelles sur le cluster :

| Composant | Image Docker / Base | Taille Image | RAM Runtime (Pod) | Sécurité Conteneur |
| :--- | :--- | :---: | :---: | :--- |
| **Backend API (Go 1.23)** | `gcr.io/distroless/static:nonroot` | **12.5 MiB** | **~5 MiB** | UID `65532` non-root, aucun shell, statique |
| **Frontend UI (Next.js 14)** | `node:20-alpine` (Standalone) | **50.4 MiB** | **~25 MiB** | UID `1001` (`nextjs`), non-root, cache optimisé |
| **Prometheus Server (v2.55)** | `quay.io/prometheus/prometheus` | Standard | **~250 MiB** | Rétention 24h, scrape interval 15s |
| **Grafana UI (v11.3)** | `docker.io/grafana/grafana` | Standard | **~90 MiB** | NodePort 30300, sidecar auto-provisioning |
| **Cluster Orchestration** | K3s Light Kubernetes | — | < 500 MiB / nœud | SQLite interne, Flannel VXLAN, HostNetwork NGINX |
| **Boucle GitOps (Argo CD)** | `selfHeal: true` | — | **~52 ms** | Correction instantanée de toute dérive déclarée |

---

## 🚀 Guide de Reproduction Rapide (Quickstart)

### Prérequis
- 3 machines virtuelles Ubuntu 22.04 LTS configurées sur `192.168.100.10`, `192.168.100.20`, `192.168.100.21` avec accès SSH sans mot de passe pour l'utilisateur `ubuntu`.
- Station de contrôle WSL2 avec `ansible`, `terraform`, `kubectl`, `python3` et `curl`.

### Étape 1 : Automatisation Zero-Touch via Makefile
La plateforme fournit un point d'entrée universel pour orchestrer l'ensemble des opérations :
```bash
# 1. Déploiement complet des nœuds et des services via Ansible
make bootstrap

# 2. Déploiement déclaratif de l'IaC Terraform conteneurisée (hashicorp/terraform:1.9)
make tf-apply

# 3. Analyse de sécurité DevSecOps Trivy locale (IaC & configurations)
make scan

# 4. Exécution des tests unitaires Go avec détection de concurrence (-race -cover)
make test

# 5. Validation automatisée de bout en bout
make demo
```

### Étape 2 : Bootstrap des Applications GitOps (Argo CD)
```bash
# 1. Déploiement de l'Ingress NGINX
kubectl --kubeconfig=./kubeconfig apply -f k8s/infrastructure/ingress-controller-app.yaml

# 2. Déploiement de la stack d'observabilité Prometheus / Grafana
kubectl --kubeconfig=./kubeconfig apply -f k8s/infrastructure/monitoring/monitoring-stack.yaml

# 3. Déploiement des Dashboards Grafana déclaratifs
kubectl --kubeconfig=./kubeconfig apply -f k8s/infrastructure/monitoring/monitoring-dashboards-app.yaml

# 4. Déploiement des microservices CloudVault
kubectl --kubeconfig=./kubeconfig apply -f k8s/root-application.yaml
```

---

## 🧪 Tests & Validation Automatisée

Le dépôt inclut 2 suites de validation automatisées exécutables en une commande :

```bash
# 1. Validation E2E complète (Sondes, URLs pré-signées, upload S3, routage Ingress)
./scripts/demo-e2e.sh

# 2. Validation CRUD complète & protection stricte contre malware MIME
python3 tests/test_crud_complete.py

# 3. Audit en direct de la stack d'observabilité (Prometheus & Grafana)
python3 tests/verify_observability.py
```

---

## 🌐 Points d'Accès de la Plateforme

| Service | URL / Port | Protocole / Auth |
| :--- | :--- | :--- |
| **Application Web CloudVault** | `http://cloudvault.local/` (192.168.100.21:80) | HTTP Ingress NGINX |
| **Grafana UI & Dashboards** | `http://192.168.100.21:30300` | NodePort / `admin` : `admin` |
| **Dashboard SRE Golden Signals** | `http://192.168.100.21:30300/d/cloudvault-sre-golden-signals` | Direct Dashboard Link |
| **Prometheus API** | `http://10.43.65.84:9090` | ClusterIP Interne |
| **Backend Raw Metrics** | `http://192.168.100.21:30081/metrics` | NodePort format Prometheus |
| **Argo CD UI** | `https://192.168.100.20:30443` | NodePort HTTPS |
| **LocalStack S3 Gateway** | `http://192.168.100.10:4566` | REST API AWS S3 |

---

## 📂 Structure du Répertoire

```text
cloudvault-gitops-platform/
├── .github/
│   └── workflows/
│       └── ci.yml            # Pipeline CI/CD DevSecOps (Backend, Frontend, IaC/K8s & Trivy Scan)
├── Makefile                  # Point d'entrée Zero-Touch (make bootstrap, tf-apply, scan, test, demo)
├── ansible/                  # Automatisation Ansible multi-nœuds (K3s, Docker, LocalStack, Terraform)
├── apps/
│   ├── backend/              # Microservice Go 1.23 (Clean Arch, Presigned URLs, Partage 15m/1h/24h)
│   │   ├── cmd/server/       # Point d'entrée du serveur HTTP
│   │   └── internal/         # Packages config, domain, storage, handlers, middleware, metrics
│   └── frontend/             # Application Next.js 14 (Composants modulaires, XHR Progress, ShareModal)
│       └── src/
│           ├── components/   # UploadDropzone, DocumentList, DeleteModal, ShareModal, ProgressBar
│           └── types/        # Types TypeScript
├── infra-services/
│   ├── localstack/           # Docker Compose & boot hook persistant init-s3.sh
│   └── terraform/            # Configuration déclarative S3 (Versioning, FinOps Lifecycle) & IAM
├── k8s/                      # Manifestes Kubernetes déclaratifs gérés par Argo CD
│   ├── apps/                 # Déploiements, Secrets S3, NetworkPolicies Zero-Trust et Ingress
│   ├── infrastructure/       # Ingress NGINX et Applications Argo CD monitoring
│   │   └── monitoring/       # monitoring-stack.yaml et monitoring-dashboards-app.yaml
│   ├── monitoring/
│   │   └── dashboards/       # ConfigMap Grafana Dashboard Golden Signals
│   └── root-application.yaml # Application Argo CD principale (cloudvault-platform)
├── scripts/                  # Scripts de démonstration et validation E2E
│   └── demo-e2e.sh
└── tests/                    # Suites de tests automatisés Python et Bash
    ├── test_crud_complete.py # Validation CRUD DELETE et protection MIME
    ├── test_share_url.sh     # Validation du partage temporaire et téléchargement
    ├── verify_observability.py # Audit API Grafana et Prometheus
    └── validate_k8s_yaml.py  # Contrôleur syntaxique YAML des manifests
```

---

## 📜 Licence
Ce projet est sous licence open-source **[MIT](LICENSE)**. Conçu avec rigueur pour illustrer les meilleures pratiques de l'ingénierie Cloud, DevOps et SRE moderne.
