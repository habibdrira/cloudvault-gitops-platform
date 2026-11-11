# CloudVault GitOps Platform 🛡️🚀

[![Kubernetes K3s](https://img.shields.io/badge/Kubernetes-K3s%20v1.31-326CE5?logo=kubernetes&logoColor=white)](https://k3s.io)
[![GitOps ArgoCD](https://img.shields.io/badge/GitOps-Argo%20CD%20v2.12-EF6B48?logo=argo&logoColor=white)](https://argoproj.github.io/cd/)
[![Terraform](https://img.shields.io/badge/IaC-Terraform%20v1.9-844FBA?logo=terraform&logoColor=white)](https://terraform.io)
[![Ansible](https://img.shields.io/badge/Automation-Ansible%20Core-EE0000?logo=ansible&logoColor=white)](https://ansible.com)
[![LocalStack S3](https://img.shields.io/badge/AWS%20Mock-LocalStack%203.8-0052CC?logo=amazons3&logoColor=white)](https://localstack.cloud)
[![Go Backend](https://img.shields.io/badge/Backend-Go%201.23%20Distroless-00ADD8?logo=go&logoColor=white)](https://golang.org)
[![Next.js Frontend](https://img.shields.io/badge/Frontend-Next.js%2015%20Standalone-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **CloudVault** est une plateforme documentaire d'entreprise moderne, hautement disponible et orchestrée selon les principes **GitOps & SRE de bout en bout**.  
> Elle associe l'automatisation de l'infrastructure déclarative (**Ansible** & **Terraform**), un cluster **Kubernetes K3s** multi-nœuds, la réconciliation continue par **Argo CD**, un stockage objet mocké **AWS S3 (LocalStack)** et une architecture microservices ultra-légère en conteneurs **Distroless non-root**.

---

## 🏛️ Architecture Technique & Flux de Données

L'infrastructure s'étend sur un réseau virtuel privé dédié (`VMnet8 : 192.168.100.0/24`) piloté depuis une station de contrôle **WSL2** :

```text
                                  +---------------------------------------+
                                  |   WSL2 Control Station (Admin / CI)  |
                                  |   Ansible | Terraform | Kubectl       |
                                  +-------------------+-------------------+
                                                      |
                          DNS: cloudvault.local:80    | Git Commit & Push
                                                      v
  ===================================== VMnet8 (192.168.100.0/24) =====================================
                                                      |
            +-----------------------------------------+-----------------------------------------+
            |                                         |                                         |
            v (HTTP Host: cloudvault.local)           v (Cluster Internal)                      v (Cloud Mocking)
+-----------------------------------+   +-----------------------------------+   +-----------------------------------+
|            k8s-master             |   |            k8s-worker             |   |            infra-node             |
|         (192.168.100.20)          |   |         (192.168.100.21)          |   |         (192.168.100.10)          |
+-----------------------------------+   +-----------------------------------+   +-----------------------------------+
|  [Ingress NGINX] (HostNetwork:80) |   |  [Ingress NGINX] (HostNetwork:80) |   |  [Docker Engine 27+]              |
|  - Ingress Controller             |   |  - Ingress Controller             |   |                                   |
|                                   |   |                                   |   |  [LocalStack Container 3.8]       |
|  [Control Plane K3s]              |   |  [Worker Node K3s]                |   |  - Gateway Port: 4566             |
|  - CoreDNS, Metrics Server        |   |                                   |   |  - Services: S3, IAM, STS         |
|  - Local-Path Provisioner         |   |  [Application Pods - Namespace:   |   |  - Bucket: cloudvault-documents   |
|                                   |   |                  cloudvault]      |   |                                   |
|  [Argo CD GitOps Engine]          |   |  * cloudvault-backend (Go)        |   |  [Boot Hook Persistence]          |
|  - Application Controller         |   |    Port 8080 (NodePort: 30081)    |   |  - /etc/localstack/init/ready.d/  |
|  - Repo Server & API Server       |   |  * cloudvault-frontend (Next.js)  |   |    init-s3.sh (auto-recreate)     |
|  - Self-Heal & Auto-Prune Loop    |   |    Port 3000 (NodePort: 30000)    |   +-----------------------------------+
+-----------------------------------+   +-----------------------------------+                     ^
                  |                                       |                                       |
                  |                                       +--- Demande URL pré-signée S3 -------->|
                  +--- Réconciliation continue GitOps --->|    Direct PUT Client -> S3 -----------+
```

### ⚡ Flux d'Upload Sécurisé (Pre-signed S3 URL Pattern)
1. **Requête Client :** Le navigateur ou le client adresse un `POST /api/v1/documents/upload-url` avec le nom du fichier vers `cloudvault.local:80` (Ingress NGINX).
2. **Génération d'URL :** Le backend Go génère une URL pré-signée cryptographiquement via AWS SDK v2 (`s3.PresignPutObject`) avec une validité de 15 minutes.
3. **Upload Direct :** Le client effectue un `PUT` HTTP direct vers LocalStack S3 (`http://192.168.100.10:4566/cloudvault-documents/...`), **déchargeant à 100 % la bande passante du cluster Kubernetes**.
4. **Indexation & Consultation :** Un `GET /api/v1/documents` renvoie la liste horodatée des objets S3 avec leurs métadonnées et URLs de téléchargement sécurisées.

---

## 📊 Métriques de Performance & Empreinte Runtime

Mesures auditées en conditions réelles sur le cluster :

| Composant | Image Docker / Base | Taille Image | RAM Runtime (Pod) | Sécurité Conteneur |
| :--- | :--- | :---: | :---: | :--- |
| **Backend API (Go 1.23)** | `gcr.io/distroless/static:nonroot` | **4.1 MiB** | **~3 MiB** | UID `65532` non-root, aucun shell, statique |
| **Frontend UI (Next.js 15)** | `node:20-alpine` (Standalone) | **50.4 MiB** | **~25 MiB** | UID `1001` (`nextjs`), non-root, cache optimisé |
| **Cluster Orchestration** | K3s Light Kubernetes | — | < 500 MiB / nœud | SQLite interne, Flannel VXLAN, HostNetwork NGINX |
| **Boucle GitOps (Argo CD)** | `selfHeal: true` | — | **~52 ms** | Correction instantanée de toute dérive manuelle |
| **Résilience Pod Failover** | K8s ReplicaSet | — | **< 15 s** | Recréation et passage à `1/1 Ready` après crash |

---

## 🔒 Standards de Sécurité & Ingénierie SRE

* **Idempotence & IaC Déclarative :** L'intégralité du système est déployé par playbook **Ansible** (`site.yml`) et **Terraform** (`main.tf`). Aucune configuration manuelle n'est tolérée.
* **Architecture Zero-Trust :**
  * Les conteneurs applicatifs s'exécutent avec des utilisateurs non privilégiés (UID `65532` et `1001`).
  * Les secrets et variables d'environnement (`AWS_ACCESS_KEY_ID`, `AWS_ENDPOINT_URL`) sont injectés de façon déclarative sans privilèges racine.
* **Auto-Guérison GitOps (Self-Healing) :**
  * Argo CD surveille le dépôt Git `main`.
  * Toute altération manuelle (ex: `kubectl scale --replicas=4`) est immédiatement détectée (`OutOfSync`) et réconciliée (`Synced`, 2 répliques) en moins d'une seconde.
* **Résilience au Redémarrage à Froid (Boot Hook Persistence) :**
  * Les conteneurs LocalStack Community perdent classiquement leur état S3 en RAM au reboot.
  * CloudVault intègre un hook d'amorçage monté sur `/etc/localstack/init/ready.d/init-s3.sh`. Au démarrage du démon Docker sur `infra-node`, le bucket `cloudvault-documents` est auto-initialisé instantanément.
* **Sondes Kubernetes Haute Précision :**
  * `/healthz` : Sonde de vivacité (Liveness).
  * `/readyz` : Sonde de préparation (Readiness) qui teste activement la connectivité réelle au bucket S3 via `s3:HeadBucket`.

---

## 🚀 Guide de Reproduction Rapide (Quickstart)

### Prérequis
- 3 machines virtuelles Ubuntu 22.04 LTS configurées sur `192.168.100.10`, `192.168.100.20`, `192.168.100.21` avec accès SSH sans mot de passe pour l'utilisateur `ubuntu`.
- Station de contrôle WSL2 avec `ansible`, `terraform`, `kubectl` et `curl`.

### Étape 1 : Déploiement du Socle Système & Cluster (Ansible)
Depuis la racine du dépôt :
```bash
ansible-playbook -i ansible/inventory/hosts.ini ansible/site.yml
```
*Configure Docker & LocalStack sur `infra-node`, installe K3s Server sur `k8s-master`, K3s Agent sur `k8s-worker`, déploie Argo CD et extrait le `kubeconfig` local.*

### Étape 2 : Déploiement Déclaratif du Stockage Cloud (Terraform)
```bash
cd infra-services/terraform
terraform init
terraform apply -auto-approve
cd ../..
```
*Provisionne le bucket S3 `cloudvault-documents`, les restrictions publiques et le rôle IAM avec ses politiques de lecture/écriture.*

### Étape 3 : Bootstrap de l'Application GitOps (Argo CD)
```bash
kubectl --kubeconfig=./kubeconfig apply -f k8s/root-application.yaml
```
*Argo CD prend le relais, synchronise les déploiements backend, frontend et l'Ingress NGINX. L'application devient `Healthy` automatiquement.*

---

## 🧪 Validation Automatisée de Bout en Bout (E2E Demo)

Le dépôt inclut un script de test exhaustif qui valide la plateforme en une seule commande :

```bash
./scripts/demo-e2e.sh
```

### Extrait de la sortie d'exécution :
```text
=====================================================================
   CloudVault GitOps Platform — Automated E2E Validation Pipeline    
=====================================================================
Target Ingress Host  : cloudvault.local (192.168.100.21:80)
Backend Direct Probe : 192.168.100.21:30081
Target Test Document : demo-proof.txt

[Étape 1/4] Validation des sondes de santé Backend K8s (/healthz, /readyz)...
  ✔ Liveness Probe  (/healthz) : HTTP 200 OK
  ✔ Readiness Probe (/readyz)  : HTTP 200 OK (Connexion S3 vérifiée)

[Étape 2/4] Demande d'URL pré-signée S3 via POST /api/v1/documents/upload-url...
  ✔ Ingress Routing     : HTTP 201 Created
  ✔ Clé S3 allouée      : 1794428012_demo-proof.txt
  ✔ URL pré-signée S3   : http://192.168.100.10:4566/cloudvault-documents/1794428012_demo-proof.txt?...

[Étape 3/4] Téléversement direct sécurisé (HTTP PUT) vers S3 LocalStack...
  ✔ Téléversement S3    : HTTP 200 OK (Stocké dans 'cloudvault-documents')

[Étape 4/4] Interrogation de l'inventaire via GET /api/v1/documents...
  ✔ Réponse API Ingress : HTTP 200 OK
  Total documents indexés : 1

=====================================================================
  VALIDATION E2E RÉUSSIE AVEC SUCCÈS ! LA PLATEFORME EST CONFORME    
=====================================================================
```

---

## 📂 Structure du Répertoire

```text
cloudvault-gitops-platform/
├── ansible/                  # Automatisation Ansible multi-nœuds
│   ├── inventory/            # Inventaire dynamique et group_vars (all.yml)
│   ├── roles/                # Rôles : common, infra_services, k3s_server, k3s_agent, argocd
│   └── site.yml              # Playbook maître d'orchestration
├── apps/                     # Code source des microservices
│   ├── backend/              # Microservice Go (Presigned URLs, S3 SDK v2, Distroless)
│   └── frontend/             # Interface Next.js 15 (Tailwind, Lucide, Standalone)
├── infra-services/           # Services d'infrastructure partagée
│   ├── localstack/           # Docker Compose & scripts de boot hook (/etc/localstack/init/ready.d)
│   └── terraform/            # Configuration déclarative S3 & IAM
├── k8s/                      # Manifestes Kubernetes gérés par Argo CD
│   ├── apps/                 # Déploiements backend, frontend, services & Ingress NGINX
│   ├── infrastructure/       # Contrôleur Ingress NGINX DaemonSet & Application GitOps
│   └── root-application.yaml # Application parente Argo CD (App-of-Apps pattern)
├── scripts/                  # Scripts utilitaires & validation
│   └── demo-e2e.sh           # Pipeline de démonstration E2E automatisé
└── tests/                    # Tests d'intégration automatisés
```

---

## 📜 Licence
Ce projet est sous licence open-source **[MIT](LICENSE)**. Conçu avec rigueur pour illustrer les meilleures pratiques de l'ingénierie Cloud, DevOps et SRE moderne.
