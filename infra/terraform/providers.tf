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
    bucket  = "tunnix-terraform-state-265283365424"
    key     = "prod/terraform.tfstate"
    region  = "ap-southeast-1"
    encrypt = true
    profile = "account2"
  }
}

provider "aws" {
  region  = var.aws_region
  profile = "account2"
  default_tags {
    tags = {
      Project     = "tunnix"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
