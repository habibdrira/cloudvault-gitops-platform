output "s3_bucket_name" {
  description = "Nom du bucket S3 créé"
  value       = aws_s3_bucket.documents.id
}

output "s3_bucket_arn" {
  description = "ARN du bucket S3"
  value       = aws_s3_bucket.documents.arn
}

output "iam_policy_arn" {
  description = "ARN de la politique IAM S3 Read/Write"
  value       = aws_iam_policy.cloudvault_s3_rw.arn
}

output "iam_role_name" {
  description = "Nom du rôle IAM backend"
  value       = aws_iam_role.cloudvault_app.name
}

output "localstack_s3_endpoint" {
  description = "Endpoint S3 LocalStack pour l'application"
  value       = "${var.localstack_endpoint}/${aws_s3_bucket.documents.id}"
}

