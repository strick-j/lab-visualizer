# =============================================================================
# Development Environment - Variables
# =============================================================================

# -----------------------------------------------------------------------------
# Project Configuration
# -----------------------------------------------------------------------------

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "aws-infra-visualizer"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# -----------------------------------------------------------------------------
# Network Configuration
# -----------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "allowed_ingress_cidrs" {
  description = "CIDR blocks allowed to access the ALB (e.g., office IPs, VPN ranges). Defaults to open access."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# -----------------------------------------------------------------------------
# Container Configuration
# -----------------------------------------------------------------------------

variable "container_image" {
  description = "Docker image for the container (leave empty to use ECR)"
  type        = string
  default     = ""
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 8000
}

variable "health_check_path" {
  description = "Path for health checks"
  type        = string
  default     = "/api/health"
}

# -----------------------------------------------------------------------------
# Frontend Container Configuration
# -----------------------------------------------------------------------------

variable "frontend_container_image" {
  description = "Docker image for the frontend container (leave empty to use ECR)"
  type        = string
  default     = ""
}

variable "frontend_container_port" {
  description = "Port the frontend container listens on"
  type        = number
  default     = 3000
}

variable "frontend_health_check_path" {
  description = "Path for frontend health checks"
  type        = string
  default     = "/health"
}

# -----------------------------------------------------------------------------
# Domain and TLS Configuration (Optional)
# -----------------------------------------------------------------------------

variable "domain_name" {
  description = "Domain name for the application (used for CORS origin; leave empty to use ALB DNS)"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID (only needed if using Route53 for DNS and auto-creating ACM certificates)"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ARN of an existing ACM certificate for HTTPS. When provided, enables HTTPS listener and HTTP-to-HTTPS redirect."
  type        = string
  default     = ""
}

# -----------------------------------------------------------------------------
# Terraform State Configuration
# -----------------------------------------------------------------------------

variable "tf_state_bucket" {
  description = "S3 bucket containing Terraform state files to visualize"
  type        = string
  default     = ""
}

# -----------------------------------------------------------------------------
# Authentication (OIDC)
# -----------------------------------------------------------------------------

variable "oidc_issuer" {
  description = "OIDC identity provider issuer URL"
  type        = string
  default     = ""
}

variable "oidc_client_id" {
  description = "OIDC client ID"
  type        = string
  default     = ""
}

variable "oidc_client_secret" {
  description = "OIDC client secret"
  type        = string
  default     = ""
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Local Admin Authentication
# -----------------------------------------------------------------------------

variable "admin_username" {
  description = "Admin username for local authentication (leave empty to use web setup)"
  type        = string
  default     = ""
}

variable "admin_password" {
  description = "Admin password for local authentication (leave empty to use web setup)"
  type        = string
  default     = ""
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Application Configuration
# -----------------------------------------------------------------------------

variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "DEBUG"
}

variable "debug" {
  description = "Enable debug mode"
  type        = bool
  default     = true
}
