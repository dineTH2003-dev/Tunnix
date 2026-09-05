resource "aws_amplify_app" "tunnix" {
  name         = "tunnix-dashboard"
  repository   = var.github_repo_url
  access_token = var.github_access_token

  build_spec = <<-YAML
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - npm install -g bun
            - bun install --frozen-lockfile
        build:
          commands:
            - cd apps/client
            - bun run build
      artifacts:
        baseDirectory: apps/client/dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
  YAML

  environment_variables = {
    VITE_API_URL = var.api_url
  }

  # SPA client-side routing: redirect all non-file paths to index.html
  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>"
    target = "/index.html"
    status = "200"
  }

  tags = { Name = "tunnix-dashboard" }
}

resource "aws_amplify_branch" "prod" {
  app_id      = aws_amplify_app.tunnix.id
  branch_name = "prod"

  enable_auto_build = true
  stage             = "PRODUCTION"

  tags = { Name = "tunnix-dashboard-prod" }
}
