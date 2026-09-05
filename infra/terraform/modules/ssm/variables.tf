variable "environment" {
  description = "Deployment environment name"
  type        = string
}

variable "ec2_public_ip" {
  description = "Elastic IP of the EC2 instance, used to populate gateway URL parameters"
  type        = string
}

variable "amplify_default_domain" {
  description = "Default Amplify domain (*.amplifyapp.com) — used for CORS_ORIGIN and WILDCARD_BASE_DOMAIN. May be null on first apply."
  type        = string
  default     = null
}
