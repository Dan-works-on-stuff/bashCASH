# Module: `deaddrop-backend`

A Terraform module that deploys the **entire serverless backend** for the Dead Drop application — API, database, encryption, queues, email notifications, and observability.

## What It Creates

| Resource | Service | What it does |
|----------|---------|-------------|
| Secrets Table | DynamoDB | Stores encrypted secrets with auto-expiry (TTL) |
| Encryption Key | KMS | Encrypts/decrypts secret content at rest |
| API Function | Lambda | Handles HTTP requests (create, view, generate) |
| Delete Worker | Lambda | Processes deletion queue, publishes events |
| Stream Processor | Lambda | Watches DynamoDB for TTL expiry, publishes events |
| Notification Function | Lambda | Sends emails when secrets are viewed/expired |
| HTTP API | API Gateway v2 | Routes HTTPS traffic to the API Lambda |
| Delete Queue + DLQ | SQS | Reliable async deletion with retry |
| Notification Topic | SNS | Fan-out notification events |
| Email Domain | SES | Domain verification + DKIM for sending emails |
| SSL Certificate | ACM | HTTPS for the API custom domain |
| Log Groups + Queries | CloudWatch | Centralized logging + pre-built search queries |

## Architecture

```
                  ┌───────────────────────────────────────────────────┐
                  │                 API Gateway                       │
 HTTPS request ──►│  api.deaddrop.{name}.example.com                 │
                  │         │                                         │
                  │         ▼                                         │
                  │    ┌─────────┐     ┌──────────┐    ┌─────────┐  │
                  │    │ Lambda  │────►│ DynamoDB  │    │   KMS   │  │
                  │    │  (API)  │────►│ (secrets) │    │ (encrypt│  │
                  │    │         │────►│           │    │ /decrypt│  │
                  │    └────┬────┘     └─────┬─────┘    └─────────┘  │
                  │         │                │                        │
                  │         ▼                │ DynamoDB Streams       │
                  │    ┌─────────┐           │ (on TTL REMOVE)       │
                  │    │  SQS    │           ▼                        │
                  │    │ (delete │     ┌───────────┐                  │
                  │    │  queue) │     │  Lambda   │                  │
                  │    └────┬────┘     │ (stream   │                  │
                  │         │          │ processor)│                  │
                  │         ▼          └─────┬─────┘                  │
                  │    ┌─────────┐           │                        │
                  │    │ Lambda  │           │                        │
                  │    │ (delete │           │                        │
                  │    │ worker) │           │                        │
                  │    └────┬────┘           │                        │
                  │         │                │                        │
                  │         ▼                ▼                        │
                  │    ┌────────────────────────┐                     │
                  │    │      SNS Topic         │                     │
                  │    │   (notifications)      │                     │
                  │    └───────────┬────────────┘                     │
                  │                ▼                                   │
                  │    ┌─────────────────────┐                        │
                  │    │   Lambda             │                        │
                  │    │  (notification)      │                        │
                  │    │        │             │                        │
                  │    │        ▼             │                        │
                  │    │   SES (send email)   │                        │
                  │    └─────────────────────┘                        │
                  └───────────────────────────────────────────────────┘
```

## Two Paths That Trigger Emails

1. **Secret is viewed:** API → marks as viewed → SQS → Delete Worker → deletes from DB → SNS → Notification → SES → "Your secret was viewed" email
2. **Secret expires (TTL):** DynamoDB auto-deletes → DynamoDB Stream fires REMOVE event → Stream Processor → SNS → Notification → SES → "Your secret expired" email

## How to Use It

```hcl
module "deaddrop_backend" {
  source             = "./modules/deaddrop-backend"
  project_name       = "my-deaddrop-backend"
  source_path        = "${path.module}/../deaddrop/be"
  ses_sender_email   = "noreply@my-name.example.com"
  ses_sandbox_emails = ["my-email@gmail.com"]
  domain_name        = "api.deaddrop.my-name.example.com"
  hosted_zone_id     = data.aws_route53_zone.my_zone.id
}
```

## File-by-File Breakdown

---

