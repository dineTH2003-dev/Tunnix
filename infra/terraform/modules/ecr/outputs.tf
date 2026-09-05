output "server_repository_url" {
  description = "ECR repository URL for tunnix/server"
  value       = aws_ecr_repository.server.repository_url
}

output "gateway_repository_url" {
  description = "ECR repository URL for tunnix/gateway"
  value       = aws_ecr_repository.gateway.repository_url
}

output "server_repository_name" {
  description = "ECR repository name for tunnix/server"
  value       = aws_ecr_repository.server.name
}

output "gateway_repository_name" {
  description = "ECR repository name for tunnix/gateway"
  value       = aws_ecr_repository.gateway.name
}
