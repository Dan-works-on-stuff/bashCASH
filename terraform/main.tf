terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.3"
    }
  }
  backend "s3" {
    bucket = "personal-project-terraform-state-bucket"
    key    = "terraform.tfstate"
    region = "eu-central-1"
  }
}


provider "aws" {
  region = "eu-central-1"
}

provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"
}

locals {
  resource_identifier = "your-name"
  personal_email_addresses = [
    "your-email@example.com",
  ]
}

data "aws_route53_zone" "main_hosted_zone" {
  name = "${local.resource_identifier}.example.com"
}