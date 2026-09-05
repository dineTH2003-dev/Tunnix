output "ec2_instance_profile_name" {
  description = "Name of the IAM instance profile attached to the EC2 instance"
  value       = aws_iam_instance_profile.ec2_profile.name
}

output "github_actions_role_arn" {
  description = "ARN of the IAM role assumed by GitHub Actions via OIDC"
  value       = aws_iam_role.github_actions.arn
}
