# =============================================================================
# ECR Module - Outputs
# =============================================================================

output "repository_urls" {
  description = "Map of service name to ECR repository URL"
  value       = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}

output "repository_arns" {
  description = "Map of service name to ECR repository ARN"
  value       = { for k, v in aws_ecr_repository.services : k => v.arn }
}

output "repository_names" {
  description = "Map of service name to ECR repository name"
  value       = { for k, v in aws_ecr_repository.services : k => v.name }
}

output "registry_id" {
  description = "Registry ID where the repositories were created"
  value       = length(aws_ecr_repository.services) > 0 ? values(aws_ecr_repository.services)[0].registry_id : ""
}

# Convenience outputs for common services
output "backend_repository_url" {
  description = "URL of the backend ECR repository"
  value       = try(aws_ecr_repository.services["backend"].repository_url, "")
}

output "frontend_repository_url" {
  description = "URL of the frontend ECR repository"
  value       = try(aws_ecr_repository.services["frontend"].repository_url, "")
}

# Legacy output for backward compatibility
output "repository_url" {
  description = "URL of the backend ECR repository (for backward compatibility)"
  value       = try(aws_ecr_repository.services["backend"].repository_url, "")
}

output "repository_arn" {
  description = "ARN of the backend ECR repository (for backward compatibility)"
  value       = try(aws_ecr_repository.services["backend"].arn, "")
}

output "repository_name" {
  description = "Name of the backend ECR repository (for backward compatibility)"
  value       = try(aws_ecr_repository.services["backend"].name, "")
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for ECR encryption"
  value       = aws_kms_key.ecr.arn
}

output "kms_key_id" {
  description = "ID of the KMS key used for ECR encryption"
  value       = aws_kms_key.ecr.key_id
}
