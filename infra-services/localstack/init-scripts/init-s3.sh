#!/usr/bin/env bash
awslocal s3 mb s3://cloudvault-documents || true
awslocal s3api put-bucket-versioning --bucket cloudvault-documents --versioning-configuration Status=Enabled || true
