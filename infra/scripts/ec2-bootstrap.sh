#!/bin/bash
# Tunnix EC2 Post-Launch Bootstrap Script
#
# Run this ONCE on the EC2 instance after launch.
# Recommended method: SSM Session Manager or SSH.
# Do NOT use as user-data (user-data runs before ECS agent is registered).
#
# Prerequisites:
#   - EC2 launched from ECS-optimized AMI with IAM instance profile
#   - EBS data volume attached as /dev/xvdf (or update EBS_DEVICE below)
#   - Repo cloned to /var/www/tunnix (or adjust REPO_DIR below)

set -euo pipefail

EBS_DEVICE="/dev/xvdf"
MOUNT_POINT="/data/tunnix"
REPO_DIR="/var/www/tunnix"
AWS_REGION="ap-southeast-1"

echo "=== Tunnix EC2 Bootstrap ==="
echo ""

# ─── Step 1: Format and mount EBS data volume ─────────────────────────────────
echo "Step 1: Format and mount EBS data volume ($EBS_DEVICE → $MOUNT_POINT)"

if ! blkid "$EBS_DEVICE" &>/dev/null; then
    echo "  Formatting EBS volume as ext4..."
    mkfs.ext4 -m 0 -E lazy_itable_init=0,lazy_journal_init=0 "$EBS_DEVICE"
else
    echo "  EBS volume already formatted, skipping format."
fi

mkdir -p "$MOUNT_POINT"
mount "$EBS_DEVICE" "$MOUNT_POINT" || echo "  (already mounted)"

if ! grep -q "$EBS_DEVICE" /etc/fstab; then
    EBS_UUID=$(blkid -s UUID -o value "$EBS_DEVICE")
    echo "UUID=$EBS_UUID $MOUNT_POINT ext4 defaults,nofail 0 2" >> /etc/fstab
    echo "  Added EBS to /etc/fstab (UUID=$EBS_UUID)"
fi

# Container runs as uid 1000 (bun image default)
chown -R 1000:1000 "$MOUNT_POINT"
echo "  EBS mounted at $MOUNT_POINT"

# ─── Step 2: Install Nginx ─────────────────────────────────────────────────────
echo ""
echo "Step 2: Install Nginx"

if command -v amazon-linux-extras &>/dev/null; then
    # Amazon Linux 2
    amazon-linux-extras install -y nginx1
elif command -v dnf &>/dev/null; then
    # Amazon Linux 2023
    dnf install -y nginx
else
    echo "  WARNING: Could not detect package manager. Install nginx manually."
fi

# ─── Step 3: Deploy Nginx configuration ───────────────────────────────────────
echo ""
echo "Step 3: Deploy Nginx configuration"

if [ -f "$REPO_DIR/deploy/nginx/aws-tunnix.conf" ]; then
    cp "$REPO_DIR/deploy/nginx/aws-tunnix.conf" /etc/nginx/conf.d/tunnix.conf
    rm -f /etc/nginx/conf.d/default.conf
    nginx -t
    systemctl enable nginx
    systemctl restart nginx
    echo "  Nginx configured and started."
else
    echo "  WARNING: $REPO_DIR/deploy/nginx/aws-tunnix.conf not found."
    echo "  Clone the repo first: git clone <repo-url> $REPO_DIR"
fi

# ─── Step 4: Verify ECS agent ─────────────────────────────────────────────────
echo ""
echo "Step 4: Verify ECS agent is running"
systemctl status ecs --no-pager || true
echo "  ECS config: $(grep ECS_CLUSTER /etc/ecs/ecs.config 2>/dev/null || echo 'not configured')"

# ─── Step 5: Log into ECR ─────────────────────────────────────────────────────
echo ""
echo "Step 5: Authenticate Docker with ECR"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin \
      "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
echo "  ECR login successful"

# ─── Step 6: Print SSM Parameter setup instructions ───────────────────────────
EC2_IP=$(curl -sf http://169.254.169.254/latest/meta-data/public-ipv4 || echo "UNKNOWN")

echo ""
echo "Step 6: SSM Parameter Store -- IMPORTANT: update these with real values!"
echo ""
echo "  Run these commands to populate secrets:"
echo ""
echo "  aws ssm put-parameter --name /tunnix/prod/JWT_ACCESS_SECRET \\"
echo "    --value \"\$(openssl rand -hex 32)\" --type SecureString --overwrite"
echo ""
echo "  aws ssm put-parameter --name /tunnix/prod/JWT_REFRESH_SECRET \\"
echo "    --value \"\$(openssl rand -hex 32)\" --type SecureString --overwrite"
echo ""
echo "  aws ssm put-parameter --name /tunnix/prod/TUNNEL_GRANT_SECRET \\"
echo "    --value \"\$(openssl rand -hex 32)\" --type SecureString --overwrite"
echo ""
echo "  aws ssm put-parameter --name /tunnix/prod/INTERNAL_GATEWAY_SECRET \\"
echo "    --value \"\$(openssl rand -hex 32)\" --type SecureString --overwrite"
echo ""
echo "  aws ssm put-parameter --name /tunnix/prod/GATEWAY_PUBLIC_BASE_URL \\"
echo "    --value \"http://$EC2_IP:8080\" --type String --overwrite"
echo ""
echo "  aws ssm put-parameter --name /tunnix/prod/GATEWAY_WS_URL \\"
echo "    --value \"ws://$EC2_IP:9000\" --type String --overwrite"
echo ""
echo "  # Update CORS_ORIGIN after Amplify app is created:"
echo "  aws ssm put-parameter --name /tunnix/prod/CORS_ORIGIN \\"
echo "    --value \"https://<branch>.<amplify-app-id>.amplifyapp.com\" --type String --overwrite"

echo ""
echo "=== Bootstrap complete! ==="
echo "EC2 Public IP : $EC2_IP"
echo ""
echo "Next steps:"
echo "  1. Run the SSM Parameter Store commands above"
echo "  2. Set up Amplify and update CORS_ORIGIN"
echo "  3. Update VITE_API_URL in apps/client/.env.production to http://$EC2_IP"
echo "  4. Push to the prod branch to trigger CI/CD"
echo "  5. Monitor ECS task startup: AWS Console → ECS → tunnix-prod cluster"
