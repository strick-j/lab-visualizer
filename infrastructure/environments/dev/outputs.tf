# =============================================================================
# Development Environment - Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Networking
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.networking.private_subnet_ids
}

# -----------------------------------------------------------------------------
# ECR
# -----------------------------------------------------------------------------

output "ecr_backend_repository_url" {
  description = "URL of the backend ECR repository"
  value       = module.ecr.backend_repository_url
}

output "ecr_frontend_repository_url" {
  description = "URL of the frontend ECR repository"
  value       = module.ecr.frontend_repository_url
}

# -----------------------------------------------------------------------------
# ALB
# -----------------------------------------------------------------------------

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "app_url" {
  description = "URL to access the application"
  value       = module.alb.app_url
}

# -----------------------------------------------------------------------------
# IAM
# -----------------------------------------------------------------------------

output "app_task_role_arn" {
  description = "ARN of the backend application task role"
  value       = module.iam.task_role_arn
}

# -----------------------------------------------------------------------------
# ECS
# -----------------------------------------------------------------------------

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = module.ecs.service_name
}

output "ecs_task_definition" {
  description = "ARN of the task definition"
  value       = module.ecs.task_definition_arn
}

output "cloudwatch_log_group" {
  description = "Name of the CloudWatch log group"
  value       = module.ecs.log_group_name
}

# -----------------------------------------------------------------------------
# Frontend ECS
# -----------------------------------------------------------------------------

output "ecs_frontend_service_name" {
  description = "Name of the frontend ECS service"
  value       = module.ecs_frontend.service_name
}

output "frontend_log_group" {
  description = "Name of the frontend CloudWatch log group"
  value       = module.ecs_frontend.log_group_name
}

# -----------------------------------------------------------------------------
# Useful Commands
# -----------------------------------------------------------------------------

output "docker_push_commands" {
  description = "Commands to build and push Docker images"
  value       = <<-EOT
    # Login to ECR
    aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${local.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com

    # Build and push backend
    cd backend
    docker build -t ${module.ecr.backend_repository_url}:latest .
    docker push ${module.ecr.backend_repository_url}:latest

    # Build and push frontend
    cd ../frontend
    docker build -t ${module.ecr.frontend_repository_url}:latest .
    docker push ${module.ecr.frontend_repository_url}:latest

    # Force new deployments
    aws ecs update-service --cluster ${module.ecs.cluster_name} --service ${module.ecs.service_name} --force-new-deployment
    aws ecs update-service --cluster ${module.ecs_frontend.cluster_name} --service ${module.ecs_frontend.service_name} --force-new-deployment
  EOT
}

output "logs_command" {
  description = "Command to view ECS logs"
  value       = "aws logs tail /ecs/${var.project_name}-${var.environment} --follow"
}
