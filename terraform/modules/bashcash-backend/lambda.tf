resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${var.project_name}-api"
  retention_in_days = 7
}
resource "aws_lambda_function" "api" {
  depends_on       = [data.archive_file.api, aws_cloudwatch_log_group.api]
  function_name    = "${var.project_name}-api"
  role             = aws_iam_role.api.arn
  handler          = "app.main.handler"
  runtime          = "python3.12"
  architectures    = ["x86_64"]
  memory_size      = 256
  timeout          = 30
  filename         = "${local.build_dir}/api.zip"
  source_code_hash = data.archive_file.api.output_base64sha256
  publish          = true
  logging_config {
    log_format = "JSON"
    log_group  = aws_cloudwatch_log_group.api.name
  }
  environment {
    variables = {
      TABLE_NAME       = aws_dynamodb_table.sessions.name
      BEDROCK_MODEL_ID = var.bedrock_model_id
    }
  }
}
resource "aws_lambda_alias" "api_live" {
  name             = "live"
  function_name    = aws_lambda_function.api.function_name
  function_version = aws_lambda_function.api.version
}
