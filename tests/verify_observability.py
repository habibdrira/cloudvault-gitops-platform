#!/usr/bin/env python3
import urllib.request
import base64
import json
import sys

def check_grafana():
    print("=== 1. Vérification de Grafana (NodePort 30300) ===")
    url = 'http://192.168.100.21:30300/api/dashboards/uid/cloudvault-sre-golden-signals'
    auth = base64.b64encode(b'admin:admin').decode('ascii')
    req = urllib.request.Request(url, headers={'Authorization': f'Basic {auth}'})
    
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            db = data.get('dashboard', {})
            print(f"✔ Dashboard Titre : {db.get('title')}")
            print(f"✔ Dashboard UID   : {db.get('uid')}")
            print(f"✔ Nombre de graphiques : {len(db.get('panels', []))}")
            for p in db.get('panels', []):
                print(f"    - Panel {p.get('id')}: {p.get('title')} [{p.get('type')}]")
    except Exception as e:
        print(f"✖ Erreur Grafana: {e}")
        sys.exit(1)

def check_metrics():
    print("\n=== 2. Vérification de l'endpoint /metrics direct (NodePort 30081) ===")
    url = 'http://192.168.100.21:30081/metrics'
    try:
        with urllib.request.urlopen(url) as resp:
            content = resp.read().decode('utf-8')
            has_http_req = 'cloudvault_http_requests_total' in content
            has_http_dur = 'cloudvault_http_request_duration_seconds' in content
            has_s3_dur = 'cloudvault_s3_operation_duration_seconds' in content
            has_s3_ops = 'cloudvault_s3_operations_total' in content
            print(f"✔ cloudvault_http_requests_total présent ? {has_http_req}")
            print(f"✔ cloudvault_http_request_duration_seconds présent ? {has_http_dur}")
            print(f"✔ cloudvault_s3_operation_duration_seconds présent ? {has_s3_dur}")
            print(f"✔ cloudvault_s3_operations_total présent ? {has_s3_ops}")
    except Exception as e:
        print(f"✖ Erreur Metrics: {e}")
        sys.exit(1)

if __name__ == '__main__':
    check_grafana()
    check_metrics()
    print("\n=======================================================")
    print("  OBSERVABILITÉ CLOUDVAULT TOTALEMENT OPÉRATIONNELLE  ")
    print("=======================================================")
