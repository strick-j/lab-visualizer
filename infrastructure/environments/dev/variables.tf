# =============================================================================
# Development Environment - Variables
# =============================================================================

# -----------------------------------------------------------------------------
# Project Configuration
# -----------------------------------------------------------------------------

variable "project_name" {
  description = "Name of the project (max 22 characters for dev environment)"
  type        = string
  default     = "aws-infra-visualizer"

  validation {
    condition     = length(var.project_name) >= 2 && length(var.project_name) <= 22
    error_message = "project_name must be between 2 and 22 characters. The dev environment appends suffixes like '-dev-fe-tg' to create AWS resource names, and ALB target group names are limited to 32 characters."
  }

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*[a-z0-9]$", var.project_name))
    error_message = "project_name must contain only lowercase letters, numbers, and hyphens, and must not start or end with a hyphen."
  }
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
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
  default     = ["us-east-2a", "us-east-2b"]
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

# -----------------------------------------------------------------------------
# CyberArk Integration (Optional)
# -----------------------------------------------------------------------------

variable "cyberark_enabled" {
  description = "Enable CyberArk integration"
  type        = bool
  default     = false
}

variable "cyberark_tenant_name" {
  description = "CyberArk tenant name for auto-discovery of URLs"
  type        = string
  default     = ""
}

variable "cyberark_base_url" {
  description = "CyberArk Privilege Cloud base URL"
  type        = string
  default     = ""
}

variable "cyberark_identity_url" {
  description = "CyberArk Identity tenant URL"
  type        = string
  default     = ""
}

variable "cyberark_client_id" {
  description = "CyberArk API client ID"
  type        = string
  default     = ""
}

variable "cyberark_client_secret" {
  description = "CyberArk API client secret (stored in Secrets Manager)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "cyberark_uap_base_url" {
  description = "CyberArk UAP base URL for SIA policy collection"
  type        = string
  default     = ""
}

# -----------------------------------------------------------------------------
# CyberArk SCIM Integration (Optional)
# -----------------------------------------------------------------------------

variable "cyberark_scim_enabled" {
  description = "Enable CyberArk SCIM user collection"
  type        = bool
  default     = false
}

variable "cyberark_scim_app_id" {
  description = "CyberArk Identity SCIM application ID"
  type        = string
  default     = ""
}

variable "cyberark_scim_scope" {
  description = "OAuth2 scope for SCIM token request"
  type        = string
  default     = ""
}

variable "cyberark_scim_client_id" {
  description = "CyberArk SCIM OAuth2 client ID"
  type        = string
  default     = ""
}

variable "cyberark_scim_client_secret" {
  description = "CyberArk SCIM OAuth2 client secret (stored in Secrets Manager)"
  type        = string
  default     = ""
  sensitive   = true
}
