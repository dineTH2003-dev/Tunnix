variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
}

variable "ecr_server_image" {
  description = "Full ECR image URI for tunnix-server (e.g. 123456789.dkr.ecr.ap-southeast-1.amazonaws.com/tunnix/server:latest)"
  type        = string
}

variable "ecr_gateway_image" {
  description = "Full ECR image URI for tunnix-gateway"
  type        = string
}

variable "ec2_instance_id" {
  description = "ID of the EC2 host instance (used for documentation / future capacity provider)"
  type        = string
}

variable "ssm_path_prefix" {
  description = "SSM Parameter Store path prefix for Tunnix secrets (e.g. /tunnix/prod)"
  type        = string
  default     = "/tunnix/prod"
}