### `variables.tf` — Module Inputs

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `project_name` | string | Yes | — | Prefix for all resource names |
| `source_path` | string | Yes | — | Path to the `deaddrop/be` directory |
| `domain_name` | string | Yes | — | Custom domain for the API |
| `hosted_zone_id` | string | Yes | — | Route 53 zone ID for DNS records |
| `ses_sender_email` | string | Yes | — | "From" address for notification emails |
| `ses_sandbox_emails` | list(string) | No | `[]` | Email addresses to verify (for SES sandbox) |
| `environment` | string | No | `"prod"` | Deployment stage |
| `bedrock_model_id` | string | No | Claude 3 Haiku | AI model for content generation |
| `ses_domain` | string | No | auto-detected | Domain to verify in SES |
| `mail_from_subdomain` | string | No | `null` | Custom MAIL FROM subdomain |

---

### `versions.tf` — Providers + Data Sources

Declares that this module needs three providers:
- **`aws`** — for all AWS resources
- **`archive`** — to create `.zip` files for Lambda deployment
- **`external`** — to run build scripts

Also pulls in two data sources used across the module:
- `aws_caller_identity` — gets your AWS account ID
- `aws_region` — gets the current region

---

### `dynamodb.tf` — The Database

```hcl
resource "aws_dynamodb_table" "secrets" {
  name         = "DeadDropSecrets-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
}
```

**DynamoDB** is a serverless NoSQL database. Key decisions here:

- **`PAY_PER_REQUEST`** — you pay per read/write, not for provisioned capacity. Perfect for unpredictable traffic (and cheap at low scale).
- **`hash_key = "id"`** — each secret has a unique ID as its primary key.
- **TTL (Time To Live)** — DynamoDB automatically deletes items when the `ttl` timestamp passes. This is how secrets auto-expire without any cron job.
- **Streams** — when DynamoDB deletes an expired item, it fires a "REMOVE" event into a stream. Our Stream Processor Lambda listens to this stream to send "your secret expired" emails.
- **`NEW_AND_OLD_IMAGES`** — the stream includes both the old and new state of the item, so we can see the email address of the expired secret.

---

### `kms.tf` — Encryption Key

```hcl
resource "aws_kms_key" "encryption" {
  description         = "${var.project_name}-${var.environment}-encryption-key"
  enable_key_rotation = true
  deletion_window_in_days = 7
}
```

**KMS (Key Management Service)** manages encryption keys. The API Lambda uses this key to encrypt secret content before storing it in DynamoDB, and decrypt it when someone views the secret.

- **`enable_key_rotation`** — AWS automatically rotates the key material yearly (security best practice)
- **`deletion_window_in_days = 7`** — if you destroy this resource, AWS waits 7 days before actually deleting the key (safety net)

---

### `sqs.tf` — Message Queue

```hcl
resource "aws_sqs_queue" "delete_queue" {
  name                       = "DeadDropDeleteQueue-${var.environment}"
  visibility_timeout_seconds = 60

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.delete_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "delete_dlq" {
  name                      = "DeadDropDeleteDLQ-${var.environment}"
  message_retention_seconds = 1209600  # 14 days
}
```

**SQS (Simple Queue Service)** decouples the API from deletion logic. When a secret is viewed:
1. API puts a "delete this secret" message in the queue
2. API immediately returns a response to the user (fast!)
3. Delete Worker Lambda picks up the message later and handles cleanup

**Why a queue instead of deleting directly?** Reliability. If the delete fails, SQS retries automatically. After 3 failures, the message goes to the **Dead Letter Queue (DLQ)** for investigation instead of being lost.

- **`visibility_timeout_seconds = 60`** — after a Lambda picks up a message, other consumers can't see it for 60 seconds (prevents duplicate processing)
- **`maxReceiveCount = 3`** — after 3 failed attempts, move to DLQ
- **DLQ retention: 14 days** — gives you time to investigate failures

---

### `sns.tf` — Notification Topic

```hcl
resource "aws_sns_topic" "notifications" {
  name = "${var.project_name}-${var.environment}-notifications"
}
```

**SNS (Simple Notification Service)** is a pub/sub messaging service. Both the Delete Worker and Stream Processor publish events ("viewed" or "expired") to this topic. The Notification Lambda subscribes to it and sends emails.

**Why SNS between the workers and the notification Lambda?** It's a fan-out pattern. Today there's only one subscriber (email notifications), but you could easily add Slack notifications, webhooks, or analytics without changing the workers.

