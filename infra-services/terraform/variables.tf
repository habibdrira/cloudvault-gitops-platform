variable "aws_region" {
  description = "Région AWS simulée"
  type        = string
  default     = "us-east-1"
}

variable "localstack_endpoint" {
  description = "Point de terminaison LocalStack Gateway"
  type        = string
  default     = "http://192.168.100.10:4566"
}

variable "bucket_name" {
  description = "Nom du bucket S3 CloudVault"
  type        = string
  default     = "cloudvault-documents"
}

variable "environment" {
  description = "Environnement de déploiement"
  type        = string
  default     = "production"
}

