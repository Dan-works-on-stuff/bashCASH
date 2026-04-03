terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.3"
    }
  }
  backend "s3" {
    bucket = "radu-dan-stefan-fiipractic-terraform-state-bucket"
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
  resource_identifier = "radu-dan-stefan"
  personal_email_addresses = [
    "radudan610@gmail.com",
  ]
}

data "aws_route53_zone" "main_hosted_zone" {
  name = "${local.resource_identifier}.fiipractic-2026.ro"
}