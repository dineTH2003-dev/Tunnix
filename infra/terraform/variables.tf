variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "prod"
}

variable "github_org" {
  description = "GitHub organisation or user name (e.g. my-org)"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name (e.g. Tunnix)"
  type        = string
}

variable "ec2_instance_type" {
  description = "EC2 instance type for the Tunnix host"
  type        = string
  default     = "t3.small"
}

variable "ec2_key_pair_name" {
  description = "Name of an existing EC2 key pair for SSH access (optional – SSM Session Manager is preferred)"
  type        = string
  default     = null
}

variable "ebs_volume_size_gb" {
  description = "Size in GB for the EBS data volume that stores the SQLite database"
  type        = number
  default     = 20
}

# Amplify / GitHub integration
variable "github_repo_url" {
  description = "Full HTTPS URL of the GitHub repository (e.g. https://github.com/my-org/Tunnix)"
  type        = string
}

variable "github_access_token" {
  description = "GitHub Personal Access Token with repo scope – used by Amplify to clone the repository"
  type        = string
  sensitive   = true
}
