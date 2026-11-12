# ============================================================================
# CloudVault — Infrastructure Cloud Déclarative (S3 & IAM via LocalStack)
# ============================================================================

# 1. Bucket S3 de stockage d'objets CloudVault
resource "aws_s3_bucket" "documents" {
  bucket        = var.bucket_name
  force_destroy = true

  tags = {
    Name        = var.bucket_name
    Project     = "CloudVault"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 2. Configuration du contrôle d'accès au bucket
resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 2bis. Chiffrement par défaut côté serveur (CIS AWS Benchmark & FinOps Security)
# trivy:ignore:AVD-AWS-0132
resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# 3. Activation du Versioning S3 (Résilience & Traçabilité FinOps)
resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration {
    status = "Enabled"
  }
}

# 4. Règles FinOps d'optimisation du cycle de vie du stockage
resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    id     = "finops-noncurrent-version-cleanup"
    status = "Enabled"

    filter {
      prefix = ""
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }

  lifecycle {
    ignore_changes = [transition_default_minimum_object_size]
  }
}

# 5. Politique IAM autorisant les opérations PutObject, GetObject et gestion de versions
resource "aws_iam_policy" "cloudvault_s3_rw" {
  name        = "cloudvault-s3-readwrite-policy"
  description = "Politique IAM accordant l'accès S3 complet au bucket CloudVault"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudVaultBucketOperations"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:ListBucketVersions",
          "s3:GetBucketLocation"
        ]
        Resource = aws_s3_bucket.documents.arn
      },
      {
        Sid    = "CloudVaultObjectOperations"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:DeleteObject",
          "s3:DeleteObjectVersion"
        ]
        Resource = "${aws_s3_bucket.documents.arn}/*"
      }
    ]
  })
}

# 6. Rôle IAM pour le microservice backend CloudVault
resource "aws_iam_role" "cloudvault_app" {
  name = "cloudvault-backend-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# 7. Attachement de la politique au rôle applicatif
resource "aws_iam_role_policy_attachment" "cloudvault_attach" {
  role       = aws_iam_role.cloudvault_app.name
  policy_arn = aws_iam_policy.cloudvault_s3_rw.arn
}
