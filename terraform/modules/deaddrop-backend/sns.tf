resource "aws_sns_topic" "notifications" {
  name = "${var.project_name}-${var.environment}-notifications"
}