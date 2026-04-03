resource "aws_sqs_queue" "delete_dlq" {
  name                      = "DeadDropDeleteDLQ-${var.environment}"
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_sqs_queue" "delete_queue" {
  name                       = "DeadDropDeleteQueue-${var.environment}"
  visibility_timeout_seconds = 60

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.delete_dlq.arn
    maxReceiveCount     = 3
  })
}