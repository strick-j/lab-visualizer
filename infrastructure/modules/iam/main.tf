# =============================================================================
# IAM Module
# Creates IAM role and policies for the backend application to monitor
# AWS infrastructure (EC2, RDS, VPC, Subnets, IGW, NAT Gateway, EIP)
# =============================================================================

data "aws_caller_identity" "current" {}

# -----------------------------------------------------------------------------
# Application Task Role
# -----------------------------------------------------------------------------

resource "aws_iam_role" "app_task" {
  name = "${var.project_name}-${var.environment}-app-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-app-task-role"
  })
}

# -----------------------------------------------------------------------------
# AWS Infrastructure Monitoring Policy
# Grants read-only access to EC2, VPC, and RDS resources
# -----------------------------------------------------------------------------

resource "aws_iam_role_policy" "aws_monitoring" {
  name = "aws-infrastructure-monitoring"
  role = aws_iam_role.app_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EC2ReadAccess"
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeInstanceStatus",
          "ec2:DescribeTags",
          "ec2:DescribeVpcs",
          "ec2:DescribeSubnets",
          "ec2:DescribeRouteTables",
          "ec2:DescribeNatGateways",
          "ec2:DescribeAddresses",
          "ec2:DescribeInternetGateways"
        ]
        Resource = "*"
      },
      {
        Sid    = "RDSReadAccess"
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances",
          "rds:DescribeDBClusters",
          "rds:ListTagsForResource"
        ]
        Resource = "*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# S3 Terraform State Access Policy
# Grants read access to S3 buckets for Terraform state files
# Scoped to the current AWS account
# -----------------------------------------------------------------------------

resource "aws_iam_role_policy" "s3_terraform_state" {
  name = "s3-terraform-state-access"
  role = aws_iam_role.app_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3TerraformStateReadObjects"
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "arn:aws:s3:::*/*"
        Condition = {
          StringEquals = {
            "s3:ResourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Sid    = "S3TerraformStateBucketAccess"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = "arn:aws:s3:::*"
        Condition = {
          StringEquals = {
            "s3:ResourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}
