# Module: `bashcash-backend`

A Terraform module that deploys the **serverless backend** for the BashCash application.

## What It Creates

| Resource | Service | What it does |
|----------|---------|-------------|
| Session Table | DynamoDB | Stores session data (VFS, cash balance, accuracy multiplier) with auto-expiry (TTL) |
| API Function | Lambda | Handles HTTP requests (`/v1/health`, `/v1/vfs/parse`, session upserts) |
| HTTP API | API Gateway v2 | Routes HTTPS traffic to the API Lambda |
| SSL Certificate | ACM | HTTPS for the API custom domain |
| Log Groups | CloudWatch | Centralized logging for the Lambda API |

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
                  │         │                                         │
                  │         ▼                                         │
                  │    ┌─────────┐                                    │
                  │    │ Bedrock │                                    │
                  │    │  (AI)   │                                    │
                  │    └─────────┘                                    │
                  └───────────────────────────────────────────────────┘
```

## How to Use It

```hcl
module "bashcash_backend" {
  source             = "./modules/bashcash-backend"
  project_name       = "my-bashcash-backend"
  source_path        = "${path.module}/../bashcash/be"
  domain_name        = "api.bashcash.my-name.fiipractic-2026.ro"
  hosted_zone_id     = data.aws_route53_zone.main_hosted_zone.id
}
```

## File-by-File Breakdown

---

### `variables.tf` — Module Inputs

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `project_name` | string | Yes | — | Prefix for all resource names |
| `source_path` | string | Yes | — | Path to the `bashcash/be` directory |
| `domain_name` | string | Yes | — | Custom domain for the API |
| `hosted_zone_id` | string | Yes | — | Route 53 zone ID for DNS records |
| `environment` | string | No | `"prod"` | Deployment stage |
| `bedrock_model_id` | string | No | Claude 3 Haiku | AI model for command explanations |

---

### `dynamodb.tf` — The Database

```hcl
resource "aws_dynamodb_table" "sessions" {
  name         = "${var.project_name}-sessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "session_id"

  attribute {
    name = "session_id"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}
```

**DynamoDB** is a serverless NoSQL database. Key decisions here:

- **`PAY_PER_REQUEST`** — you pay per read/write, not for provisioned capacity. Perfect for unpredictable traffic (and cheap at low scale).
- **`hash_key = "session_id"`** — each session has a unique UUID as its primary key.
- **TTL (Time To Live)** — DynamoDB automatically deletes items when the `ttl` timestamp passes. This is how old game sessions auto-expire.

---

### `build.tf` — Compile & Package

This file handles building the Python backend and packaging it for Lambda:

**1. Detect changes:**
Hashes the Python source files so Lambda only redeploys when the code actually changes.

**2. Run the build:**
Runs a build script to package dependencies (`pip install -t`) into a zip file, and includes the `app` folder code.

**3. Create zip archives:**
Packages the output into a `.zip` artifact suitable for the AWS Lambda Python runtime.

---

### `lambda.tf` — The API Function

This file defines the single Lambda function that powers the backend API.

```hcl
resource "aws_lambda_function" "api" {
  function_name    = "${var.project_name}-api"
  role             = aws_iam_role.api.arn
  handler          = "app.main.handler"
  runtime          = "python3.12"
  architectures    = ["arm64"]
  memory_size      = 256
  timeout          = 30
  filename         = "${local.build_dir}/api.zip"
  source_code_hash = local.source_hash
  publish          = true

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.sessions.name
      ENVIRONMENT         = var.environment
    }
  }
}
```

The function handles all API logic:
- Parsing zip uploads into VFS graphs
- Upserting and fetching sessions to/from DynamoDB
- Serving Bedrock AI completions

---

### `iam.tf` — Permissions

Controls what the Lambda function is allowed to do.

1. **Role** with a trust policy ("Lambda service can assume this role")
2. **`AWSLambdaBasicExecutionRole`** attachment (allows writing to CloudWatch Logs)
3. **Custom DynamoDB policy** (allows Get/Put/Update/Delete against the Sessions table)
4. **Custom Bedrock policy** (allows InvokeModel for Claude 3 Haiku)

---

### `api_gateway.tf` — HTTP API + Custom Domain

**API Gateway v2** (HTTP API) is the entry point for all HTTP requests:

```
Client → HTTPS → Custom Domain → API Gateway → Lambda (API)
```

Key resources:

1. **`aws_apigatewayv2_api`** — creates the HTTP API with CORS configuration
2. **`aws_apigatewayv2_stage`** — the `$default` stage.
3. **`aws_apigatewayv2_integration`** — connects the API to the Lambda function.
4. **`aws_apigatewayv2_route`** — proxy route `ANY /{proxy+}` which sends all paths directly to the FastAPI app via Mangum adapter.
5. **Custom domain** — ACM certificate + domain name + DNS record.

---

### `acm.tf` — API Certificate

Creates an SSL certificate for the API domain and validates it via Route53 DNS records. API Gateway uses regional certificates, so this is deployed in your current region.

---

### `outputs.tf` — Module Outputs

| Output | Description |
|--------|-------------|
| `api_base_url` | Primary HTTPS base URL for the BashCash API (`https://${var.domain_name}`) |
| `invoke_url` | Default API Gateway invoke URL for the `$default` stage |
| `api_id` | API Gateway HTTP API id |
| `lambda_api_name` | Lambda function name used by API Gateway |
