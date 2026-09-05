locals {
  prefix = "/tunnix/${var.environment}"
}

# ── SecureString parameters (lifecycle ignore_changes so values survive apply) ─
resource "aws_ssm_parameter" "jwt_access_secret" {
  name  = "${local.prefix}/JWT_ACCESS_SECRET"
  type  = "SecureString"
  value = "REPLACE_ME"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "jwt_refresh_secret" {
  name  = "${local.prefix}/JWT_REFRESH_SECRET"
  type  = "SecureString"
  value = "REPLACE_ME"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "tunnel_grant_secret" {
  name  = "${local.prefix}/TUNNEL_GRANT_SECRET"
  type  = "SecureString"
  value = "REPLACE_ME"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "internal_gateway_secret" {
  name  = "${local.prefix}/INTERNAL_GATEWAY_SECRET"
  type  = "SecureString"
  value = "REPLACE_ME"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "brevo_api_key" {
  name  = "${local.prefix}/BREVO_API_KEY"
  type  = "SecureString"
  value = "REPLACE_ME"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "turnstile_secret_key" {
  name  = "${local.prefix}/TURNSTILE_SECRET_KEY"
  type  = "SecureString"
  value = "REPLACE_ME"

  lifecycle {
    ignore_changes = [value]
  }
}

# ── String parameters ─────────────────────────────────────────────────────────
resource "aws_ssm_parameter" "wildcard_base_domain" {
  name  = "${local.prefix}/WILDCARD_BASE_DOMAIN"
  type  = "String"
  # Will be updated manually after Amplify app is deployed
  value = coalesce(var.amplify_default_domain, "TBD")

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "gateway_public_base_url" {
  name  = "${local.prefix}/GATEWAY_PUBLIC_BASE_URL"
  type  = "String"
  value = "http://${var.ec2_public_ip}:8080"
}

resource "aws_ssm_parameter" "gateway_ws_url" {
  name  = "${local.prefix}/GATEWAY_WS_URL"
  type  = "String"
  value = "ws://${var.ec2_public_ip}:9000"
}

resource "aws_ssm_parameter" "cors_origin" {
  name  = "${local.prefix}/CORS_ORIGIN"
  type  = "String"
  value = var.amplify_default_domain != null ? "https://${var.amplify_default_domain}" : "TBD"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "app_name" {
  name  = "${local.prefix}/APP_NAME"
  type  = "String"
  value = "Tunnix"
}

resource "aws_ssm_parameter" "port" {
  name  = "${local.prefix}/PORT"
  type  = "String"
  value = "4310"
}
