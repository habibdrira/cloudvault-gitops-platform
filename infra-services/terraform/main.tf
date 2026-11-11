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

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# 3. Politique IAM autorisant les opérations PutObject et GetObject (pour URLs pré-signées)
resource "aws_iam_policy" "cloudvault_s3_rw" {
  name        = "cloudvault-s3-readwrite-policy"
  description = "Politique IAM accordant l'accès PutObject et GetObject au bucket CloudVault"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudVaultBucketOperations"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
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
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.documents.arn}/*"
      }
    ]
  })
}

# 4. Rôle IAM pour le microservice backend CloudVault
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

# 5. Attachement de la politique au rôle applicatif
resource "aws_iam_role_policy_attachment" "cloudvault_attach" {
  role       = aws_iam_role.cloudvault_app.name
  policy_arn = aws_iam_policy.cloudvault_s3_rw.arn
}

