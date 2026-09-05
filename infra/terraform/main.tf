data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
}

# ── IAM: EC2 instance profile + GitHub OIDC CI/CD role ────────────────────────
module "iam" {
  source = "./modules/iam"

  github_org   = var.github_org
  github_repo  = var.github_repo
  environment  = var.environment
}

# ── EC2: Host instance, security group, EBS data volume, Elastic IP ───────────
module "ec2" {
  source = "./modules/ec2"

  aws_region            = var.aws_region
  environment           = var.environment
  instance_type         = var.ec2_instance_type
  key_pair_name         = var.ec2_key_pair_name
  ebs_volume_size_gb    = var.ebs_volume_size_gb
  instance_profile_name = module.iam.ec2_instance_profile_name
  ecs_cluster_name      = "tunnix-${var.environment}"
}

# ── ECR: Container image repositories ─────────────────────────────────────────
module "ecr" {
  source = "./modules/ecr"

  environment = var.environment
}

# ── ECS: Cluster, task definitions, services, log groups ──────────────────────
module "ecs" {
  source = "./modules/ecs"

  aws_region       = var.aws_region
  environment      = var.environment
  ecr_server_image = "${module.ecr.server_repository_url}:latest"
  ecr_gateway_image = "${module.ecr.gateway_repository_url}:latest"
  ec2_instance_id  = module.ec2.instance_id
  ssm_path_prefix  = "/tunnix/${var.environment}"
}

# ── S3: Agent binary downloads + DB backup buckets ────────────────────────────
module "s3" {
  source = "./modules/s3"

  environment    = var.environment
  aws_account_id = local.account_id
}

# ── SSM Parameter Store: secrets and config values ────────────────────────────
module "ssm" {
  source = "./modules/ssm"

  environment           = var.environment
  ec2_public_ip         = module.ec2.eip_public_ip
  amplify_default_domain = module.amplify.default_domain
}

# ── Amplify: React SPA hosting ────────────────────────────────────────────────
module "amplify" {
  source = "./modules/amplify"

  github_repo_url     = var.github_repo_url
  github_access_token = var.github_access_token
  api_url             = "http://${module.ec2.eip_public_ip}:4310"
  environment         = var.environment
}
