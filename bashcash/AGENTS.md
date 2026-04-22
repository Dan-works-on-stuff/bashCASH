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

### Backend (`/bashcash/be`)
- **Runtime & Hosting:** Python 3.12, FastAPI, Mangum (Lambda adapter), Amazon API Gateway.
- **VFS Generator:** Pure Python using `zipfile` + `io.BytesIO` + Base64 payload decoding to create VFS JSON.
- **Database (planned):** Amazon DynamoDB.
  - **Design:** Single-table design.
  - **Partition Key:** `session_id` (UUIDv4 generated on frontend).
  - **Attributes:** `cash_balance` (Number), `ttl` (epoch).

### AI Integration (planned)
- **Service:** AWS Bedrock using Anthropic Claude 3 Haiku.
- **Function:** Triggered via terminal helper command pattern (e.g., `bashcash --help <command>`) for low-latency command explanations.

### Infrastructure as Code (`/terraform`) (planned)
- Terraform will manage API Gateway, Lambda, DynamoDB, Bedrock permissions, S3, and CloudFront.

## Feature Set

- **In-Memory VFS Generation:** Upload `.zip` -> parse in backend -> return JSON tree.
- **Client-Side Terminal Simulation:** Local command handling currently supports MVP commands in frontend utility logic (`pwd`, `ls`, `cd`, `clear`, unknown command handling).
- **Visual VFS Mapping:** Sidebar tree view is wired to parsed VFS response.
- **Stateless Gamification (planned):** localStorage UUID + DynamoDB TTL-backed session records.
- **Regex-Based Exercise Validation (planned):** output matching against challenge regex/state machine.
- **Native AI Tutor (planned):** Bedrock-backed command explanation endpoint.

## Current Project Structure & Status

The project is separated into three main directories under `/bashcash`:

- `/bashcash/fe` (**Implemented MVP shell + VFS integration**)
  - Bootstrapped React/Vite app
  - Upload flow sends Base64 zip payload to backend endpoint
  - Tree UI renders returned VFS
  - `TerminalUI` and `utils/vfs.ts` implement local command execution scaffold

- `/bashcash/be` (**Implemented VFS parser endpoint**)
  - FastAPI app with CORS + Mangum handler
  - `POST /v1/vfs/parse` implemented
  - `vfs.py` parses zip and includes file metadata (`size`, `modified`)
  - `sessions.py` and `ai.py` are placeholders (not implemented)

- `/bashcash/terraform` (**Not started**)

## API Contracts
Source-of-truth for request/response schemas and endpoint expectations is `bashcash/api-contract.md`.
Any backend/frontend integration changes must stay aligned with that file.

## Next Priority Tasks
1. Start Terraform deployment work for `/bashcash/terraform` (infrastructure scaffolding and deployment pipeline planning).
2. Stabilize terminal behavior and polish command simulation in `fe/src/utils/vfs.ts` + `fe/src/components/TerminalUI.tsx`.
3. Add support for remaining planned commands (`cat`, `grep`, `touch`, `mkdir`, `rm`) in safe simulated mode.
4. Implement session endpoints and DynamoDB integration in `be/app/sessions.py`.
5. Implement Bedrock tutor endpoint in `be/app/ai.py`.
6. Add tests:
   - FE unit tests for path resolution + command execution.
   - BE tests for zip parsing (valid zip, invalid payload, nested dirs, metadata presence).