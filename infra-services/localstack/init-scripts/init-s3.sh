#!/usr/bin/env bash
awslocal s3 mb s3://cloudvault-documents || true
awslocal s3api put-bucket-versioning --bucket cloudvault-documents --versioning-configuration Status=Enabled || true
awslocal s3 mb s3://cloudvault-terraform-state || true
awslocal s3api put-bucket-versioning --bucket cloudvault-terraform-state --versioning-configuration Status=Enabled || true

# Configuration CORS pour autoriser le téléversement direct depuis les navigateurs Web
cat << 'EOF' > /tmp/cors.json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["PUT", "POST", "GET", "HEAD", "DELETE"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF
awslocal s3api put-bucket-cors --bucket cloudvault-documents --cors-configuration file:///tmp/cors.json || true