---

### `ses.tf` — Email Sending

SES (Simple Email Service) handles email delivery. This file sets up:

**1. Domain verification:**
```hcl
resource "aws_ses_domain_identity" "this" {
  domain = local.ses_domain
}
```
Tells AWS "I want to send emails from this domain." AWS needs proof you own it.

**2. DNS verification record:**
```hcl
resource "aws_route53_record" "ses_verification" {
  name    = "_amazonses.${local.ses_domain}"
  type    = "TXT"
  records = [aws_ses_domain_identity.this.verification_token]
}
```
Adds a TXT record to your DNS that proves domain ownership.

**3. DKIM (DomainKeys Identified Mail):**
```hcl
resource "aws_ses_domain_dkim" "this" {
  domain = aws_ses_domain_identity.this.domain
}
```
DKIM cryptographically signs your emails so recipients' mail servers can verify they really came from your domain (prevents spoofing). AWS gives you 3 CNAME records to add to DNS.

**4. Sandbox email verification:**
```hcl
resource "aws_ses_email_identity" "sandbox" {
  for_each = toset(var.ses_sandbox_emails)
  email    = each.value
}
```
New SES accounts are in "sandbox mode" — you can only send to verified addresses. This verifies each student's email so they can receive notifications.

---

### `build.tf` — Compile & Package

This file handles building the TypeScript backend and packaging it for Lambda:

**1. Detect changes:**
```hcl
locals {
  source_hash  = sha256(join(",", sort([for f in local.source_files : filemd5("...")])))
  package_hash = filemd5("${var.source_path}/package-lock.json")
}
```
Creates a hash of all source files. When any file changes, the hash changes, which triggers Lambda to update.

**2. Run the build:**
```hcl
data "external" "build" {
  program = ["node", "scripts/build.js"]
  query   = { command = "npm ci && npm run build" }
}
```
Runs `npm ci` (clean install) + `npm run build` (esbuild bundles TypeScript into JavaScript).

**3. Create zip archives:**
```hcl
data "archive_file" "api" {
  type        = "zip"
  source_dir  = "${local.build_dir}/api"
  output_path = "${local.build_dir}/api.zip"
}
```
Each Lambda function gets its own zip. The `archive` provider creates these cross-platform (works on Mac, Linux, Windows).

---

### `lambda.tf` — The 4 Lambda Functions

This is the biggest file. It defines all four Lambda functions and wires them to their event sources.

**The 4 functions:**

| Function | Trigger | Purpose |
|----------|---------|---------|
| **API** | API Gateway (HTTP requests) | Handles create/view/generate endpoints |
| **Delete Worker** | SQS queue | Deletes secrets from DB, publishes SNS events |
| **Stream Processor** | DynamoDB Streams | Catches TTL expiry, publishes SNS events |
| **Notification** | SNS topic | Sends emails via SES |

**Common patterns across all functions:**

```hcl
resource "aws_lambda_function" "api" {
  function_name    = "${var.project_name}-api"
  role             = aws_iam_role.api.arn          # IAM role (permissions)
  handler          = "api.handler"                  # file.exportedFunction
  runtime          = "nodejs24.x"                   # Node.js version
  architectures    = ["arm64"]                      # ARM = cheaper + faster
  memory_size      = 256                            # MB of RAM
  timeout          = 30                             # seconds
  filename         = "${local.build_dir}/api.zip"   # deployment package
  source_code_hash = local.source_hash              # triggers update on code change
  publish          = true                           # creates a new version each deploy
}
```

**Lambda Aliases:**
```hcl
resource "aws_lambda_alias" "api_live" {
  name             = "live"
  function_name    = aws_lambda_function.api.function_name
  function_version = aws_lambda_function.api.version
}
```
An alias is like a pointer. API Gateway points to the `live` alias, which points to the latest version. This enables safe deployments — you could add canary deployments later (10% → new version, 90% → old version).

**Event Source Mappings:**

