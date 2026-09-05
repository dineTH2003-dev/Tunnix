variable "environment" {
  description = "Deployment environment name"
  type        = string
}

variable "aws_account_id" {
  description = "AWS account ID used to generate globally unique bucket names"
  type        = string
}
