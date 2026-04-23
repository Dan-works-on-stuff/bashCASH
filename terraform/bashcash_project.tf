# ── BashCash Frontend (auto-build via Terraform) ───────────
module "bashcash_frontend" {
  source              = "./modules/cloudfront-spa"
  project_name        = "${local.resource_identifier}-bashcash-fp-fe"
  domain_name         = "bashcash.${local.resource_identifier}.fiipractic-2026.ro"
  hosted_zone_id      = data.aws_route53_zone.main_hosted_zone.id
  project_description = "BashCash SPA"
  build_command       = "npm install && npm run build"
  build_working_dir   = "${path.module}/../bashcash/fe"
  build_environment = {
    "VITE_API_URL" = module.bashcash_backend.api_base_url
  }

  providers = {
    aws = aws.us-east-1
  }
}

# ── BashCash Backend ────────────────────────────────────────
module "bashcash_backend" {
  source           = "./modules/bashcash-backend"
  project_name     = "${local.resource_identifier}-bashcash-fp-be"
  source_path      = "${path.module}/../bashcash/be"
  domain_name      = "api.bashcash.${local.resource_identifier}.fiipractic-2026.ro"
  hosted_zone_id   = data.aws_route53_zone.main_hosted_zone.id
  ses_sender_email = "noreply@${local.resource_identifier}.fiipractic-2026.ro"
}

