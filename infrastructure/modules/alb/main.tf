# =============================================================================
# ALB Module
# Creates Application Load Balancer with optional HTTPS
# =============================================================================

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ELB service account for access logs (varies by region)
data "aws_elb_service_account" "main" {}

# -----------------------------------------------------------------------------
# S3 Bucket for ALB Access Logs
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "alb_logs" {
  count  = var.enable_access_logs && var.access_logs_bucket == "" ? 1 : 0
  bucket = "${var.project_name}-${var.environment}-alb-logs-${data.aws_caller_identity.current.account_id}"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-alb-logs"
  })
}

resource "aws_s3_bucket_versioning" "alb_logs" {
  count  = var.enable_access_logs && var.access_logs_bucket == "" ? 1 : 0
  bucket = aws_s3_bucket.alb_logs[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

#trivy:ignore:AWS-0132 -- ALB access log buckets require SSE-S3 (AES256); SSE-KMS is not supported by the ELB log delivery service
resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs" {
  count  = var.enable_access_logs && var.access_logs_bucket == "" ? 1 : 0
  bucket = aws_s3_bucket.alb_logs[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "alb_logs" {
  count  = var.enable_access_logs && var.access_logs_bucket == "" ? 1 : 0
  bucket = aws_s3_bucket.alb_logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  count  = var.enable_access_logs && var.access_logs_bucket == "" ? 1 : 0
  bucket = aws_s3_bucket.alb_logs[0].id

  rule {
    id     = "expire-old-logs"
    status = "Enabled"

    filter {
      prefix = ""
    }

    expiration {
      days = 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# S3 bucket for access logging (logs of ALB logs bucket access)
resource "aws_s3_bucket" "alb_logs_access_logs" {
  count  = var.enable_access_logs && var.access_logs_bucket == "" ? 1 : 0
  bucket = "${var.project_name}-${var.environment}-alb-logs-access-${data.aws_caller_identity.current.account_id}"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-alb-logs-access"
  })

  lifecycle {
    precondition {
      condition     = length("${var.project_name}-${var.environment}-alb-logs-access-${data.aws_caller_identity.current.account_id}") <= 63
      error_message = "S3 bucket name '${var.project_name}-${var.environment}-alb-logs-access-${data.aws_caller_identity.current.account_id}' exceeds the 63-character AWS limit. Shorten project_name (currently ${length(var.project_name)} characters)."
    }
  }
}

resource "aws_s3_bucket_versioning" "alb_logs_access_logs" {
  count  = var.enable_access_logs && var.access_logs_bucket == "" ? 1 : 0
  bucket = aws_s3_bucket.alb_logs_access_logs[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

#trivy:ignore:AWS-0132 -- S3 server access logging destination buckets require SSE-S3 (AES256); SSE-KMS is not supported
resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs_access_logs" {
  count  = var.enable_access_logs && var.access_logs_bucket == "" ? 1 : 0
  bucket = aws_s3_bucket.alb_logs_access_logs[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "alb_logs_access_logs" {
  count  = var.enable_access_logs && var.access_logs_bucket == "" ? 1 : 0
  bucket = aws_s3_bucket.alb_logs_access_logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs_access_logs" {
  count  = var.enable_access_logs && var.access_logs_bucket == "" ? 1 : 0
  bucket = aws_s3_bucket.alb_logs_access_logs[0].id

  rule {
    id     = "expire-access-logs"
    status = "Enabled"

    filter {
      prefix = ""
    }

    expiration {
      days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Enable access logging on the ALB logs bucket
resource "aws_s3_bucket_logging" "alb_logs" {
  count  = var.enable_access_logs && var.access_logs_bucket == "" ? 1 : 0
  bucket = aws_s3_bucket.alb_logs[0].id

  target_bucket = aws_s3_bucket.alb_logs_access_logs[0].id
  target_prefix = "access-logs/"
}

# KMS key for SNS topic encryption
resource "aws_kms_key" "sns" {
  count               = var.enable_access_logs && var.access_logs_bucket == "" ? 1 : 0
  description         = "CMK for ${var.project_name}-${var.environment} ALB logs SNS topic encryption"
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
        Sid    = "AllowS3ToPublishEncrypted"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = [
          "kms:GenerateDataKey*",
          "kms:Decrypt"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sns-kms"
  })
}

resource "aws_kms_alias" "sns" {
  count         = var.enable_access_logs && var.access_logs_bucket == "" ? 1 : 0
  name          = "alias/${var.project_name}-${var.environment}-sns"
  target_key_id = aws_kms_key.sns[0].key_id
}

# SNS Topic for S3 event notifications
resource "aws_sns_topic" "alb_logs_events" {
  count             = var.enable_access_logs && var.access_logs_bucket == "" ? 1 : 0
  name              = "${var.project_name}-${var.environment}-alb-logs-events"
  kms_master_key_id = aws_kms_key.sns[0].arn

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-alb-logs-events"
  })
}

resource "aws_sns_topic_policy" "alb_logs_events" {
  count = var.enable_access_logs && var.access_logs_bucket == "" ? 1 : 0
  arn   = aws_sns_topic.alb_logs_events[0].arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3Publish"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.alb_logs_events[0].arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = aws_s3_bucket.alb_logs[0].arn
          }
        }
      }
    ]
  })
}

# S3 bucket event notifications
resource "aws_s3_bucket_notification" "alb_logs" {
  count  = var.enable_access_logs && var.access_logs_bucket == "" ? 1 : 0
  bucket = aws_s3_bucket.alb_logs[0].id

  topic {
    topic_arn     = aws_sns_topic.alb_logs_events[0].arn
    events        = ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
    filter_prefix = var.access_logs_prefix
  }

  depends_on = [aws_sns_topic_policy.alb_logs_events]
}

resource "aws_s3_bucket_policy" "alb_logs" {
  count  = var.enable_access_logs && var.access_logs_bucket == "" ? 1 : 0
  bucket = aws_s3_bucket.alb_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowELBLogDelivery"
        Effect = "Allow"
        Principal = {
          AWS = data.aws_elb_service_account.main.arn
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs[0].arn}/${var.access_logs_prefix}/*"
      },
      {
        Sid    = "AllowELBLogDeliveryAcl"
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs[0].arn}/${var.access_logs_prefix}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Sid    = "AllowELBLogDeliveryGetAcl"
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.alb_logs[0].arn
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Application Load Balancer
# -----------------------------------------------------------------------------

resource "aws_lb" "main" {
  name = "${var.project_name}-${var.environment}-alb"
  #trivy:ignore:AWS-0053 -- ALB is intentionally public-facing as the internet entry point for the web application
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.enable_deletion_protection
  drop_invalid_header_fields = true

  dynamic "access_logs" {
    for_each = var.enable_access_logs ? [1] : []
    content {
      bucket  = var.access_logs_bucket != "" ? var.access_logs_bucket : aws_s3_bucket.alb_logs[0].id
      prefix  = var.access_logs_prefix
      enabled = true
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-alb"
  })

  lifecycle {
    precondition {
      condition     = length("${var.project_name}-${var.environment}-alb") <= 32
      error_message = "ALB name '${var.project_name}-${var.environment}-alb' exceeds the 32-character AWS limit. Shorten project_name (currently ${length(var.project_name)} characters)."
    }
  }
}

# -----------------------------------------------------------------------------
# Target Group
# -----------------------------------------------------------------------------

resource "aws_lb_target_group" "main" {
  name        = "${var.project_name}-${var.environment}-tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    path                = var.health_check_path
    protocol            = "HTTP"
    matcher             = "200"
  }

  dynamic "stickiness" {
    for_each = var.enable_stickiness ? [1] : []
    content {
      type            = "lb_cookie"
      cookie_duration = var.stickiness_duration
      enabled         = true
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-tg"
  })

  lifecycle {
    create_before_destroy = true

    precondition {
      condition     = length("${var.project_name}-${var.environment}-tg") <= 32
      error_message = "Target group name '${var.project_name}-${var.environment}-tg' exceeds the 32-character AWS limit. Shorten project_name (currently ${length(var.project_name)} characters)."
    }
  }
}

# -----------------------------------------------------------------------------
# Frontend Target Group (conditional)
# -----------------------------------------------------------------------------

resource "aws_lb_target_group" "frontend" {
  count = var.frontend_container_port > 0 ? 1 : 0

  name        = "${var.project_name}-${var.environment}-fe-tg"
  port        = var.frontend_container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    path                = var.frontend_health_check_path
    protocol            = "HTTP"
    matcher             = "200"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-fe-tg"
  })

  lifecycle {
    create_before_destroy = true

    precondition {
      condition     = length("${var.project_name}-${var.environment}-fe-tg") <= 32
      error_message = "Frontend target group name '${var.project_name}-${var.environment}-fe-tg' exceeds the 32-character AWS limit. Shorten project_name (currently ${length(var.project_name)} characters)."
    }
  }
}

# -----------------------------------------------------------------------------
# HTTP Listener
# -----------------------------------------------------------------------------

#trivy:ignore:AWS-0054 -- HTTP listener redirects to HTTPS when certificate is configured; plain HTTP forwarding is only used during initial setup without TLS
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = var.certificate_arn != "" ? "redirect" : "forward"

    # Redirect to HTTPS if certificate is configured
    dynamic "redirect" {
      for_each = var.certificate_arn != "" ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }

    # Forward to frontend target group if available, otherwise backend
    target_group_arn = var.certificate_arn == "" ? (
      var.frontend_container_port > 0 ? aws_lb_target_group.frontend[0].arn : aws_lb_target_group.main.arn
    ) : null
  }
}

# Listener rule to route /api/* to backend target group (HTTP)
resource "aws_lb_listener_rule" "http_api_backend" {
  count = var.frontend_container_port > 0 && var.certificate_arn == "" ? 1 : 0

  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# -----------------------------------------------------------------------------
# HTTPS Listener (conditional)
# -----------------------------------------------------------------------------

resource "aws_lb_listener" "https" {
  count = var.certificate_arn != "" ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = var.ssl_policy
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = var.frontend_container_port > 0 ? aws_lb_target_group.frontend[0].arn : aws_lb_target_group.main.arn
  }
}

# Listener rule to route /api/* to backend target group (HTTPS)
resource "aws_lb_listener_rule" "https_api_backend" {
  count = var.frontend_container_port > 0 && var.certificate_arn != "" ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# -----------------------------------------------------------------------------
# ACM Certificate (optional - create if domain provided)
# -----------------------------------------------------------------------------

resource "aws_acm_certificate" "main" {
  count = var.domain_name != "" && var.certificate_arn == "" ? 1 : 0

  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = var.subject_alternative_names

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cert"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# Route53 Record (optional)
# -----------------------------------------------------------------------------

data "aws_route53_zone" "main" {
  count = var.domain_name != "" && var.route53_zone_id != "" ? 1 : 0

  zone_id = var.route53_zone_id
}

resource "aws_route53_record" "main" {
  count = var.domain_name != "" && var.route53_zone_id != "" ? 1 : 0

  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# Certificate validation records
resource "aws_route53_record" "cert_validation" {
  for_each = var.domain_name != "" && var.certificate_arn == "" && var.route53_zone_id != "" ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "main" {
  count = var.domain_name != "" && var.certificate_arn == "" && var.route53_zone_id != "" ? 1 : 0

  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
