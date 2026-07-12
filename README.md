# Personal Projects

This repository contains two personal projects I built and am publishing under my own GitHub account:

- **BashCash** — a browser-based simulated POSIX terminal with a virtual file system
- **Dead Drop** — a self-destructing secret-sharing app with AWS infrastructure

## What’s in the repo

| Path | Purpose |
|------|---------|
| `bashcash/` | BashCash app source, tests, and docs |
| `deaddrop/` | Dead Drop app source, tests, and docs |
| `terraform/` | Shared AWS infrastructure for both projects |
| `.github/workflows/` | CI/CD pipelines and workflow docs |

## Project Highlights

| Project | Stack |
|---------|-------|
| BashCash | React 19, TypeScript, Vite, FastAPI, DynamoDB, Terraform |
| Dead Drop | TypeScript, Hono, Lambda, DynamoDB, KMS, SQS, SNS, SES, Terraform |

## Documentation

| Document | What it covers |
|----------|---------------|
| [bashcash/README.md](bashcash/README.md) | BashCash overview |
| [terraform/README.md](terraform/README.md) | Terraform setup and module breakdown |
| [terraform/modules/cloudfront-spa/README.md](terraform/modules/cloudfront-spa/README.md) | Reusable SPA deployment module |
| [terraform/modules/bashcash-backend/README.md](terraform/modules/bashcash-backend/README.md) | BashCash backend module |
| [terraform/modules/deaddrop-backend/README.md](terraform/modules/deaddrop-backend/README.md) | Dead Drop backend module |
| [.github/workflows/README.md](.github/workflows/README.md) | CI/CD workflow docs |

## Local development

Each app has its own frontend and backend commands in its folder. Start with the app README, then follow the Terraform docs if you want to deploy the AWS resources.
