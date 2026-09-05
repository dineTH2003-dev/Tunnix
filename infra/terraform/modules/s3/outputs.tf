output "agent_binaries_bucket_name" {
  description = "Name of the S3 bucket for agent binary downloads"
  value       = aws_s3_bucket.agent_binaries.bucket
}

output "agent_binaries_bucket_arn" {
  description = "ARN of the agent binaries S3 bucket"
  value       = aws_s3_bucket.agent_binaries.arn
}

output "db_backups_bucket_name" {
  description = "Name of the private S3 bucket for SQLite DB backups"
  value       = aws_s3_bucket.db_backups.bucket
}
