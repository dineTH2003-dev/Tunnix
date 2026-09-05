output "app_id" {
  description = "Amplify application ID"
  value       = aws_amplify_app.tunnix.id
}

output "default_domain" {
  description = "Default *.amplifyapp.com domain assigned to this Amplify app"
  value       = aws_amplify_app.tunnix.default_domain
}
