import os
import yaml
import sys

has_error = False
for root, _, files in os.walk('k8s'):
    for f in sorted(files):
        if f.endswith(('.yaml', '.yml')):
            p = os.path.join(root, f)
            with open(p, 'r') as fh:
                try:
                    list(yaml.safe_load_all(fh))
                    print(f"✔ Valid: {p}")
                except Exception as e:
                    print(f"✖ Error in {p}: {e}")
                    has_error = True

if has_error:
    sys.exit(1)
print("All Kubernetes manifests are syntactically valid!")
