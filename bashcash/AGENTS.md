# BashCash Project Context

## Description
A serverless Single-Page Application (SPA) providing a gamified, simulated POSIX terminal environment. Users upload a `.zip` file containing a directory structure, which is converted into a Virtual File System (VFS). Users complete challenges by executing standard Linux file-navigation commands against their VFS, earning session-based currency.

## Core Architecture & Tech Stack

### Frontend (`/bashcash/fe`)
- **Framework:** React 19, TypeScript, Vite.
- **Hosting:** Hosted on AWS S3, distributed via AWS CloudFront.
- **Terminal Emulator:** `@xterm/xterm` + `@xterm/addon-fit` for rendering terminal UI and handling input.
- **Visual File Tree:** React recursive tree renderer (`VfsTree`) showing folders/files from parsed VFS JSON.
- **State Management:** Local React state handles uploaded VFS, current path, terminal command execution.
- **Diagnostics:** `src/api/client.ts` classifies HTTP vs network/CORS vs timeout failures and logs request context.

### Backend (`/bashcash/be`)
- **Runtime & Hosting:** Python 3.12, FastAPI, Mangum (Lambda adapter), Amazon API Gateway.
- **VFS Generator:** Pure Python using `zipfile` + `io.BytesIO` + Base64 payload decoding to create VFS JSON.
- **Observability:** Request middleware adds `x-request-id`, latency/status logs, structured error payloads (`error`, `message`, `request_id`), and `GET /v1/health`.
- **Database (planned):** Amazon DynamoDB.
  - **Design:** Single-table design.
  - **Partition Key:** `session_id` (UUIDv4 generated on frontend).
  - **Attributes:** `cash_balance` (Number), `ttl` (epoch).

### AI Integration (planned)
- **Service:** AWS Bedrock using Anthropic Claude 3 Haiku.
- **Function:** Triggered via terminal helper command pattern (e.g., `bashcash --help <command>`) for low-latency command explanations.

### Infrastructure as Code
- **Current state in `/bashcash`:** no app-local Terraform directory (deployment remains repo-level).
- **Repository-level Terraform:** BashCash is wired under `/terraform` with `bashcash_project.tf` + reusable modules.
- **Progress:** backend module now exports API outputs (including `api_base_url`), and frontend build env consumes `VITE_API_URL` from `module.bashcash_backend.api_base_url` (no duplicated hardcoded API URL).

## Feature Set

- **In-Memory VFS Generation:** Upload `.zip` -> parse in backend -> return JSON tree.
- **Client-Side Terminal Simulation:** Local command handling currently supports MVP commands (`pwd`, `ls`, `cd`, `clear`, unknown command handling).
- **Visual VFS Mapping:** Sidebar tree view is wired to parsed VFS response.
- **Improved Error Diagnostics:** Request correlation IDs and structured API errors surfaced to frontend.
- **Stateless Gamification (planned):** localStorage UUID + DynamoDB TTL-backed session records.
- **Regex-Based Exercise Validation (planned):** output matching against challenge regex/state machine.
- **Native AI Tutor (planned):** Bedrock-backed command explanation endpoint.

## Testing & CI Status

- **Backend tests (`pytest`):**
  - `be/tests/test_vfs.py` covers valid/invalid zip parsing and metadata presence.
  - `be/tests/test_main_api.py` covers `/v1/health`, `/v1/vfs/parse` success, and structured `400` contract for invalid zip.
- **Frontend tests (`vitest`):**
  - `fe/src/api/client.test.ts` covers API success path and error mapping (HTTP/network/CORS/timeout).
- **CI automation:** `.github/workflows/bashcash-ci.yml` runs BashCash backend and frontend tests on push/PR for BashCash changes.

## Current Project Structure & Status

The project is currently split across `/bashcash` app code and shared repo-level infrastructure/workflows:

- `/bashcash/fe` (**Implemented MVP shell + VFS integration + API diagnostics tests**)
  - Upload flow sends Base64 zip payload to backend endpoint
  - Tree UI renders returned VFS
  - `TerminalUI` and `utils/vfs.ts` implement local command execution scaffold
  - API client now logs/normalizes fetch failures for easier debugging

- `/bashcash/be` (**Implemented VFS parser endpoint + request-level observability**)
  - FastAPI app with CORS + Mangum handler
  - `POST /v1/vfs/parse` and `GET /v1/health` implemented
  - Structured error responses with correlation ID support
  - `vfs.py` parses zip and includes file metadata (`size`, `modified`)
  - `sessions.py` and `ai.py` are placeholders (not implemented)

- `/terraform` (**BashCash deployment wiring in progress**)
  - `terraform/modules/bashcash-backend/outputs.tf` now exposes `api_base_url`, `invoke_url`, `api_id`, and `lambda_api_name`
  - `terraform/bashcash_project.tf` frontend build env now uses `module.bashcash_backend.api_base_url` for `VITE_API_URL`
  - Bedrock-related infrastructure remains unchanged

## API Contracts
Source-of-truth for request/response schemas and endpoint expectations is `bashcash/api-contract.md`.
Any backend/frontend integration changes must stay aligned with that file.

## Next Priority Tasks
1. Add a `Use default folder` option when the user skips `.zip` upload. Build a deterministic local VFS with fixed structure: root contains `son1/`, `son2/`, `son3/`; `son1/grandson1.txt`; `son2/nested/worker.sh`; `son3/unemployed.png`.
2. Implement session endpoints and DynamoDB integration in `be/app/sessions.py`.
3. Stabilize terminal behavior and polish command simulation in `fe/src/utils/vfs.ts` + `fe/src/components/TerminalUI.tsx`.
4. Add remaining simulated commands (`cat`, `grep`, `touch`, `mkdir`, `rm`) in safe local mode.
5. Implement Bedrock tutor endpoint in `be/app/ai.py`.
6. Expand tests to terminal command execution/path resolution and add integration-style upload/default-folder flow coverage; then focus Terraform hardening (plans/validation flow, outputs usage, and rollout safety) under repo-level `/terraform`.

Implementation note: default-folder flow should instantiate a local `VFSNode` tree directly (for example via `fe/src/utils/defaultVfs.ts` and a trigger in `fe/src/pages/BashCashHomePage.tsx`) and must not call `POST /v1/vfs/parse`.

Asset note: for now, keep `unemployed.png` as a frontend static asset at `fe/public/default-vfs/unemployed.png`; for production, move it to S3 behind CloudFront and reference it via a stable URL.
