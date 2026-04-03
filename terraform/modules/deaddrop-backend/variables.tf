variable "project_name" {
  description = "Prefix for all resource names"
  type        = string
}

variable "environment" {
  description = "Deployment stage (e.g. prod, dev)"
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = "Custom domain for the API (e.g. api.deaddrop.example.com)"
  type        = string
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID"
  type        = string
}

variable "bedrock_model_id" {
  description = "Bedrock model ID for text generation"
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}

variable "ses_sender_email" {
  description = "Sender email address for notifications (e.g. noreply@example.com)"
  type        = string
}

variable "ses_domain" {
  description = "Domain to verify in SES (e.g. example.com). Defaults to domain part of ses_sender_email."
  type        = string
  default     = null
}

variable "ses_sandbox_emails" {
  description = "List of email addresses to verify as SES identities (for sandbox testing)"
  type        = list(string)
  default     = []
}

variable "mail_from_subdomain" {
  description = "Custom MAIL FROM subdomain (e.g. 'mail'). Set to null to disable."
  type        = string
  default     = null
}

variable "source_path" {
  description = "Absolute path to the backend source directory (deaddrop/be)"
  type        = string
}