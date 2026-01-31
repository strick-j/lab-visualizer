# =============================================================================
# Secrets Module
# Creates AWS Secrets Manager secrets for sensitive configuration
# =============================================================================

# -----------------------------------------------------------------------------
# OIDC Client Secret
# -----------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "oidc_client_secret" {
  count = var.create_oidc_secret ? 1 : 0

  name        = "${var.project_name}/${var.environment}/oidc-client-secret"
  description = "OIDC client secret for SSO authentication"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-oidc-secret"
  })
}

resource "aws_secretsmanager_secret_version" "oidc_client_secret" {
  count = var.create_oidc_secret && var.oidc_client_secret != "" ? 1 : 0

  secret_id     = aws_secretsmanager_secret.oidc_client_secret[0].id
  secret_string = var.oidc_client_secret
}

# -----------------------------------------------------------------------------
# Session Secret
# -----------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "session_secret" {
  name        = "${var.project_name}/${var.environment}/session-secret"
  description = "Secret key for session signing"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-session-secret"
  })
}

resource "random_password" "session_secret" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret_version" "session_secret" {
  secret_id     = aws_secretsmanager_secret.session_secret.id
  secret_string = var.session_secret != "" ? var.session_secret : random_password.session_secret.result
}

# -----------------------------------------------------------------------------
# Application Secrets (combined JSON)
# -----------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "app_secrets" {
  count = length(var.app_secrets) > 0 ? 1 : 0

  name        = "${var.project_name}/${var.environment}/app-secrets"
  description = "Application secrets"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-app-secrets"
  })
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  count = length(var.app_secrets) > 0 ? 1 : 0

  secret_id     = aws_secretsmanager_secret.app_secrets[0].id
  secret_string = jsonencode(var.app_secrets)
}
