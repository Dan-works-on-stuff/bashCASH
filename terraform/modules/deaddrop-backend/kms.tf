resource "aws_kms_key" "encryption" {
  description         = "${var.project_name}-${var.environment}-encryption-key"
  enable_key_rotation = true

  deletion_window_in_days = 7
}