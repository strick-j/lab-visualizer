# =============================================================================
# ECR Module - Variables
# =============================================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "services" {
  description = "List of services to create ECR repositories for"
  type        = list(string)
  default     = ["backend", "frontend"]
}

variable "image_tag_mutability" {
  description = "Image tag mutability setting (IMMUTABLE recommended for security)"
  type        = string
  default     = "IMMUTABLE"
}

variable "kms_key_deletion_window" {
  description = "Number of days before KMS key is deleted after scheduling"
  type        = number
  default     = 30
}

variable "scan_on_push" {
  description = "Enable image scanning on push"
  type        = bool
  default     = true
}

variable "image_retention_count" {
  description = "Number of tagged images to retain"
  type        = number
  default     = 10
}

variable "pr_image_retention_days" {
  description = "Number of days to retain PR images"
  type        = number
  default     = 14
}

variable "untagged_image_retention_days" {
  description = "Number of days to retain untagged images"
  type        = number
  default     = 7
}

variable "enable_cross_account_access" {
  description = "Enable cross-account access to ECR"
  type        = bool
  default     = false
}

variable "cross_account_arns" {
  description = "List of ARNs for cross-account access"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