```hcl
# SQS → Delete Worker
resource "aws_lambda_event_source_mapping" "sqs_delete" {
  event_source_arn = aws_sqs_queue.delete_queue.arn
  function_name    = aws_lambda_alias.delete_worker_live.arn
  batch_size       = 10
}

# DynamoDB Streams → Stream Processor (only REMOVE events)
resource "aws_lambda_event_source_mapping" "dynamodb_stream" {
  event_source_arn  = aws_dynamodb_table.secrets.stream_arn
  function_name     = aws_lambda_alias.stream_processor_live.arn
  starting_position = "TRIM_HORIZON"
  batch_size        = 10

  filter_criteria {
    filter {
      pattern = jsonencode({ eventName = ["REMOVE"] })
    }
  }
}
```

The `filter_criteria` on the DynamoDB stream is important — without it, the Stream Processor would fire on every INSERT and UPDATE too. We only care about REMOVE (TTL expiry).

**SNS → Notification:**
```hcl
resource "aws_sns_topic_subscription" "notification_lambda" {
  topic_arn = aws_sns_topic.notifications.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_alias.notification_live.arn
}
```

---

### `iam.tf` — Permissions

**IAM (Identity and Access Management)** controls what each Lambda function is allowed to do. Every function gets its own role with **least-privilege** permissions.

**Structure for each function:**
1. **Role** with a trust policy ("Lambda service can assume this role")
2. **`AWSLambdaBasicExecutionRole`** attachment (allows writing to CloudWatch Logs)
3. **Custom policy** with only the specific actions needed

**Permission matrix:**

| Function | DynamoDB | SQS | KMS | SNS | SES | Bedrock |
|----------|----------|-----|-----|-----|-----|---------|
| API | Get, Put, Update, Delete | SendMessage | Encrypt, Decrypt | — | — | InvokeModel |
| Delete Worker | DeleteItem | Receive, Delete, GetAttributes | — | Publish | — | — |
| Stream Processor | GetRecords, GetShardIterator, DescribeStream, ListStreams | — | — | Publish | — | — |
| Notification | — | — | — | — | SendEmail | — |

**Why separate roles?** Security principle of **least privilege**. If the Notification Lambda gets compromised, it can only send emails — it can't read/delete secrets or decrypt data.

---

### `api_gateway.tf` — HTTP API + Custom Domain

**API Gateway v2** (HTTP API) is the entry point for all HTTP requests:

```
Client → HTTPS → Custom Domain → API Gateway → Lambda (API)
```

Key resources:

1. **`aws_apigatewayv2_api`** — creates the HTTP API with CORS configuration
2. **`aws_apigatewayv2_stage`** — the `$default` stage with throttling limits (50 burst / 100 rate)
3. **`aws_apigatewayv2_integration`** — connects the API to the Lambda function
4. **`aws_apigatewayv2_route`** — two routes:
   - `ANY /{proxy+}` — catch-all for any path/method (proxied to Lambda)
   - `GET /` — root path
5. **Custom domain** — ACM certificate + domain name + DNS record

**Why `payload_format_version = "2.0"`?** V2 format is simpler and includes the request body directly. V1 was more verbose.

**Why `auto_deploy = true`?** Route changes are deployed immediately without needing a separate deployment step.

---

### `acm.tf` — API Certificate

Same pattern as the CloudFront module's certificate — creates an SSL certificate for the API domain and validates it via DNS. The only difference: this certificate is in your region (not `us-east-1`) because API Gateway uses regional certificates.

---

### `cloudwatch.tf` — Logging & Observability

**Log Groups** — each Lambda gets its own log group with 14-day retention:
```hcl
resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${var.project_name}-api"
  retention_in_days = 14
}
```

**Log Insights Queries** — pre-built queries you can run in the AWS console:

| Query | What it finds |
|-------|--------------|
| **All Errors** | Any log line containing "error", "exception", or "fail" across all functions |
| **API 5xx Responses** | Server errors in the API function |
| **Cold Starts** | Lambda invocations that had an init phase (first invocation of a new container) |
| **Slow Requests (>3s)** | API requests that took more than 3 seconds |
| **Lambda Performance Stats** | Average/max/p99 duration and memory usage per function |

These are useful for debugging and monitoring. You'll find them in **CloudWatch → Logs Insights** in the AWS console.

---

### `scripts/build.js` — Build Helper

Same as the CloudFront module's build script. Reads a JSON command from stdin, runs it, outputs `{"status": "ok"}`. Used by the `external` data source to execute `npm ci && npm run build` during `terraform plan`.
