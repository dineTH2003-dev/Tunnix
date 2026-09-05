variable "github_repo_url" {
  description = "Full HTTPS URL of the GitHub repository"
  type        = string
}

variable "github_access_token" {
  description = "GitHub Personal Access Token with repo scope (used by Amplify)"
  type        = string
  sensitive   = true
}

variable "api_url" {
  description = "Backend API URL injected as VITE_API_URL build-time environment variable"
  type        = string
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
}
