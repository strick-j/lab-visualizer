# IAM Module

Provisions IAM roles and policies for the backend application task role. This module is intentionally decoupled from the ECS module so that the role and its policies persist independently of the deployment mechanism.

## Resources Created

- **Application task role**: Assumed by ECS tasks via `ecs-tasks.amazonaws.com`
- **EC2 monitoring policy**: Read-only access to EC2, VPC, subnet, route table, internet gateway, NAT gateway, and elastic IP resources
- **RDS monitoring policy**: Read-only access to RDS instances, clusters, and tags
- **S3 Terraform state policy**: Read access to S3 objects and bucket listing, scoped to the current AWS account

## Variables

| Name | Description | Type | Required |
|------|-------------|------|----------|
| `project_name` | Name of the project | `string` | yes |
| `environment` | Environment name (e.g., dev, staging, prod) | `string` | yes |
| `tags` | Additional tags for resources | `map(string)` | no |

## Outputs

| Name | Description |
|------|-------------|
| `task_role_arn` | ARN of the application task role |
| `task_role_name` | Name of the application task role |
| `task_role_id` | ID of the application task role |

<!-- BEGIN_TF_DOCS -->
<!-- END_TF_DOCS -->
