# Module: `bashcash-backend`

A Terraform module that deploys the **serverless backend** for the BashCash application.

## What It Creates

| Resource | Service | What it does |
|----------|---------|-------------|
| Session Table | DynamoDB | Stores session data (VFS, cash balance, accuracy multiplier) with auto-expiry (TTL) |
| API Function | Lambda | Handles HTTP requests (`/v1/health`, `/v1/vfs/parse`, session upserts) |
| HTTP API | API Gateway v2 | Routes HTTPS traffic to the API Lambda |
| SSL Certificate | ACM | HTTPS for the API custom domain |
| Log Groups | CloudWatch | Centralized logging |
| Notification Topic (placeholder) | SNS | Fan-out notification events |

## Architecture

```
                  ┌───────────────────────────────────────────────────┐
                  │                 API Gateway                       │
 HTTPS request ──►│  api.bashcash.{name}.fiipractic-2026.ro          │
                  │         │                                         │
                  │         ▼                                         │
                  │    ┌─────────┐     ┌──────────┐                   │
                  │    │ Lambda  │────►│ DynamoDB  │                   │
                  │    │  (API)  │────►│ (sessions)│                   │
                  │    │         │────►│           │                   │
                  │    └────┬────┘     └─────┬─────┘                   │
                  │         │                │                         │
                  │         ▼                ▼                         │
                  │    ┌────────────────────────┐                      │
                  │    │      SNS Topic         │                      │
                  │    │   (notifications)      │                      │
                  │    └───────────┬────────────┘                      │
                  │                ▼                                   │
                  └───────────────────────────────────────────────────┘
```

## How to Use It

```hcl
module "bashcash_backend" {
  source             = "./modules/bashcash-backend"
  project_name       = "my-bashcash-backend"
  source_path        = "${path.module}/../bashcash/be"
  ses_sender_email   = "noreply@my-name.fiipractic-2026.ro"
  domain_name        = "api.bashcash.my-name.fiipractic-2026.ro"
  hosted_zone_id     = data.aws_route53_zone.main_hosted_zone.id
}
```

## File-by-File Breakdown

---

### `outputs.tf` — Module Outputs

| Output | Description |
|--------|-------------|
| `api_base_url` | Primary HTTPS base URL for the BashCash API (`https://${var.domain_name}`) |
| `invoke_url` | Default API Gateway invoke URL for the `$default` stage |
| `api_id` | API Gateway HTTP API id |
| `lambda_api_name` | Lambda function name used by API Gateway |
