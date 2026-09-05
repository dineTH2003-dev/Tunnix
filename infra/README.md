# Tunnix AWS Deployment Guide

> Region: **ap-southeast-1 (Singapore)**
> Stack: ECS on EC2 (t3.small) · ECR · Amplify · SQLite on EBS · S3 (agent binaries)

---

## Prerequisites

- AWS account with billing enabled
- AWS CLI v2 configured (`aws configure`)
- Terraform ≥ 1.6 installed
- GitHub repo with `prod` branch
- Docker installed locally (optional, CI builds images)

---

## 1 — One-Time AWS Setup

### Create Terraform Remote State

```bash
# Create S3 bucket for Terraform state (use a unique name)
aws s3api create-bucket \
  --bucket tunnix-terraform-state-<your-account-id> \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1

aws s3api put-bucket-versioning \
  --bucket tunnix-terraform-state-<your-account-id> \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name tunnix-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-southeast-1
```

Then update `infra/terraform/backend.tf` with your bucket name.

### Create GitHub OIDC Provider (one-time per AWS account)

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

---

## 2 — GitHub Secrets to Configure

Go to **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Description |
|--------|-------------|
| `AWS_GITHUB_ACTIONS_ROLE_ARN` | ARN of IAM role for OIDC (`arn:aws:iam::<account-id>:role/tunnix-github-actions`) |
| `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID |
| `AMPLIFY_APP_ID` | Amplify App ID (from `terraform output amplify_app_id`) |
| `EC2_INSTANCE_ID` | EC2 instance ID (from `terraform output ec2_instance_id`) |
| `S3_AGENT_BINARIES_BUCKET` | S3 bucket name for agent downloads (from `terraform output agent_bucket_name`) |

---

## 3 — Terraform Deploy

```bash
cd infra/terraform

# Initialise (downloads providers, configures backend)
terraform init

# Preview changes
terraform plan

# Apply infrastructure
terraform apply
```

Note the outputs — you'll need them:
```
terraform output ec2_public_ip
terraform output amplify_app_id
terraform output ecr_server_url
terraform output ecr_gateway_url
```

---

## 4 — EC2 Bootstrap (run once after Terraform apply)

SSH or SSM into the EC2 instance and run the bootstrap script:

```bash
# Via SSM Session Manager (recommended):
aws ssm start-session --target <instance-id> --region ap-southeast-1

# Then on the instance:
sudo bash /var/www/tunnix/infra/scripts/ec2-bootstrap.sh
```

If the repo isn't on the instance yet:
```bash
sudo git clone https://github.com/<your-org>/tunnix.git /var/www/tunnix
sudo bash /var/www/tunnix/infra/scripts/ec2-bootstrap.sh
```

---

## 5 — Populate SSM Parameter Store Secrets

After bootstrap, the script prints the exact commands. Run them — replace placeholder values:

```bash
# Cryptographic secrets (generate random values)
aws ssm put-parameter --name /tunnix/prod/JWT_ACCESS_SECRET \
  --value "$(openssl rand -hex 32)" --type SecureString --overwrite

aws ssm put-parameter --name /tunnix/prod/JWT_REFRESH_SECRET \
  --value "$(openssl rand -hex 32)" --type SecureString --overwrite

aws ssm put-parameter --name /tunnix/prod/TUNNEL_GRANT_SECRET \
  --value "$(openssl rand -hex 32)" --type SecureString --overwrite

aws ssm put-parameter --name /tunnix/prod/INTERNAL_GATEWAY_SECRET \
  --value "$(openssl rand -hex 32)" --type SecureString --overwrite

# Infrastructure URLs (get EC2_IP from: terraform output ec2_public_ip)
EC2_IP=$(terraform -chdir=infra/terraform output -raw ec2_public_ip)

aws ssm put-parameter --name /tunnix/prod/GATEWAY_PUBLIC_BASE_URL \
  --value "http://$EC2_IP:8080" --type String --overwrite

aws ssm put-parameter --name /tunnix/prod/GATEWAY_WS_URL \
  --value "ws://$EC2_IP:9000" --type String --overwrite

