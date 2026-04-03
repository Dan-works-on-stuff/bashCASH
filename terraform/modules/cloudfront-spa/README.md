# Module: `cloudfront-spa`

A reusable Terraform module that deploys a **Single Page Application** (like a React app) to AWS using S3 + CloudFront with a custom domain and HTTPS.

## What It Creates

| Resource | What it does |
|----------|-------------|
| **S3 Bucket** | Stores your built frontend files (HTML, CSS, JS, images) |
| **CloudFront Distribution** | CDN that serves those files globally with low latency |
| **ACM Certificate** | Free SSL/TLS certificate for your custom domain (HTTPS) |
| **Route 53 DNS Record** | Points your domain to the CloudFront distribution |

## Architecture

```
Browser                  CloudFront (CDN)              S3 Bucket
  │                          │                            │
  │── GET index.html ──────► │                            │
  │                          │── fetch from origin ─────► │
  │                          │◄── return file ──────────  │
  │◄── cached response ────  │                            │
  │                          │                            │
  │── GET /about ──────────► │                            │
  │                          │── 403 (no /about file) ──► │
  │                          │── custom error → /index.html│
  │◄── index.html (200) ──  │   (SPA routing fix!)       │
```

## How to Use It

```hcl
module "my_frontend" {
  source              = "./modules/cloudfront-spa"
  project_name        = "my-app-frontend"
  domain_name         = "app.example.com"
  hosted_zone_id      = data.aws_route53_zone.my_zone.id
  project_description = "My awesome app"
  build_command       = "npm install && npm run build"
  build_working_dir   = "${path.module}/../frontend"
  build_environment   = {
    "VITE_API_URL" = "https://api.example.com"
  }

  providers = {
    aws = aws.us-east-1  # CloudFront certificates MUST be in us-east-1
  }
}
```

## File-by-File Breakdown

### `variables.tf` — Module Inputs

These are the "arguments" you pass when calling this module:

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `project_name` | string | Yes | Used as prefix for all resource names (S3 bucket, etc.) |
| `domain_name` | string | Yes | The custom domain (e.g. `app.example.com`) |
| `hosted_zone_id` | string | Yes | The Route 53 zone where DNS records will be created |
| `project_description` | string | Yes | Shows as a comment on the CloudFront distribution |
| `build_command` | string | Yes | Shell command to build your app (e.g. `npm ci && npm run build`) |
| `build_working_dir` | string | Yes | Directory where the build command runs |
| `build_environment` | map(string) | No | Environment variables injected during build |
| `build_output_dir` | string | No | Build output folder, relative to `build_working_dir` (default: `dist`) |
| `function_association` | object | No | Optional CloudFront Function (for URL rewrites, auth, etc.) |

### `versions.tf` — Required Providers

Declares that this module needs the `aws` and `external` providers. The `external` provider lets Terraform run scripts (like our build script) and capture their output.

```hcl
terraform {
  required_providers {
    aws      = { source = "hashicorp/aws" }
    external = { source = "hashicorp/external" }
  }
}
```

### `certificate.tf` — HTTPS Certificate

**What:** Creates a free SSL/TLS certificate using AWS Certificate Manager (ACM) and proves you own the domain via DNS validation.

**How it works, step by step:**

1. `aws_acm_certificate` — tells AWS "I want a certificate for `app.example.com`"
2. AWS responds with a DNS challenge: "prove you own this domain by adding this TXT record"
3. `aws_route53_record` — automatically creates the DNS validation record
4. `aws_acm_certificate_validation` — waits until AWS verifies the record and issues the certificate

**Why `create_before_destroy`?** If you ever need to recreate the certificate (e.g. changing domains), Terraform creates the new one first, switches references to it, then destroys the old one. This avoids downtime.

```
┌────────────────┐    DNS challenge    ┌─────────────┐    verify     ┌─────────────┐
│ ACM Certificate│──────────────────►  │ Route 53    │ ◄──────────── │ ACM         │
│ (requested)    │                     │ (TXT record)│               │ (validated) │
└────────────────┘                     └─────────────┘               └─────────────┘
```

### `source_bucket.tf` — Build + Upload

This is the most complex file. It handles three things:

**1. Building your app at plan time:**

```hcl
data "external" "build" {
  program     = ["node", "scripts/build.js"]
  working_dir = var.build_working_dir
  query       = merge({ command = var.build_command }, var.build_environment)
}
```

The `external` data source runs `build.js`, which executes your build command (`npm install && npm run build`). This happens during `terraform plan`, so the built files are ready before Terraform starts uploading.

**2. Uploading files to S3:**

```hcl
resource "aws_s3_object" "build_files" {
  for_each     = fileset(local.build_path, "**/*")
  key          = each.value
  source       = "${local.build_path}/${each.value}"
  etag         = filemd5("${local.build_path}/${each.value}")
  content_type = lookup(local.content_types, regex("\\.[^.]+$", each.value), "application/octet-stream")
}
```

`for_each` + `fileset` = "for every file in the `dist/` directory, create an S3 object". The `etag` (MD5 hash) ensures Terraform only re-uploads files that actually changed.

The `content_types` local map ensures each file gets the correct MIME type (so browsers know `.js` is JavaScript, `.css` is CSS, etc.).

**3. S3 Bucket Policy:**

The bucket is private — only CloudFront can read from it. The policy says:
> "Allow `s3:GetObject` only if the request comes from _this specific_ CloudFront distribution"

This is more secure than making the bucket public.

**4. Cache Invalidation:**

When files change, CloudFront might still serve the old cached version. The `action` block creates a CloudFront cache invalidation whenever S3 objects change, so users see the new version immediately.

### `cloudfront.tf` — CDN + DNS

**CloudFront Distribution** — the CDN that serves your app:

Key settings:
- **Origin Access Control (OAC)** — securely connects CloudFront to the private S3 bucket using SigV4 signing
- **`default_root_object = "index.html"`** — visiting the root URL serves `index.html`
- **`custom_error_response` (403 → /index.html)** — this is the SPA routing fix! When someone visits `/about`, S3 returns 403 (no file at `/about`). CloudFront intercepts this and serves `index.html` instead, letting React Router handle the route client-side.
- **`viewer_protocol_policy = "redirect-to-https"`** — HTTP automatically redirects to HTTPS
- **Cache policies** — uses AWS-managed policies for optimal caching + CORS
- **`aliases`** — tells CloudFront to respond to your custom domain

**Route 53 A Record** — an alias record pointing your domain to CloudFront. Note: `Z2FDTNDATAQYW2` is CloudFront's fixed hosted zone ID (it's the same for everyone, it's an AWS constant).

### `outputs.tf` — Module Outputs

Currently empty. You could add outputs here to expose the CloudFront URL, S3 bucket name, etc. to other modules.

### `scripts/build.js` — Build Helper

A small Node.js script that:
1. Reads JSON from stdin (Terraform's `external` provider sends the `query` as JSON)
2. Extracts the `command` and any environment variables
3. Runs the command (e.g. `npm install && npm run build`)
4. Outputs `{"status": "ok"}` on stdout (required by `external` provider)

This is needed because Terraform's `external` data source requires a program that reads JSON on stdin and outputs JSON on stdout.
