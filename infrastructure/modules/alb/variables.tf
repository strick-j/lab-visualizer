# =============================================================================
# ALB Module - Variables
# =============================================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "public_subnet_ids" {
  description = "IDs of public subnets for ALB"
  type        = list(string)
}

variable "security_group_id" {
  description = "ID of the ALB security group"
  type        = string
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 8000
}

variable "health_check_path" {
  description = "Path for health check"
  type        = string
  default     = "/api/health"
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for ALB"
  type        = bool
  default     = false
}

variable "certificate_arn" {
  description = "ARN of an existing ACM certificate for HTTPS. When provided, enables HTTPS listener and HTTP-to-HTTPS redirect."
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Domain name for the application (used for auto-creating ACM certs and Route53 records; leave empty if managing DNS externally)"
  type        = string
  default     = ""
}

variable "subject_alternative_names" {
  description = "Subject alternative names for auto-created ACM certificates"
  type        = list(string)
  default     = []
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID (only needed for auto-creating ACM certs with DNS validation and Route53 A records)"
  type        = string
  default     = ""
}

variable "ssl_policy" {
  description = "SSL policy for HTTPS listener"
  type        = string
  default     = "ELBSecurityPolicy-TLS13-1-2-2021-06"
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# Access Logging (Security)
# -----------------------------------------------------------------------------

variable "enable_access_logs" {
  description = "Enable access logging for ALB"
  type        = bool
  default     = true
}

variable "access_logs_bucket" {
  description = "S3 bucket name for ALB access logs (if empty, a bucket will be created)"
  type        = string
  default     = ""
}

variable "access_logs_prefix" {
  description = "S3 key prefix for ALB access logs"
  type        = string
  default     = "alb-logs"
}

# -----------------------------------------------------------------------------
# Frontend Configuration (Optional)
# -----------------------------------------------------------------------------

variable "enable_stickiness" {
  description = "Enable sticky sessions on backend target group (required when using SQLite with multiple backend tasks)"
  type        = bool
  default     = false
}

variable "stickiness_duration" {
  description = "Duration (in seconds) for sticky session cookies"
  type        = number
  default     = 86400
}

variable "frontend_container_port" {
  description = "Port the frontend container listens on (set > 0 to enable frontend routing)"
  type        = number
  default     = 0
}

variable "frontend_health_check_path" {
  description = "Path for frontend health check"
  type        = string
  default     = "/health"
}
