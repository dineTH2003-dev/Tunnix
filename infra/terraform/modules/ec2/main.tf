data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ── Security Group ────────────────────────────────────────────────────────────
resource "aws_security_group" "tunnix" {
  name        = "tunnix-${var.environment}-sg"
  description = "Tunnix EC2 host security group"
  vpc_id      = data.aws_vpc.default.id

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Gateway HTTP API
  ingress {
    description = "Gateway HTTP"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Gateway WebSocket
  ingress {
    description = "Gateway WebSocket"
    from_port   = 9000
    to_port     = 9000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Emergency SSH (SSM Session Manager is preferred)
  ingress {
    description = "SSH (emergency fallback)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "tunnix-${var.environment}-sg" }
}

# ── ECS-Optimised AMI (Amazon Linux 2023) ────────────────────────────────────
data "aws_ami" "ecs_optimized" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-ecs-hvm-*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# ── EC2 Instance ──────────────────────────────────────────────────────────────
resource "aws_instance" "tunnix" {
  ami                    = data.aws_ami.ecs_optimized.id
  instance_type          = var.instance_type
  iam_instance_profile   = var.instance_profile_name
  subnet_id              = data.aws_subnets.public.ids[0]
  vpc_security_group_ids = [aws_security_group.tunnix.id]
  key_name               = var.key_pair_name
  ebs_optimized          = true

  # Register ECS agent into the correct cluster on first boot
  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo ECS_CLUSTER=${var.ecs_cluster_name} >> /etc/ecs/ecs.config
    echo ECS_ENABLE_CONTAINER_METADATA=true >> /etc/ecs/ecs.config

    # Wait for EBS volume and mount it
    while [ ! -e /dev/xvdf ]; do sleep 1; done
    if ! blkid /dev/xvdf; then
      mkfs.ext4 /dev/xvdf
    fi
    mkdir -p /data/tunnix
    mount /dev/xvdf /data/tunnix
    echo "/dev/xvdf /data/tunnix ext4 defaults,nofail 0 2" >> /etc/fstab
  EOF
  )

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    encrypted   = true
  }

  tags = { Name = "tunnix-${var.environment}" }

  lifecycle {
    ignore_changes = [
      # Don't replace the instance when a newer ECS AMI becomes available
      ami,
    ]
  }
}

# ── EBS Data Volume (SQLite) ──────────────────────────────────────────────────
resource "aws_ebs_volume" "data" {
  availability_zone = aws_instance.tunnix.availability_zone
  size              = var.ebs_volume_size_gb
  type              = "gp3"
  encrypted         = true

  tags = { Name = "tunnix-${var.environment}-data" }
}

resource "aws_volume_attachment" "data" {
  device_name = "/dev/xvdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.tunnix.id

  # Allow ECS to stop containers before the volume detaches on destroy
  stop_instance_before_detaching = true
}

# ── Elastic IP ────────────────────────────────────────────────────────────────
resource "aws_eip" "tunnix" {
  domain = "vpc"

  tags = { Name = "tunnix-${var.environment}-eip" }
}

resource "aws_eip_association" "tunnix" {
  instance_id   = aws_instance.tunnix.id
  allocation_id = aws_eip.tunnix.id
}
