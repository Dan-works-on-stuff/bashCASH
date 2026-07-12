# GitHub Actions Workflows

This directory contains the CI/CD pipelines for BashCash.

## What is GitHub Actions?

GitHub Actions is a CI/CD (Continuous Integration / Continuous Deployment) platform built into GitHub. It lets you automate tasks — running tests, deploying infrastructure, checking code quality — triggered by events like pushes, pull requests, or schedules.

**Key terminology:**
- **Workflow** — a YAML file that defines an automated process (one file = one workflow)
- **Trigger** (`on:`) — the event that starts the workflow (push, pull_request, schedule, etc.)
- **Job** — a group of steps that run on the same machine. Jobs run in parallel by default.
- **Step** — a single command or action within a job
- **Action** — a reusable unit (like a function) published on the GitHub Marketplace. Used with `uses:`
- **Runner** — the machine that executes the job. We use `ubicloud-standard-2` (free, open-source runners)
- **Secrets** — encrypted values (like AWS keys) stored in repo settings, accessed via `${{ secrets.NAME }}`

## Workflows

### `deploy.yml` — Deploy Infrastructure

**Triggers:** Every push to `main`

```
Push to main → Checkout code → Setup Node + Terraform → Configure AWS → terraform init → terraform apply
```

This is the **Continuous Deployment** pipeline. Every time code lands on `main`, Terraform automatically applies the infrastructure changes to AWS. No manual intervention needed.

| Step | What it does |
|------|-------------|
| Checkout | Clones the repo onto the runner |
| Setup Node.js | Installs Node 24 (needed to build Lambda functions and the frontend during `terraform apply`) |
| Setup Terraform | Installs the Terraform CLI |
| Configure AWS Credentials | Sets up AWS access using secrets stored in the repo (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) |
| Terraform Init | Downloads providers, connects to the S3 backend (state file) |
| Terraform Apply | Creates/updates/deletes AWS resources to match the `.tf` files. `--auto-approve` skips the confirmation prompt since this is automated. |

**Why `--auto-approve`?** In CI, there's no human to type "yes". The assumption is that the PR review process already approved the changes.

---

### `pr.yml` — PR Pipeline (Tests + Terraform Plan)

**Triggers:** Every pull request targeting `main`

This workflow has **two jobs that run in parallel:**

#### Job 1: `test` — Run Tests

```
PR opened → Checkout → Setup Node → Install & test backend → Install & test frontend
```

Runs the test suites for both the backend and frontend using `vitest`. If any test fails, the PR gets a red X and you know something is broken before merging.

| Step | What it does |
|------|-------------|
| Install & Test Backend | `npm install && npm test` in `bashcash/be/` — runs BashCash backend tests |
| Install & Test Frontend | `npm install && npm test` in `bashcash/fe/` — runs BashCash frontend tests |

#### Job 2: `terraform-plan` — Preview Infrastructure Changes

```
PR opened → Checkout → Setup Node + Terraform → Configure AWS → terraform init → terraform plan → Post comment on PR
```

Runs `terraform plan` to preview what infrastructure changes the PR would cause, then posts the plan output as a **comment on the PR** using [`borchero/terraform-plan-comment`](https://github.com/borchero/terraform-plan-comment).

| Step | What it does |
|------|-------------|
| Setup Terraform | Installs Terraform with `terraform_wrapper: false` (required for plan comment action) |
| Configure AWS Credentials | Same as deploy — needs AWS access to generate the plan |
| Terraform Init | Downloads providers, connects to state |
| Terraform Plan | Generates an execution plan and saves it to `.planfile` |
| Post Plan Comment | Reads `.planfile` and posts a formatted, collapsible comment on the PR |

**Why `permissions: pull-requests: write`?** The job needs permission to post comments on the PR. GitHub Actions uses least-privilege by default, so we explicitly grant it.

**Why `terraform_wrapper: false`?** The `hashicorp/setup-terraform` action normally wraps the `terraform` binary to capture output. The plan comment action needs the raw binary to run `terraform show` on the planfile.

## How They Work Together

```
Feature branch                              main
     │                                        │
     │── Push commits                         │
     │   └── pr.yml triggers                  │
     │       ├── Tests pass? ✓                │
     │       └── Plan looks good? ✓           │
     │                                        │
     │── Merge PR ──────────────────────────► │
                                              │── deploy.yml triggers
                                              │   └── terraform apply
                                              │       └── Infrastructure updated!
```

This is the standard **GitOps flow**: code changes go through review (PR with tests + plan preview), and deployment happens automatically on merge.

## Adding a New Workflow

Create a new `.yml` file in this directory. The minimum structure:

```yaml
name: My Workflow

on:
  push:
    branches: [main]    # when to run

jobs:
  my-job:
    runs-on: ubicloud-standard-2
    steps:
      - uses: actions/checkout@v4    # almost always needed
      - run: echo "Hello from CI!"
```

## Secrets Required

These must be configured in **repo Settings → Secrets and variables → Actions**:

| Secret | Used by | Purpose |
|--------|---------|---------|
| `AWS_ACCESS_KEY_ID` | Both workflows | AWS authentication |
| `AWS_SECRET_ACCESS_KEY` | Both workflows | AWS authentication |
