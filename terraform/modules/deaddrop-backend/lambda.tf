# ── Lambda Functions ─────────────────────────────────────────
resource "aws_lambda_function" "api" {
  depends_on = [data.archive_file.api, aws_cloudwatch_log_group.api]

  function_name    = "${var.project_name}-api"
  role             = aws_iam_role.api.arn
  handler          = "api.handler"
  runtime          = "nodejs24.x"
  architectures    = ["arm64"]
  memory_size      = 256
  timeout          = 30
  filename         = "${local.build_dir}/api.zip"
  source_code_hash = local.source_hash
  publish          = true
  logging_config {
    log_format = "JSON"
    log_group = aws_cloudwatch_log_group.api.name
  }

  environment {
    variables = {
      TABLE_NAME       = aws_dynamodb_table.secrets.name
      QUEUE_URL        = aws_sqs_queue.delete_queue.url
      KMS_KEY_ID       = aws_kms_key.encryption.id
      BEDROCK_MODEL_ID = var.bedrock_model_id
    }
  }
}

resource "aws_lambda_alias" "api_live" {
  name             = "live"
  function_name    = aws_lambda_function.api.function_name
  function_version = aws_lambda_function.api.version
}

resource "aws_lambda_function" "delete_worker" {
  depends_on = [data.archive_file.delete_worker, aws_cloudwatch_log_group.delete_worker]

  function_name    = "${var.project_name}-delete-worker"
  role             = aws_iam_role.delete_worker.arn
  handler          = "delete-worker.handler"
  runtime          = "nodejs24.x"
  architectures    = ["arm64"]
  memory_size      = 128
  timeout          = 30
  filename         = "${local.build_dir}/delete-worker.zip"
  source_code_hash = local.source_hash
  publish          = true

  environment {
    variables = {
      TABLE_NAME    = aws_dynamodb_table.secrets.name
      SNS_TOPIC_ARN = aws_sns_topic.notifications.arn
    }
  }
}

resource "aws_lambda_alias" "delete_worker_live" {
  name             = "live"
  function_name    = aws_lambda_function.delete_worker.function_name
  function_version = aws_lambda_function.delete_worker.version
}

resource "aws_lambda_function" "stream_processor" {
  depends_on = [data.archive_file.stream_processor, aws_cloudwatch_log_group.stream_processor]

  function_name    = "${var.project_name}-stream-processor"
  role             = aws_iam_role.stream_processor.arn
  handler          = "stream-processor.handler"
  runtime          = "nodejs24.x"
  architectures    = ["arm64"]
  memory_size      = 128
  timeout          = 30
  filename         = "${local.build_dir}/stream-processor.zip"
  source_code_hash = local.source_hash
  publish          = true

  environment {
    variables = {
      SNS_TOPIC_ARN = aws_sns_topic.notifications.arn
    }
  }
}

resource "aws_lambda_alias" "stream_processor_live" {
  name             = "live"
  function_name    = aws_lambda_function.stream_processor.function_name
  function_version = aws_lambda_function.stream_processor.version
}

resource "aws_lambda_function" "notification" {
  depends_on = [data.archive_file.notification, aws_cloudwatch_log_group.notification]

  function_name    = "${var.project_name}-notification"
  role             = aws_iam_role.notification.arn
  handler          = "notification.handler"
  runtime          = "nodejs24.x"
  architectures    = ["arm64"]
  memory_size      = 128
  timeout          = 10
  filename         = "${local.build_dir}/notification.zip"
  source_code_hash = local.source_hash
  publish          = true

  environment {
    variables = {
      SES_SENDER_EMAIL = var.ses_sender_email
    }
  }
}

resource "aws_lambda_alias" "notification_live" {
  name             = "live"
  function_name    = aws_lambda_function.notification.function_name
  function_version = aws_lambda_function.notification.version
}

# ── Event Source Mappings ────────────────────────────────────
resource "aws_lambda_event_source_mapping" "sqs_delete" {
  event_source_arn = aws_sqs_queue.delete_queue.arn
  function_name    = aws_lambda_alias.delete_worker_live.arn
  batch_size       = 10
}

resource "aws_lambda_event_source_mapping" "dynamodb_stream" {
  event_source_arn  = aws_dynamodb_table.secrets.stream_arn
  function_name     = aws_lambda_alias.stream_processor_live.arn
  starting_position = "TRIM_HORIZON"
  batch_size        = 10

  filter_criteria {
    filter {
      pattern = jsonencode({ eventName = ["REMOVE"] })
    }
  }
}

# ── SNS → Notification Lambda ───────────────────────────────
resource "aws_sns_topic_subscription" "notification_lambda" {
  topic_arn = aws_sns_topic.notifications.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_alias.notification_live.arn
}

resource "aws_lambda_permission" "sns_invoke_notification" {
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.notification.function_name
  qualifier     = aws_lambda_alias.notification_live.name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.notifications.arn
}
