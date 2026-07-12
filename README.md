# BashCash

BashCash is a personal full-stack project that simulates a POSIX terminal in the browser. Users upload a `.zip`, browse the generated virtual file system, and interact with it through shell-like commands while the app tracks session state and rewards.

## What’s in the repo

| Path | Purpose |
|------|---------|
| `bashcash/` | BashCash app source, tests, and docs |
| `terraform/` | AWS infrastructure for BashCash |
| `.github/workflows/` | CI/CD pipelines and workflow docs |

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, `@xterm/xterm` |
| Backend | Python 3.12, FastAPI, AWS Lambda, API Gateway |
| Persistence | DynamoDB |
| IaC | Terraform |

## Documentation

| Document | What it covers |
|----------|---------------|
| [bashcash/README.md](bashcash/README.md) | BashCash overview and feature summary |
| [terraform/README.md](terraform/README.md) | Terraform setup and module breakdown |
| [terraform/modules/cloudfront-spa/README.md](terraform/modules/cloudfront-spa/README.md) | Reusable SPA deployment module |
| [terraform/modules/bashcash-backend/README.md](terraform/modules/bashcash-backend/README.md) | BashCash backend module |
| [.github/workflows/README.md](.github/workflows/README.md) | CI/CD workflow docs |

## Local development

Use the README inside `bashcash/` for the app commands. The Terraform docs cover AWS deployment for the BashCash frontend and backend.
