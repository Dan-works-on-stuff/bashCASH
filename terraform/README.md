# Terraform Infrastructure — BashCash

This document explains the Terraform setup for BashCash in this repository.

## What is Terraform?

Terraform is a tool that lets you **describe your infrastructure in code** (`.tf` files), then automatically creates, updates, or deletes cloud resources to match what you described. Instead of clicking around the AWS console, you write code and run `terraform apply`.

The key idea: **you declare _what_ you want, not _how_ to create it**. Terraform figures out the order, dependencies, and API calls.

## Project Structure

```
terraform/
├── main.tf                          # Provider config, backend, shared locals
├── bashcash_project.tf               # Wires the BashCash app modules together
│
├── modules/
│   ├── cloudfront-spa/              # Reusable module: hosts any SPA on CloudFront + S3
│   │   ├── variables.tf             # Inputs this module accepts
│   │   ├── versions.tf              # Required providers
│   │   ├── certificate.tf           # SSL/TLS certificate via ACM
│   │   ├── cloudfront.tf            # CDN distribution + DNS record
│   │   ├── source_bucket.tf         # S3 bucket + build + file upload
│   │   ├── outputs.tf               # Values this module exposes
│   │   ├── main.tf                  # (empty, placeholder)
│   │   └── scripts/build.js         # Helper: runs build commands during plan
│   │
│   └── bashcash-backend/            # Module: BashCash backend
│       ├── variables.tf             # Inputs (project name, domain, email, etc.)
│       ├── versions.tf              # Required providers + data sources
│       ├── build.tf                 # Compiles Python → packages Lambda zip
│       ├── lambda.tf                # API Lambda + event wiring
│       ├── iam.tf                   # IAM roles & permissions
│       ├── api_gateway.tf           # HTTP API + custom domain + routes
│       ├── acm.tf                   # SSL certificate for the API domain
│       ├── dynamodb.tf              # Session table with TTL
│       ├── cloudwatch.tf            # Log groups + useful log queries
│       └── scripts/build.js         # Helper: runs build commands during plan
```

## How It All Connects

Here's the 10,000-foot view of what gets created:

```
                    ┌─────────────────────────────────────────┐
                    │            CloudFront (CDN)              │
User ──HTTPS──────► │  bashcash.your-name.example.com           │
                    │         ↓ serves static files            │
                    │      S3 Bucket (React app)               │
                    └─────────────────────────────────────────┘

                    ┌─────────────────────────────────────────┐
                    │           API Gateway (HTTP)             │
User ──HTTPS──────► │ api.bashcash.your-name.example.com       │
                    │         ↓ proxies to                     │
                    │    Lambda: API (Hono app)                 │
                    │         ↓ writes to                      │
                    │    DynamoDB (secrets table)               │
                    │         ↓ encrypts with                  │
                    │    KMS (encryption key)                   │
                    │         ↓ queues deletion via             │
                    │    SQS (delete queue)                     │
                    │         ↓ processed by                   │
                    │    Lambda: Delete Worker                  │
                    │         ↓ publishes event to             │
                    │    SNS (notification topic)               │
                    │         ↓ triggers                        │
                    │    Lambda: Notification                   │
                    │         ↓ sends email via                 │
                    │    SES (email service)                    │
                    └─────────────────────────────────────────┘

                    DynamoDB Streams (on TTL expiry)
                         ↓ triggers
                    Lambda: Stream Processor
                         ↓ publishes "expired" event to
                    SNS → Lambda: Notification → SES
```

## Root-Level Files

### `main.tf` — The Foundation

This is the entry point. It does three things:

1. **Configures the AWS provider** — tells Terraform "I want to use AWS, in the `eu-central-1` region"
2. **Configures the backend** — tells Terraform where to store its **state file** (an S3 bucket). The state file is how Terraform remembers what it has already created.
3. **Defines shared locals** — your unique identifier and email, used by all modules

Key concepts:
- **`required_providers`** — declares which providers (AWS, GCP, etc.) and which versions you need
- **`backend "s3"`** — remote state storage so your teammates (or CI) see the same state
- **`provider "aws"` with `alias`** — some AWS services (like CloudFront certificates) _must_ be in `us-east-1`, so we configure a second provider with an alias
- **`locals`** — reusable values (like constants in programming)
- **`data "aws_route53_zone"`** — a _data source_ reads existing resources. This looks up your hosted zone (DNS) that was already created outside Terraform.

### `bashcash_project.tf` — Wiring It Together

This file **calls the modules** — it's like calling functions with arguments. It passes your identifier, domain names, and paths into each module.

Key concept:
- **`module` blocks** are like function calls. `source` is the function, and the other fields are arguments.

## Concepts You'll See Everywhere

### Resources vs Data Sources

```hcl
resource "aws_s3_bucket" "my_bucket" { }   # CREATE something new
data "aws_route53_zone" "existing" { }       # READ something that already exists
```

### Variables, Locals, and Outputs

Think of modules like functions:
- **Variables** (`variable`) = function parameters (inputs)
- **Locals** (`locals`) = local variables inside the function
- **Outputs** (`output`) = return values

### `depends_on` and Implicit Dependencies

Terraform automatically knows that if Resource B uses Resource A's ID, then A must be created first. But sometimes Terraform can't see the dependency — that's when you add `depends_on` explicitly.

### `for_each` and `count`

Terraform's way of doing loops:
```hcl
# Create one S3 object per file in the build output
resource "aws_s3_object" "build_files" {
  for_each = fileset(local.build_path, "**/*")
  key      = each.value
  ...
}
```

### State

Terraform keeps a **state file** (`terraform.tfstate`) that maps your `.tf` code to real AWS resources. This is stored in S3 so that:
- CI/CD can access it
- Multiple people don't overwrite each other's changes
- Terraform knows what exists vs what needs to be created

---

## Module: `cloudfront-spa`

**Purpose:** Deploy any Single Page Application (React, Vue, etc.) to AWS with a CDN, custom domain, and HTTPS.

📖 See [modules/cloudfront-spa/README.md](modules/cloudfront-spa/README.md) for details.

## Module: `bashcash-backend`

**Purpose:** Deploy the BashCash backend — API, session store, and supporting AWS resources.

📖 See [modules/bashcash-backend/README.md](modules/bashcash-backend/README.md) for details.

---

## Common Terraform Commands

```bash
terraform init      # Download providers, set up backend (run once, or after adding providers)
terraform plan      # Preview what changes Terraform would make (safe, read-only)
terraform apply     # Actually create/update/delete resources to match your code
terraform destroy   # Delete everything Terraform manages (careful!)
terraform fmt       # Auto-format your .tf files
terraform validate  # Check syntax without touching AWS
```

## Tips for deployment

1. **Always run `plan` before `apply`** — read the output carefully
2. **One change at a time** — uncomment one module, apply, verify, then move on
3. **If something fails, read the error** — Terraform errors are usually descriptive
4. **Don't manually change resources in the AWS console** — Terraform will get confused (state drift)
5. **The state file is sacred** — don't delete it, don't edit it manually
