# Dead Drop

A self-destructing secret sharing app built for the **FII Practic 2026** workshop series. Create an encrypted secret, share a link, and it self-destructs after one view.

## How It Works

1. You write a secret and set a password + expiration (1h / 24h / 7d)
2. The app gives you a shareable link
3. The recipient opens the link, enters the password, and sees the secret
4. The secret is permanently deleted after being viewed (or when it expires)

## Project Structure

```
.
├── deaddrop/
│   ├── fe/                  # React frontend (Vite + TypeScript)
│   └── be/                  # Serverless backend (Hono + Lambda + TypeScript)
│
├── terraform/               # Infrastructure as Code (AWS)
│   ├── main.tf              # Provider config, backend, shared variables
│   ├── deaddrop_project.tf  # Wires frontend + backend modules together
│   └── modules/
│       ├── cloudfront-spa/  # Reusable module: deploy any SPA to CloudFront + S3
│       └── deaddrop-backend/# Backend: Lambda, DynamoDB, KMS, SQS, SNS, SES
│
├── .github/workflows/       # CI/CD pipelines
│   ├── deploy.yml           # Auto-deploy on push to main
│   └── pr.yml               # Tests + Terraform plan on pull requests
│
└── clean.sh                 # Utility: cleans build artifacts
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, React Router |
| Backend | Hono (on AWS Lambda), TypeScript, esbuild |
| Database | DynamoDB (with TTL for auto-expiry) |
| Encryption | AWS KMS |
| Email | AWS SES (notifications on view/expiry) |
| CDN | CloudFront + S3 |
| DNS/TLS | Route 53 + ACM |
| Queues | SQS (deletion) + SNS (notifications) |
| CI/CD | GitHub Actions |
| IaC | Terraform |

## Documentation

| Document | What it covers |
|----------|---------------|
| [terraform/README.md](terraform/README.md) | Terraform overview, project structure, key concepts, commands |
| [terraform/modules/cloudfront-spa/README.md](terraform/modules/cloudfront-spa/README.md) | CloudFront + S3 module: file-by-file breakdown |
| [terraform/modules/deaddrop-backend/README.md](terraform/modules/deaddrop-backend/README.md) | Serverless backend module: file-by-file breakdown |
| [.github/workflows/README.md](.github/workflows/README.md) | CI/CD pipelines: what they do and how they work |

## Getting Started

### Prerequisites

- Node.js 24+
- Terraform
- AWS CLI configured with your credentials
- Your AWS secrets set up in GitHub repo settings

### Local Development

```bash
# Frontend
cd deaddrop/fe
npm install
npm run dev          # Starts on http://localhost:5173

# Backend (requires AWS credentials for KMS, DynamoDB, etc.)
cd deaddrop/be
npm install
npm run build
```

### Deploy

Infrastructure deploys automatically when you push to `main`. To deploy manually:

```bash
cd terraform
terraform init
terraform plan       # Review changes
terraform apply      # Apply changes
```

### Run Tests

```bash
cd deaddrop/be && npm test    # Backend: ID generation, validation schemas
cd deaddrop/fe && npm test    # Frontend: API client tests
```
