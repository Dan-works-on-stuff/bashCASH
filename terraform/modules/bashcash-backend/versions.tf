terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
    archive = {
      source = "hashicorp/archive"
    }
    external = {
      source = "hashicorp/external"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
