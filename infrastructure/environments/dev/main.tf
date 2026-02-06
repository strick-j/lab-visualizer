# =============================================================================
# Development Environment
# AWS Infrastructure Visualizer - ECS Fargate Deployment
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Uncomment and configure for remote state
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket"
  #   key            = "aws-infra-visualizer/dev/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

# -----------------------------------------------------------------------------
# Provider Configuration
# -----------------------------------------------------------------------------

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Local Values
# -----------------------------------------------------------------------------

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
  }

  # Container image - use ECR or provided image
  container_image = var.container_image != "" ? var.container_image : "${module.ecr.repository_url}:latest"

  # Environment variables for the container
  environment_variables = {
    AWS_REGION       = local.region
    AWS_ACCOUNT_ID   = local.account_id
    TF_STATE_BUCKET  = var.tf_state_bucket
    TF_STATE_CONFIG  = "/app/config/terraform-states.yml"
    DATABASE_URL     = "sqlite:///./data/app.db"
    LOG_LEVEL        = var.log_level
    DEBUG            = tostring(var.debug)
    CORS_ORIGINS     = var.domain_name != "" ? "https://${var.domain_name}" : "http://${module.alb.alb_dns_name}"
    OIDC_ISSUER      = var.oidc_issuer
    OIDC_CLIENT_ID   = var.oidc_client_id
  }

  # Secrets mapping (env var name -> Secret ARN)
  secrets = var.oidc_client_secret != "" ? {
    OIDC_CLIENT_SECRET = module.secrets.oidc_client_secret_arn
    SESSION_SECRET     = module.secrets.session_secret_arn
  } : {
    SESSION_SECRET = module.secrets.session_secret_arn
  }
}

# -----------------------------------------------------------------------------
# Networking Module
# -----------------------------------------------------------------------------

module "networking" {
  source = "../../modules/networking"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = true # Cost optimization for dev
  container_port     = var.container_port
  tags               = local.common_tags
}

# -----------------------------------------------------------------------------
# ECR Module
# -----------------------------------------------------------------------------

module "ecr" {
  source = "../../modules/ecr"

  project_name          = var.project_name
  environment           = var.environment
  image_tag_mutability  = "MUTABLE" # Mutable tags required for branch-based tagging (main, develop, latest)
  scan_on_push          = true
  image_retention_count = 5 # Keep fewer images in dev
  tags                  = local.common_tags
}

# -----------------------------------------------------------------------------
# Secrets Module
# -----------------------------------------------------------------------------

module "secrets" {
  source = "../../modules/secrets"

  project_name       = var.project_name
  environment        = var.environment
  create_oidc_secret = var.oidc_client_secret != ""
  oidc_client_secret = var.oidc_client_secret
  tags               = local.common_tags
}

# -----------------------------------------------------------------------------
# ALB Module
# -----------------------------------------------------------------------------

module "alb" {
  source = "../../modules/alb"

  project_name      = var.project_name
  environment       = var.environment
  vpc_id            = module.networking.vpc_id
  public_subnet_ids = module.networking.public_subnet_ids
  security_group_id = module.networking.alb_security_group_id
  container_port    = var.container_port
  health_check_path = var.health_check_path
  domain_name       = var.domain_name
  route53_zone_id   = var.route53_zone_id
  certificate_arn   = var.certificate_arn
  tags              = local.common_tags

  enable_deletion_protection = false # Allow deletion in dev
}

# -----------------------------------------------------------------------------
# ECS Module
# -----------------------------------------------------------------------------

module "ecs" {
  source = "../../modules/ecs"

  project_name       = var.project_name
  environment        = var.environment
  aws_region         = local.region
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.networking.ecs_tasks_security_group_id
  target_group_arn   = module.alb.target_group_arn
  alb_listener_arn   = module.alb.http_listener_arn

  # Container configuration
  container_name    = "app"
  container_image   = local.container_image
  container_port    = var.container_port
  health_check_path = var.health_check_path

  # Task sizing (small for dev)
  task_cpu      = 512  # 0.5 vCPU
  task_memory   = 1024 # 1 GB
  desired_count = 1

  # Environment and secrets
  environment_variables = local.environment_variables
  secrets               = local.secrets
  secrets_arns          = module.secrets.all_secret_arns

  # Terraform state access
  tf_state_bucket_arn = var.tf_state_bucket != "" ? "arn:aws:s3:::${var.tf_state_bucket}" : ""

  # Logging
  log_retention_days        = 7 # Shorter retention for dev
  enable_container_insights = false

  # Cost optimization
  use_fargate_spot   = true
  enable_autoscaling = false

  tags = local.common_tags
}
