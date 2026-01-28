# --- S3 Bucket (Model Checkpoints & Artifacts) ---
resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.project_name}-artifacts-${random_id.suffix.hex}"
  force_destroy = true
}

resource "random_id" "suffix" {
  byte_length = 4
}

# --- SQS Queues ---

# 1. Dead Letter Queue (Forensics)
resource "aws_sqs_queue" "dlq" {
  name = "${var.project_name}-jobs-dlq"
}

# 2. Main Job Queue
resource "aws_sqs_queue" "jobs" {
  name                       = "${var.project_name}-jobs"
  visibility_timeout_seconds = 3600 # 60 Minutes (Max time a job can take)
  message_retention_seconds  = 86400 # 1 Day

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3 # Try 3 times, then DLQ
  })
}

# --- Queue Policy (Allow ECS to Send/Receive) ---
# (IAM Roles usually handle this, but explicit resource policy prevents permission errors)
resource "aws_sqs_queue_policy" "jobs_policy" {
  queue_url = aws_sqs_queue.jobs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = "*" # Restricted by IAM roles in practice
        Action = "sqs:*"
        Resource = aws_sqs_queue.jobs.arn
      }
    ]
  })
}