# Set after Amplify is created (Step 6):
aws ssm put-parameter --name /tunnix/prod/CORS_ORIGIN \
  --value "https://<branch>.<amplify-app-id>.amplifyapp.com" \
  --type String --overwrite
```

---

## 6 — Set Up Amplify

1. In the AWS Console → **Amplify** → **New App** → **Host web app**
2. Connect your GitHub repo
3. Select the **prod** branch
4. Amplify auto-detects Vite — confirm build settings
5. Note the **App ID** and add it as the `AMPLIFY_APP_ID` GitHub secret

Update `apps/client/.env.production`:
```bash
# Replace with actual EC2 Elastic IP from terraform output
VITE_API_URL=http://<ec2-elastic-ip>
```

Then commit and push to `prod`.

---

## 7 — First Deployment

Push to `prod` to trigger all CI/CD workflows:

```bash
git checkout prod
git push origin prod
```

Workflows that fire:
- `deploy-server.yml` — builds server image, pushes to ECR, updates ECS
- `deploy-gateway.yml` — builds gateway image, pushes to ECR, updates ECS
- `deploy-client.yml` — triggers Amplify build
- `build-agents.yml` — compiles agent binaries, uploads to S3

Monitor progress in **GitHub → Actions** tab.

---

## 8 — Verify Deployment

```bash
EC2_IP=$(terraform -chdir=infra/terraform output -raw ec2_public_ip)

# Health check
curl http://$EC2_IP/health

# API root
curl http://$EC2_IP/v1/

# ECS services
aws ecs describe-services \
  --cluster tunnix-prod \
  --services tunnix-server tunnix-gateway \
  --region ap-southeast-1 \
  --query 'services[*].{Name:serviceName,Running:runningCount,Desired:desiredCount,Status:status}'
```

---

## 9 — Day 2 Operations

### View Container Logs

```bash
# Server logs (CloudWatch)
aws logs tail /ecs/tunnix-server --follow --region ap-southeast-1

# Gateway logs
aws logs tail /ecs/tunnix-gateway --follow --region ap-southeast-1
```

### Update a Secret

```bash
aws ssm put-parameter \
  --name /tunnix/prod/JWT_ACCESS_SECRET \
  --value "<new-secret>" \
  --type SecureString \
  --overwrite

# Force ECS to pick up the new value by restarting the service
aws ecs update-service \
  --cluster tunnix-prod \
  --service tunnix-server \
  --force-new-deployment \
  --region ap-southeast-1
```

### Backup SQLite Database

```bash
# Via SSM on the EC2 instance:
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
aws s3 cp /data/tunnix/tunnix.db \
  s3://<your-backup-bucket>/db-backups/tunnix-$TIMESTAMP.db
```

### SSH into EC2

```bash
# Via SSM (no SSH key required — use IAM permissions):
aws ssm start-session --target <instance-id> --region ap-southeast-1
```

### Force Redeploy Without Code Change

```bash
aws ecs update-service \
  --cluster tunnix-prod \
  --service tunnix-server \
  --force-new-deployment \
  --region ap-southeast-1
```

---

## Architecture Overview

```
GitHub (prod branch)
  ├── apps/client/**  →  deploy-client.yml  →  Amplify
  ├── apps/server/**  →  deploy-server.yml  →  ECR → ECS (tunnix-server)
  ├── gateway/**      →  deploy-gateway.yml →  ECR → ECS (tunnix-gateway)
  ├── agent/**        →  build-agents.yml   →  S3 (agent binaries)
  └── infra/**        →  iac.yml            →  Terraform

EC2 (t3.small, ap-southeast-1)
  ├── Nginx (HTTP :80)
  │     ├── *.tunnix.local → Gateway :8080
  │     ├── /tunnel-ws     → Gateway :9000 (WebSocket)
  │     ├── /v1/           → Server  :4310
  │     └── /health        → Server  :4310
  ├── ECS Agent
  │     ├── tunnix-server  (container :4310)
  │     └── tunnix-gateway (container :8080, :9000)
  └── EBS (/data/tunnix/tunnix.db — SQLite)
```
