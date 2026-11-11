import json
import urllib.request

backend_url = "http://192.168.100.21:30081"
filename = "cloudvault-audit-report.pdf"
file_content = b"CloudVault Platform Automated Validation: GitOps pipeline functional and S3 storage operational."

print("=== 1. Requesting Pre-signed Upload URL ===")
req = urllib.request.Request(
    f"{backend_url}/api/v1/documents/upload-url",
    data=json.dumps({"filename": filename}).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode("utf-8"))
    upload_url = data["upload_url"]
    file_key = data["key"]
    print(f"Status Code: {resp.status}")
    print(f"Allocated S3 Key: {file_key}")
    print(f"Pre-signed URL: {upload_url[:90]}...")

print("\n=== 2. Direct S3 Upload via Pre-signed URL ===")
upload_req = urllib.request.Request(
    upload_url,
    data=file_content,
    headers={"Content-Type": "application/octet-stream"},
    method="PUT"
)
with urllib.request.urlopen(upload_req) as resp:
    print(f"S3 PutObject Status Code: {resp.status} (OK)")

print("\n=== 3. Querying GET /api/v1/documents ===")
list_req = urllib.request.Request(f"{backend_url}/api/v1/documents", method="GET")
with urllib.request.urlopen(list_req) as resp:
    docs = json.loads(resp.read().decode("utf-8"))
    print(f"Status Code: {resp.status}")
    print(f"Total documents found: {len(docs.get('documents', []))}")
    for doc in docs.get("documents", []):
        print(f"  * Key: {doc.get('key')} | Size: {doc.get('size')} bytes | LastModified: {doc.get('last_modified')}")
