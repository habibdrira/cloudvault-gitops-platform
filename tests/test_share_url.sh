#!/usr/bin/env bash
set -euo pipefail

KEY="1794488197_demo-proof.txt"
echo "=== Test POST /api/v1/documents/${KEY}/share ==="

RESP=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Host: cloudvault.local" \
  -H "Content-Type: application/json" \
  -d '{"expires_in_minutes": 15}' \
  "http://192.168.100.21/api/v1/documents/${KEY}/share")

BODY=$(echo "${RESP}" | sed '$d')
CODE=$(echo "${RESP}" | tail -n 1)

echo "HTTP Status: ${CODE}"
echo "Response Body:"
echo "${BODY}" | python3 -m json.tool

SHARE_URL=$(echo "${BODY}" | python3 -c 'import sys, json; print(json.load(sys.stdin)["share_url"])')
echo ""
echo "=== Test GET Download via Share URL ==="
DOWNLOAD_CONTENT=$(curl -s "${SHARE_URL}")
echo "Downloaded Content:"
echo "${DOWNLOAD_CONTENT}"

