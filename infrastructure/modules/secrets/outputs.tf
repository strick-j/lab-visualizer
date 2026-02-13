# =============================================================================
# Secrets Module - Outputs
# =============================================================================

output "oidc_client_secret_arn" {
  description = "ARN of the OIDC client secret"
  value       = var.create_oidc_secret ? aws_secretsmanager_secret.oidc_client_secret[0].arn : null
}

output "session_secret_arn" {
  description = "ARN of the session secret"
  value       = aws_secretsmanager_secret.session_secret.arn
}

output "admin_password_arn" {
  description = "ARN of the admin password secret"
  value       = var.create_admin_secret ? aws_secretsmanager_secret.admin_password[0].arn : null
}

output "cyberark_client_secret_arn" {
  description = "ARN of the CyberArk API client secret"
  value       = var.create_cyberark_secret ? aws_secretsmanager_secret.cyberark_client_secret[0].arn : null
}

output "scim_client_secret_arn" {
  description = "ARN of the CyberArk SCIM client secret"
  value       = var.create_scim_secret ? aws_secretsmanager_secret.scim_client_secret[0].arn : null
}

output "app_secrets_arn" {
  description = "ARN of the app secrets"
  value       = length(var.app_secrets) > 0 ? aws_secretsmanager_secret.app_secrets[0].arn : null
}

output "all_secret_arns" {
  description = "List of all secret ARNs"
  value = compact([
    var.create_oidc_secret ? aws_secretsmanager_secret.oidc_client_secret[0].arn : null,
    aws_secretsmanager_secret.session_secret.arn,
    var.create_admin_secret ? aws_secretsmanager_secret.admin_password[0].arn : null,
    var.create_cyberark_secret ? aws_secretsmanager_secret.cyberark_client_secret[0].arn : null,
    var.create_scim_secret ? aws_secretsmanager_secret.scim_client_secret[0].arn : null,
    length(var.app_secrets) > 0 ? aws_secretsmanager_secret.app_secrets[0].arn : null
  ])
}
