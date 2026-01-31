# =============================================================================
# Secrets Module - Variables
# =============================================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "create_oidc_secret" {
  description = "Create OIDC client secret"
  type        = bool
  default     = true
}

variable "oidc_client_secret" {
  description = "OIDC client secret value (leave empty to set manually)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "session_secret" {
  description = "Session secret value (leave empty to generate)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "app_secrets" {
  description = "Additional application secrets as key-value pairs"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
