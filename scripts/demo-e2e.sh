#!/usr/bin/env bash
# ==============================================================================
# CloudVault GitOps Platform — End-to-End Automated Demo & Verification Script
# ==============================================================================
# Architecture :
#   - Ingress NGINX : http://192.168.100.21 (Host: cloudvault.local)
#   - Backend NodePort : http://192.168.100.21:30081 (Liveness / Readiness)
#   - LocalStack S3 : http://192.168.100.10:4566 (Direct presigned PUT)
# ==============================================================================

set -euo pipefail

# ANSI Formatting
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

# Config
INGRESS_IP="${INGRESS_IP:-192.168.100.21}"
NODEPORT_IP="${NODEPORT_IP:-192.168.100.21}"
BACKEND_PORT="${BACKEND_PORT:-30081}"
HOST_HEADER="cloudvault.local"
TEST_FILE="demo-proof.txt"
TEST_CONTENT="CloudVault GitOps Platform E2E Validation Proof - Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ') - Platform fully resilient."

echo -e "${BOLD}${CYAN}=====================================================================${RESET}"
echo -e "${BOLD}${CYAN}   CloudVault GitOps Platform — Automated E2E Validation Pipeline    ${RESET}"
echo -e "${BOLD}${CYAN}=====================================================================${RESET}"
echo -e "Target Ingress Host  : ${YELLOW}${HOST_HEADER} (${INGRESS_IP}:80)${RESET}"
echo -e "Backend Direct Probe : ${YELLOW}${NODEPORT_IP}:${BACKEND_PORT}${RESET}"
echo -e "Target Test Document : ${YELLOW}${TEST_FILE}${RESET}"
echo ""

# ------------------------------------------------------------------------------
# Étape 1 : Vérification des sondes de santé Backend (Liveness & Readiness)
# ------------------------------------------------------------------------------
echo -e "${BOLD}[Étape 1/4] Validation des sondes de santé Backend K8s (/healthz, /readyz)...${RESET}"

HEALTHZ_CODE=$(curl -s -o /tmp/healthz_resp.json -w "%{http_code}" "http://${NODEPORT_IP}:${BACKEND_PORT}/healthz")
if [ "${HEALTHZ_CODE}" -ne 200 ]; then
    echo -e "${RED}[ERREUR] Sondes Liveness /healthz a retourné HTTP ${HEALTHZ_CODE}${RESET}"
    exit 1
fi
echo -e "  ${GREEN}✔${RESET} Liveness Probe  (/healthz) : ${GREEN}HTTP 200 OK${RESET}"
cat /tmp/healthz_resp.json | python3 -m json.tool | sed 's/^/    /'

READYZ_CODE=$(curl -s -o /tmp/readyz_resp.json -w "%{http_code}" "http://${NODEPORT_IP}:${BACKEND_PORT}/readyz")
if [ "${READYZ_CODE}" -ne 200 ]; then
    echo -e "${RED}[ERREUR] Sondes Readiness /readyz a retourné HTTP ${READYZ_CODE}${RESET}"
    exit 1
fi
echo -e "  ${GREEN}✔${RESET} Readiness Probe (/readyz)  : ${GREEN}HTTP 200 OK${RESET} (Connexion S3 vérifiée)"
cat /tmp/readyz_resp.json | python3 -m json.tool | sed 's/^/    /'
echo ""

# ------------------------------------------------------------------------------
# Étape 2 : Demande d'URL pré-signée S3 via l'Ingress NGINX (Port 80)
# ------------------------------------------------------------------------------
echo -e "${BOLD}[Étape 2/4] Demande d'URL pré-signée S3 via POST /api/v1/documents/upload-url...${RESET}"

UPLOAD_URL_RESP=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Host: ${HOST_HEADER}" \
    -H "Content-Type: application/json" \
    -d "{\"filename\": \"${TEST_FILE}\", \"content_type\": \"text/plain\"}" \
    "http://${INGRESS_IP}/api/v1/documents/upload-url")

HTTP_BODY=$(echo "${UPLOAD_URL_RESP}" | sed '$d')
HTTP_CODE=$(echo "${UPLOAD_URL_RESP}" | tail -n 1)

