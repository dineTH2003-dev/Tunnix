locals {
  github_oidc_sub = "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/prod"
}

# ── EC2 instance role ─────────────────────────────────────────────────────────
resource "aws_iam_role" "ec2_role" {
  name = "tunnix-${var.environment}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "tunnix-${var.environment}-ec2-role" }
}

resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ec2_ecs" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_role_policy_attachment" "ec2_ecr_read" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy" "ec2_ssm_params" {
  name = "tunnix-${var.environment}-ec2-ssm-params"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath",
      ]
      Resource = "arn:aws:ssm:*:*:parameter/tunnix/${var.environment}/*"
    }]
  })
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "tunnix-${var.environment}-ec2-profile"
  role = aws_iam_role.ec2_role.name

  tags = { Name = "tunnix-${var.environment}-ec2-profile" }
}

# ── GitHub Actions OIDC provider ──────────────────────────────────────────────
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = { Name = "github-actions-oidc" }
}

# ── GitHub Actions IAM role ───────────────────────────────────────────────────
resource "aws_iam_role" "github_actions" {
  name = "tunnix-${var.environment}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = local.github_oidc_sub
        }
      }
    }]
  })

  tags = { Name = "tunnix-${var.environment}-github-actions" }
}

resource "aws_iam_role_policy_attachment" "github_ecr_power_user" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

resource "aws_iam_role_policy" "github_actions_inline" {
  name = "tunnix-${var.environment}-github-actions-inline"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # ECR auth token (not covered by PowerUser policy GetAuthorizationToken alone)
      {
        Sid    = "ECRAuth"
        Effect = "Allow"
        Action = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      # ECS deployments
      {
        Sid    = "ECSDeployments"
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:RegisterTaskDefinition",
          "ecs:DescribeTaskDefinition",
        ]
        Resource = "*"
      },
      # SSM Run Command on tagged EC2 instances
      {
        Sid    = "SSMRunCommand"
        Effect = "Allow"
        Action = [
          "ssm:SendCommand",
          "ssm:GetCommandInvocation",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ssm:resourceTag/Project" = "tunnix"
          }
        }
      },
      # S3 agent binaries bucket
      {
        Sid    = "S3AgentBinaries"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
        ]
        Resource = "arn:aws:s3:::tunnix-agent-binaries-*/*"
      },
      # Amplify — trigger builds on the prod branch
      {
        Sid      = "AmplifyDeploy"
        Effect   = "Allow"
        Action   = ["amplify:StartJob"]
        Resource = "*"
      },
      # IAM PassRole — allow passing the ECS task execution role to ECS
      {
        Sid    = "IAMPassRole"
        Effect = "Allow"
        Action = ["iam:PassRole"]
        Resource = "arn:aws:iam::*:role/tunnix-${var.environment}-ecs-task-execution"
      },
    ]
  })
}
