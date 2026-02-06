# =============================================================================
# Networking Module - Variables
# =============================================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway (cost saving for non-prod)"
  type        = bool
  default     = true
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 8000
}

variable "allowed_ingress_cidrs" {
  description = "CIDR blocks allowed to access the ALB (e.g., office IPs, VPN ranges). Defaults to open access."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# VPC Flow Logs (Security)
# -----------------------------------------------------------------------------

variable "enable_flow_logs" {
  description = "Enable VPC flow logs for network monitoring"
  type        = bool
  default     = true
}

variable "flow_logs_retention_days" {
  description = "Retention period for VPC flow logs in days (minimum 365 for compliance)"
  type        = number
  default     = 365
}

variable "flow_logs_traffic_type" {
  description = "Type of traffic to log (ACCEPT, REJECT, or ALL)"
  type        = string
  default     = "ALL"
}
