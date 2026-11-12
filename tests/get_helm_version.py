import urllib.request
import yaml

url = "https://prometheus-community.github.io/helm-charts/index.yaml"
req = urllib.request.urlopen(url)
content = yaml.safe_load(req.read())
versions = [entry["version"] for entry in content["entries"]["kube-prometheus-stack"][:10]]
print("Top 10 versions:", versions)

