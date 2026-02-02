# =============================================================================
# ECR Module
# Creates Elastic Container Registry repositories for Docker images
# =============================================================================

locals {
  # Define the services that need ECR repositories
  services = toset(var.services)
}

# -----------------------------------------------------------------------------
# ECR Repositories (one per service)
# -----------------------------------------------------------------------------

resource "aws_ecr_repository" "services" {
  for_each = local.services

  name                 = "${var.project_name}-${var.environment}-${each.key}"
  image_tag_mutability = var.image_tag_mutability

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-${each.key}"
    Service = each.key
  })
}

# -----------------------------------------------------------------------------
# Lifecycle Policies (one per repository)
# -----------------------------------------------------------------------------

resource "aws_ecr_lifecycle_policy" "services" {
  for_each = local.services

  repository = aws_ecr_repository.services[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last ${var.image_retention_count} tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "sha-", "main", "develop"]
          countType     = "imageCountMoreThan"
          countNumber   = var.image_retention_count
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep PR images for ${var.pr_image_retention_days} days"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["pr-"]
          countType     = "sinceImagePushed"
          countUnit     = "days"
          countNumber   = var.pr_image_retention_days
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3
        description  = "Remove untagged images older than ${var.untagged_image_retention_days} days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = var.untagged_image_retention_days
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Repository Policies for cross-account access (optional)
# -----------------------------------------------------------------------------

resource "aws_ecr_repository_policy" "services" {
  for_each = var.enable_cross_account_access ? local.services : toset([])

  repository = aws_ecr_repository.services[each.key].name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CrossAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.cross_account_arns
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
      }
    ]
  })
}
