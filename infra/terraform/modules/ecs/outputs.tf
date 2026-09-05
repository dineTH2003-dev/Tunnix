output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.tunnix.name
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.tunnix.arn
}

output "server_service_name" {
  description = "Name of the tunnix-server ECS service"
  value       = aws_ecs_service.server.name
}

output "gateway_service_name" {
  description = "Name of the tunnix-gateway ECS service"
  value       = aws_ecs_service.gateway.name
}

output "task_execution_role_arn" {
  description = "ARN of the ECS task execution IAM role"
  value       = aws_iam_role.ecs_task_execution.arn
}
