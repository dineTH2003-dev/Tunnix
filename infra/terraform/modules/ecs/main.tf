# ── ECS Task Execution Role ───────────────────────────────────────────────────
resource "aws_iam_role" "ecs_task_execution" {
  name = "tunnix-${var.environment}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "tunnix-${var.environment}-ecs-task-execution" }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_managed" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_task_execution_ssm" {
  name = "tunnix-${var.environment}-ecs-ssm-secrets"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SSMSecrets"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
        ]
        Resource = "arn:aws:ssm:*:*:parameter${var.ssm_path_prefix}/*"
      },
      {
        Sid    = "KMSDecrypt"
        Effect = "Allow"
        Action = ["kms:Decrypt"]
        Resource = "*"
      },
      {
        Sid    = "ECRPull"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
        ]
        Resource = "*"
      },
    ]
  })
}

# ── ECS Cluster ───────────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "tunnix" {
  name = "tunnix-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = "tunnix-${var.environment}" }
}

# ── CloudWatch Log Groups ─────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "server" {
  name              = "/ecs/tunnix-server"
  retention_in_days = 7

  tags = { Name = "/ecs/tunnix-server" }
}

resource "aws_cloudwatch_log_group" "gateway" {
  name              = "/ecs/tunnix-gateway"
  retention_in_days = 7

  tags = { Name = "/ecs/tunnix-gateway" }
}

# ── Task Definition: tunnix-server ───────────────────────────────────────────
resource "aws_ecs_task_definition" "server" {
  family                = "tunnix-server"
  network_mode          = "bridge"
  execution_role_arn    = aws_iam_role.ecs_task_execution.arn
  cpu                   = "256"
  memory                = "512"

  container_definitions = jsonencode([
    {
      name  = "tunnix-server"
      image = var.ecr_server_image

      portMappings = [
        {
          containerPort = 4310
          hostPort      = 4310
          protocol      = "tcp"
        }
      ]

      mountPoints = [
        {
          sourceVolume  = "tunnix-data"
          containerPath = "/data"
          readOnly      = false
        }
      ]

      environment = [
        { name = "PORT",          value = "4310" },
        { name = "DATABASE_URL",  value = "/data/tunnix.db" },
        { name = "NODE_ENV",      value = "production" },
        { name = "APP_NAME",      value = "Tunnix" },
        { name = "LOG_LEVEL",     value = "info" },
      ]

      secrets = [
        {
          name      = "JWT_ACCESS_SECRET"
          valueFrom = "${var.ssm_path_prefix}/JWT_ACCESS_SECRET"
        },
        {
          name      = "JWT_REFRESH_SECRET"
          valueFrom = "${var.ssm_path_prefix}/JWT_REFRESH_SECRET"
        },
        {
          name      = "TUNNEL_GRANT_SECRET"
          valueFrom = "${var.ssm_path_prefix}/TUNNEL_GRANT_SECRET"
        },
        {
          name      = "INTERNAL_GATEWAY_SECRET"
          valueFrom = "${var.ssm_path_prefix}/INTERNAL_GATEWAY_SECRET"
        },
        {
          name      = "BREVO_API_KEY"
          valueFrom = "${var.ssm_path_prefix}/BREVO_API_KEY"
        },
        {
          name      = "TURNSTILE_SECRET_KEY"
          valueFrom = "${var.ssm_path_prefix}/TURNSTILE_SECRET_KEY"
        },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.server.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true
    }
  ])

  volume {
    name = "tunnix-data"
    host_path = "/data/tunnix"
  }

  tags = { Name = "tunnix-server" }
}

# ── Task Definition: tunnix-gateway ──────────────────────────────────────────
resource "aws_ecs_task_definition" "gateway" {
  family             = "tunnix-gateway"
  network_mode       = "bridge"
  execution_role_arn = aws_iam_role.ecs_task_execution.arn
  cpu                = "128"
  memory             = "256"

  container_definitions = jsonencode([
    {
      name  = "tunnix-gateway"
      image = var.ecr_gateway_image

      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
          protocol      = "tcp"
        },
        {
          containerPort = 9000
          hostPort      = 9000
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "GATEWAY_HTTP_PORT", value = "8080" },
        { name = "GATEWAY_WS_PORT",   value = "9000" },
        { name = "LOG_LEVEL",         value = "info" },
      ]

      secrets = [
        {
          name      = "INTERNAL_GATEWAY_SECRET"
          valueFrom = "${var.ssm_path_prefix}/INTERNAL_GATEWAY_SECRET"
        },
        {
          name      = "CONTROL_PLANE_URL"
          valueFrom = "${var.ssm_path_prefix}/GATEWAY_PUBLIC_BASE_URL"
        },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.gateway.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true
    }
  ])

  tags = { Name = "tunnix-gateway" }
}

# ── ECS Services ──────────────────────────────────────────────────────────────
resource "aws_ecs_service" "server" {
  name            = "tunnix-server"
  cluster         = aws_ecs_cluster.tunnix.id
  task_definition = aws_ecs_task_definition.server.arn
  desired_count   = 1
  launch_type     = "EC2"

  # Allow zero healthy tasks during deployment so the old container stops
  # before the new one starts on a single-instance cluster.
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  ordered_placement_strategy {
    type  = "binpack"
    field = "memory"
  }

  # CI/CD pipeline calls ecs:UpdateService with a new task definition revision.
  # Set force_new_deployment = false so Terraform doesn't re-deploy on every plan.
  force_new_deployment = false

  tags = { Name = "tunnix-server" }

  # Avoid recreating the service when task def changes — CI/CD handles deploys
  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }
}

resource "aws_ecs_service" "gateway" {
  name            = "tunnix-gateway"
  cluster         = aws_ecs_cluster.tunnix.id
  task_definition = aws_ecs_task_definition.gateway.arn
  desired_count   = 1
  launch_type     = "EC2"

  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  ordered_placement_strategy {
    type  = "binpack"
    field = "memory"
  }

  force_new_deployment = false

  tags = { Name = "tunnix-gateway" }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }
}
