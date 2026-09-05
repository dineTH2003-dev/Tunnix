locals {
  agent_binaries_bucket_name = "tunnix-agent-binaries-${var.aws_account_id}"
  db_backups_bucket_name     = "tunnix-db-backups-${var.aws_account_id}"
}

# ── Agent Binaries Bucket (public read for agents/* prefix) ──────────────────
resource "aws_s3_bucket" "agent_binaries" {
  bucket = local.agent_binaries_bucket_name

  tags = { Name = local.agent_binaries_bucket_name }
}

resource "aws_s3_bucket_versioning" "agent_binaries" {
  bucket = aws_s3_bucket.agent_binaries.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "agent_binaries" {
  bucket = aws_s3_bucket.agent_binaries.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "agent_binaries" {
  bucket = aws_s3_bucket.agent_binaries.id

  # Must wait for public access block to be applied before setting policy
  depends_on = [aws_s3_bucket_public_access_block.agent_binaries]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadAgentBinaries"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.agent_binaries.arn}/agents/*"
    }]
  })
}

# ── DB Backups Bucket (private, lifecycle to Glacier) ────────────────────────
resource "aws_s3_bucket" "db_backups" {
  bucket = local.db_backups_bucket_name

  tags = { Name = local.db_backups_bucket_name }
}

resource "aws_s3_bucket_versioning" "db_backups" {
  bucket = aws_s3_bucket.db_backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "db_backups" {
  bucket = aws_s3_bucket.db_backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "db_backups" {
  bucket = aws_s3_bucket.db_backups.id

  rule {
    id     = "archive-and-expire"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    expiration {
      days = 90
    }
  }
}
