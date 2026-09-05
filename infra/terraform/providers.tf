terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # Terraform state stored in S3 (bucket must be created manually first)
  backend "s3" {
    bucket  = "tunnix-terraform-state"
    key     = "prod/terraform.tfstate"
    region  = "ap-southeast-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "tunnix"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
