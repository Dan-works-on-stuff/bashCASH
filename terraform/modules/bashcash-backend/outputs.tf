output "api_base_url" {
  description = "Primary HTTPS base URL for the BashCash API."
  value       = "https://${var.domain_name}"
}

output "invoke_url" {
  description = "Default API Gateway invoke URL for the $default stage."
  value       = aws_apigatewayv2_stage.main.invoke_url
}

output "api_id" {
  description = "API Gateway HTTP API id."
  value       = aws_apigatewayv2_api.http.id
}

output "lambda_api_name" {
  description = "Lambda function name used by API Gateway."
  value       = aws_lambda_function.api.function_name
}

