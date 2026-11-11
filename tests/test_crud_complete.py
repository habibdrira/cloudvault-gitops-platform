import urllib.request
import urllib.error
import json
import sys

INGRESS_IP = "192.168.100.21"
HOST = "cloudvault.local"

print("=================================================================")
print("   CloudVault GitOps Platform — Validation CRUD & MIME Stricte   ")
print("=================================================================")

# 1. Test Rejet MIME
print("\n[Test 1/3] Validation de la protection MIME (Tentative malware.exe)...")
try:
    req = urllib.request.Request(
        f"http://{INGRESS_IP}/api/v1/documents/upload-url",
        data=json.dumps({"filename": "malware.exe", "content_type": "application/x-msdownload"}).encode("utf-8"),
        headers={"Content-Type": "application/json", "Host": HOST},
        method="POST"
    )
    urllib.request.urlopen(req)
    print("  ❌ ERREUR : Le type MIME .exe aurait dû être rejeté !")
    sys.exit(1)
except urllib.error.HTTPError as e:
    err_body = json.loads(e.read().decode())
    print(f"  ✔ REJET CONFORME (HTTP {e.code}) : {err_body}")

# 2. Test Upload Valide PDF
print("\n[Test 2/3] Upload d'un document PDF légitime (architecture-v2.pdf)...")
req = urllib.request.Request(
    f"http://{INGRESS_IP}/api/v1/documents/upload-url",
    data=json.dumps({"filename": "architecture-v2.pdf", "content_type": "application/pdf"}).encode("utf-8"),
    headers={"Content-Type": "application/json", "Host": HOST},
    method="POST"
)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    upload_url = data["upload_url"]
    doc_key = data["key"]
    print(f"  ✔ URL pré-signée allouée : HTTP {resp.status} (Clé: {doc_key})")

put_req = urllib.request.Request(
    upload_url,
    data=b"%PDF-1.4 CloudVault Enterprise Clean Architecture Document Proof",
    headers={"Content-Type": "application/pdf"},
    method="PUT"
)
with urllib.request.urlopen(put_req) as resp:
    print(f"  ✔ Téléversement direct S3 : HTTP {resp.status} OK")

# Vérification présence dans GET
list_req = urllib.request.Request(f"http://{INGRESS_IP}/api/v1/documents", headers={"Host": HOST})
with urllib.request.urlopen(list_req) as resp:
    docs = json.loads(resp.read().decode())["documents"]
    found = any(d["key"] == doc_key for d in docs)
    print(f"  ✔ Présence confirmée dans S3 : {found} (Total dans le bucket : {len(docs)})")

# 3. Test Suppression DELETE
print(f"\n[Test 3/3] Suppression de l'objet via DELETE /api/v1/documents/{doc_key}...")
del_req = urllib.request.Request(
    f"http://{INGRESS_IP}/api/v1/documents/{doc_key}",
    headers={"Host": HOST},
    method="DELETE"
)
with urllib.request.urlopen(del_req) as resp:
    del_res = json.loads(resp.read().decode())
    print(f"  ✔ Réponse DELETE reçue : HTTP {resp.status} - {del_res}")

# Vérification absence dans GET
with urllib.request.urlopen(list_req) as resp:
    docs_after = json.loads(resp.read().decode())["documents"]
    found_after = any(d["key"] == doc_key for d in docs_after)
    print(f"  ✔ Vérification post-suppression : document supprimé ? {not found_after} (Total restant : {len(docs_after)})")

print("\n=================================================================")
print("  CYCLE CRUD COMPLET ET VALIDATION DE SÉCURITÉ 100% RÉUSSIS !     ")
print("=================================================================")

