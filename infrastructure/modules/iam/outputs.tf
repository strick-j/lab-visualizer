# =============================================================================
# IAM Module - Outputs
# =============================================================================

output "task_role_arn" {
  description = "ARN of the application task role"
  value       = aws_iam_role.app_task.arn
}

output "task_role_name" {
  description = "Name of the application task role"
  value       = aws_iam_role.app_task.name
}

output "task_role_id" {
  description = "ID of the application task role"
  value       = aws_iam_role.app_task.id
}
