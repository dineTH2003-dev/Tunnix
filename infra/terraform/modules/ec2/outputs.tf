output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.tunnix.id
}

output "public_ip" {
  description = "EC2 primary public IP (may change on stop/start — use eip_public_ip instead)"
  value       = aws_instance.tunnix.public_ip
}

output "security_group_id" {
  description = "ID of the Tunnix security group"
  value       = aws_security_group.tunnix.id
}

output "eip_public_ip" {
  description = "Static Elastic IP address assigned to the EC2 instance"
  value       = aws_eip.tunnix.public_ip
}
