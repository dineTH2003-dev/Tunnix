output "ec2_public_ip" {
  description = "Elastic IP address of the Tunnix EC2 instance"
  value       = module.ec2.eip_public_ip
}

output "ec2_instance_id" {
  description = "Instance ID of the Tunnix EC2 host"
  value       = module.ec2.instance_id
}

output "ecr_server_repository_url" {
  description = "ECR repository URL for the tunnix-server image"
  value       = module.ecr.server_repository_url
}

output "ecr_gateway_repository_url" {
  description = "ECR repository URL for the tunnix-gateway image"
  value       = module.ecr.gateway_repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "s3_agent_binaries_bucket" {
  description = "Name of the S3 bucket used for agent binary downloads"
  value       = module.s3.agent_binaries_bucket_name
}

output "amplify_app_id" {
  description = "Amplify application ID"
  value       = module.amplify.app_id
}

output "amplify_default_domain" {
  description = "Default *.amplifyapp.com domain assigned to the Amplify app"
  value       = module.amplify.default_domain
}