if [ "${HTTP_CODE}" -ne 201 ] && [ "${HTTP_CODE}" -ne 200 ]; then
    echo -e "${RED}[ERREUR] Échec de la génération d'URL pré-signée : HTTP ${HTTP_CODE}${RESET}"
    echo "${HTTP_BODY}"
    exit 1
fi

PRESIGNED_URL=$(echo "${HTTP_BODY}" | python3 -c 'import sys, json; print(json.load(sys.stdin)["upload_url"])')
S3_OBJECT_KEY=$(echo "${HTTP_BODY}" | python3 -c 'import sys, json; print(json.load(sys.stdin)["key"])')

echo -e "  ${GREEN}✔${RESET} Ingress Routing     : ${GREEN}HTTP ${HTTP_CODE} Created${RESET}"
echo -e "  ${GREEN}✔${RESET} Clé S3 allouée      : ${YELLOW}${S3_OBJECT_KEY}${RESET}"
echo -e "  ${GREEN}✔${RESET} URL pré-signée S3   : ${CYAN}${PRESIGNED_URL:0:80}...${RESET}"
echo ""

# ------------------------------------------------------------------------------
# Étape 3 : Téléversement direct du fichier vers S3 LocalStack via URL pré-signée
# ------------------------------------------------------------------------------
echo -e "${BOLD}[Étape 3/4] Téléversement direct sécurisé (HTTP PUT) vers S3 LocalStack...${RESET}"
echo -e "  Contenu injecté : \"${TEST_CONTENT}\""

PUT_CODE=$(curl -s -o /tmp/s3_put_resp.txt -w "%{http_code}" -X PUT \
    -H "Content-Type: text/plain" \
    --data "${TEST_CONTENT}" \
    "${PRESIGNED_URL}")

if [ "${PUT_CODE}" -ne 200 ]; then
    echo -e "${RED}[ERREUR] Échec du PUT S3 : HTTP ${PUT_CODE}${RESET}"
    cat /tmp/s3_put_resp.txt
    exit 1
fi
echo -e "  ${GREEN}✔${RESET} Téléversement S3    : ${GREEN}HTTP 200 OK${RESET} (Stocké dans 'cloudvault-documents')"
echo ""

# ------------------------------------------------------------------------------
# Étape 4 : Interrogation GET /api/v1/documents et validation de la persistance
# ------------------------------------------------------------------------------
echo -e "${BOLD}[Étape 4/4] Interrogation de l'inventaire via GET /api/v1/documents...${RESET}"

LIST_RESP=$(curl -s -w "\n%{http_code}" -X GET \
    -H "Host: ${HOST_HEADER}" \
    "http://${INGRESS_IP}/api/v1/documents")

LIST_BODY=$(echo "${LIST_RESP}" | sed '$d')
LIST_CODE=$(echo "${LIST_RESP}" | tail -n 1)

if [ "${LIST_CODE}" -ne 200 ]; then
    echo -e "${RED}[ERREUR] Échec du listing des documents : HTTP ${LIST_CODE}${RESET}"
    exit 1
fi

echo -e "  ${GREEN}✔${RESET} Réponse API Ingress : ${GREEN}HTTP 200 OK${RESET}"
echo -e "${BOLD}Documents persistés dans S3 :${RESET}"
echo "${LIST_BODY}" | python3 -m json.tool | sed 's/^/  /'

# Vérification formelle que la clé S3 créée est bien présente
FOUND=$(echo "${LIST_BODY}" | python3 -c '
import sys, json
data = json.load(sys.stdin)
target_key = sys.argv[1]
found = any(doc.get("key") == target_key for doc in data.get("documents", []))
print("FOUND" if found else "NOT_FOUND")
' "${S3_OBJECT_KEY}")

echo ""
if [ "${FOUND}" = "FOUND" ]; then
    echo -e "${BOLD}${GREEN}=====================================================================${RESET}"
    echo -e "${BOLD}${GREEN}  VALIDATION E2E RÉUSSIE AVEC SUCCÈS ! LA PLATEFORME EST CONFORME    ${RESET}"
    echo -e "${BOLD}${GREEN}=====================================================================${RESET}"
else
    echo -e "${RED}[ERREUR] Le document ${S3_OBJECT_KEY} n'a pas été retrouvé dans la liste S3.${RESET}"
    exit 1
fi

