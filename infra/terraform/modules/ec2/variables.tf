variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "key_pair_name" {
  description = "Name of an existing EC2 key pair for SSH (optional)"
  type        = string
  default     = null
}

variable "ebs_volume_size_gb" {
  description = "Size in GB of the EBS data volume"
  type        = number
  default     = 20
}

variable "instance_profile_name" {
  description = "Name of the IAM instance profile to attach"
  type        = string
}

variable "ecs_cluster_name" {
  description = "ECS cluster name the ECS agent should register with"
  type        = string
}
