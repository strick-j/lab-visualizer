# =============================================================================
# ECS Module
# Creates ECS Fargate cluster, service, and task definition
# =============================================================================

# -----------------------------------------------------------------------------
# ECS Cluster
# -----------------------------------------------------------------------------

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = var.enable_container_insights ? "enabled" : "disabled"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cluster"
  })
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = var.use_fargate_spot ? "FARGATE_SPOT" : "FARGATE"
  }
}

# -----------------------------------------------------------------------------
# KMS Key for CloudWatch Logs Encryption
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}

resource "aws_kms_key" "logs" {
  count               = var.enable_log_encryption && var.log_kms_key_arn == "" ? 1 : 0
  description         = "KMS key for ${var.project_name}-${var.environment} CloudWatch logs encryption"
  enable_key_rotation = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccountPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowCloudWatchLogs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.aws_region}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt*",
          "kms:Decrypt*",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:Describe*"
        ]
        Resource = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/ecs/${var.project_name}-${var.environment}"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-logs-kms"
  })
}

resource "aws_kms_alias" "logs" {
  count         = var.enable_log_encryption && var.log_kms_key_arn == "" ? 1 : 0
  name          = "alias/${var.project_name}-${var.environment}-logs"
  target_key_id = aws_kms_key.logs[0].key_id
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "main" {
  name              = "/ecs/${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.enable_log_encryption ? (var.log_kms_key_arn != "" ? var.log_kms_key_arn : aws_kms_key.logs[0].arn) : null

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-logs"
  })
}

# -----------------------------------------------------------------------------
# IAM Roles
# -----------------------------------------------------------------------------

# Task Execution Role (used by ECS to pull images, write logs)
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-${var.environment}-ecs-execution-role"

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

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional policy for Secrets Manager access
resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  count = var.enable_secrets_access ? 1 : 0
  name  = "secrets-access"
  role  = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = var.secrets_arns
      }
    ]
  })
}

# Task Role (used by the application container)
# Only created if no external task_role_arn is provided
resource "aws_iam_role" "ecs_task" {
  count = var.task_role_arn == "" ? 1 : 0
  name  = "${var.project_name}-${var.environment}-ecs-task-role"

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

  tags = var.tags
}

locals {
  task_role_arn = var.task_role_arn != "" ? var.task_role_arn : aws_iam_role.ecs_task[0].arn
  task_role_id  = var.task_role_arn != "" ? null : aws_iam_role.ecs_task[0].id
}

# Policy for AWS API access (EC2, RDS read-only)
# Only created when no external task role is provided
resource "aws_iam_role_policy" "ecs_task_aws_access" {
  count = var.task_role_arn == "" ? 1 : 0
  name  = "aws-api-access"
  role  = aws_iam_role.ecs_task[0].id

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

# S3 access for reading Terraform state files from any bucket in this account.
# Buckets can be added dynamically via the Settings UI, so this uses a wildcard
# scoped to the current AWS account rather than a single pre-configured bucket.
# Only created when no external task role is provided.
resource "aws_iam_role_policy" "ecs_task_s3_access" {
  count = var.task_role_arn == "" ? 1 : 0
  name  = "s3-terraform-state-access"
  role  = aws_iam_role.ecs_task[0].id

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

# -----------------------------------------------------------------------------
# Task Definition
# -----------------------------------------------------------------------------

resource "aws_ecs_task_definition" "main" {
  family                   = "${var.project_name}-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = local.task_role_arn

  container_definitions = jsonencode([
    {
      name  = var.container_name
      image = var.container_image

      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          hostPort      = var.container_port
          protocol      = "tcp"
        }
      ]

      environment = [
        for key, value in var.environment_variables : {
          name  = key
          value = value
        }
      ]

      secrets = [
        for key, arn in var.secrets : {
          name      = key
          valueFrom = arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.main.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.container_port}${var.health_check_path} || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-task"
  })
}

# -----------------------------------------------------------------------------
# ECS Service
# -----------------------------------------------------------------------------

resource "aws_ecs_service" "main" {
  name            = "${var.project_name}-${var.environment}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = var.desired_count
  launch_type     = var.use_fargate_spot ? null : "FARGATE"

  dynamic "capacity_provider_strategy" {
    for_each = var.use_fargate_spot ? [1] : []
    content {
      capacity_provider = "FARGATE_SPOT"
      weight            = 100
    }
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = var.container_name
    container_port   = var.container_port
  }

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  # Allow external changes to desired_count without Terraform interference
  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-service"
  })

  depends_on = [var.alb_listener_arn]
}

# -----------------------------------------------------------------------------
# Auto Scaling (optional)
# -----------------------------------------------------------------------------

resource "aws_appautoscaling_target" "main" {
  count = var.enable_autoscaling ? 1 : 0

  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.main.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  count = var.enable_autoscaling ? 1 : 0

  name               = "${var.project_name}-${var.environment}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.main[0].resource_id
  scalable_dimension = aws_appautoscaling_target.main[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.main[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.cpu_target_value
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "memory" {
  count = var.enable_autoscaling ? 1 : 0

  name               = "${var.project_name}-${var.environment}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.main[0].resource_id
  scalable_dimension = aws_appautoscaling_target.main[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.main[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.memory_target_value
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
