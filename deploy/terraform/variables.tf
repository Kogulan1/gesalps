variable "aws_region" {
  default = "us-east-1"
}

variable "project_name" {
  default = "gesalps"
}

variable "database_url" {
  description = "Connection string for Supabase/Postgres"
  type        = string
  sensitive   = true
}

variable "supabase_url" {
  type = string
}

variable "supabase_key" {
  type      = string
  sensitive = true
}

# --- Outputs ---

output "ecr_repo_api" {
  value = aws_ecr_repository.api.repository_url
}

output "ecr_repo_worker" {
  value = aws_ecr_repository.worker.repository_url
}

output "sqs_queue_url" {
  value = aws_sqs_queue.jobs.id
}

output "s3_bucket_name" {
  value = aws_s3_bucket.artifacts.id
}
