output "parameter_names" {
  description = "List of all SSM parameter names created by this module"
  value = [
    aws_ssm_parameter.jwt_access_secret.name,
    aws_ssm_parameter.jwt_refresh_secret.name,
    aws_ssm_parameter.tunnel_grant_secret.name,
    aws_ssm_parameter.internal_gateway_secret.name,
    aws_ssm_parameter.brevo_api_key.name,
    aws_ssm_parameter.turnstile_secret_key.name,
    aws_ssm_parameter.wildcard_base_domain.name,
    aws_ssm_parameter.gateway_public_base_url.name,
    aws_ssm_parameter.gateway_ws_url.name,
    aws_ssm_parameter.cors_origin.name,
    aws_ssm_parameter.app_name.name,
    aws_ssm_parameter.port.name,
  ]
}
