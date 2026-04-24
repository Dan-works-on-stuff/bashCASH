# BashCash Project Context

## Description
A serverless Single-Page Application (SPA) providing a gamified, simulated POSIX terminal environment. Users can upload a `.zip` file containing a directory structure, or start from a deterministic default folder. Uploaded archives are converted into a Virtual File System (VFS), and users complete challenges by executing standard Linux commands against that VFS, earning session-based currency.

## Core Architecture & Tech Stack

### Frontend (`/bashcash/fe`)
- **Framework:** React 19, TypeScript, Vite.
- **Hosting:** Hosted on AWS S3, distributed via AWS CloudFront.
- **Terminal Emulator:** `@xterm/xterm` + `@xterm/addon-fit` for rendering terminal UI and handling input.
- **Visual File Tree:** React recursive tree renderer (`VfsTree`) showing folders/files from parsed VFS JSON.
- **Session & Workspace State:** `src/hooks/useBashCashSession.ts` owns session restore/save, current path, VFS state, modal state, and upload/default-folder orchestration.
- **Session Persistence:** A browser-generated `session_id` is reused via `localStorage` and the frontend syncs session snapshots to the backend so work survives reloads.
- **Session Reset:** UI exposes current `session_id` and a `New session` action that deletes the existing backend snapshot and rotates to a fresh id.
- **Diagnostics:** `src/api/client.ts` classifies HTTP vs network/CORS vs timeout failures and logs request context.
- **File Editing:** Terminal-only `nano <path>` support for `.txt` and `.sh` files via a nano-like modal editor. File tree items are display-only and cannot be clicked to open files.
- **VFS Layout:** `src/utils/vfs.ts` is a compatibility barrel; implementation is split across `src/utils/vfs/{commands,path,files,shared,types}.ts` and `src/utils/vfs/command-handlers/*`.

### Backend (`/bashcash/be`)
- **Runtime & Hosting:** Python 3.12, FastAPI, Mangum (Lambda adapter), Amazon API Gateway.
- **VFS Generator:** Pure Python using `zipfile` + `io.BytesIO` + Base64 payload decoding to create VFS JSON.
- **Editable File Content:** UTF-8 `.txt` and `.sh` files are read from uploaded ZIPs and returned inline in the VFS response so the frontend editor can preload content.
- **Session Store:** DynamoDB-backed session snapshots persist the full VFS tree plus current path per `session_id`, and every save refreshes the TTL to one hour from the last modification.
- **Observability:** Request middleware adds `x-request-id`, latency/status logs, structured error payloads (`error`, `message`, `request_id`), and `GET /v1/health`.
- **Database:** Amazon DynamoDB.
  - **Design:** Single-table design.
  - **Partition Key:** `session_id` (UUIDv4 generated on frontend).
  - **Attributes:** `cash_balance` (Number), `accuracy_multiplier` (Number), `ttl` (epoch).

### AI Integration (planned)
- **Service:** AWS Bedrock using Anthropic Claude 3 Haiku.
- **Function:** Triggered via terminal helper command pattern (e.g., `bashcash --help <command>`) for low-latency command explanations.

### Infrastructure as Code
- **Current state in `/bashcash`:** no app-local Terraform directory (deployment remains repo-level).
- **Repository-level Terraform:** BashCash is wired under `/terraform` with `bashcash_project.tf` + reusable modules.
- **Progress:** backend module now exports API outputs (including `api_base_url`), and frontend build env consumes `VITE_API_URL` from `module.bashcash_backend.api_base_url` (no duplicated hardcoded API URL).

## Feature Set

- **In-Memory VFS Generation:** Upload `.zip` -> parse in backend -> return JSON tree, or use the deterministic default folder for an instant demo session.
- **Client-Side Terminal Simulation:** Local command handling supports MVP commands plus `xdg-open` for images and `nano` for editable text files (`.txt`, `.sh`).
- **Visual VFS Mapping:** Sidebar tree view renders the VFS structure for browsing only.
- **Nano-like Editing:** Opening a text file launches a modal editor with save support that mutates the in-memory VFS state and pushes the updated session snapshot to the backend.
- **Session Restore:** Refreshing the page can reload the last saved VFS/current path for the same `session_id`.
- **Session Reset/Delete:** Starting a new session clears local workspace state and calls `DELETE /v1/sessions/{session_id}` to remove persisted state.
- **Improved Error Diagnostics:** Request correlation IDs and structured API errors surfaced to frontend.
- **Stateless Gamification:** localStorage UUID + DynamoDB TTL-backed session records, with `cash_balance` and `accuracy_multiplier` based on command score events.
- **Regex-Based Exercise Validation (planned):** output matching against challenge regex/state machine.
- **Native AI Tutor (planned):** Bedrock-backed command explanation endpoint.

## Testing & CI Status

- **Backend tests (`pytest`):**
  - `be/tests/test_vfs.py` covers valid/invalid zip parsing and metadata presence.
  - `be/tests/test_main_api.py` covers `/v1/health`, `/v1/vfs/parse` success, and structured `400` contract for invalid zip.
  - `be/tests/test_sessions.py` covers save/restore routes and TTL refresh behavior, plus gamification properties.
- **Frontend tests (`vitest`):**
  - `fe/src/api/client.test.ts` covers API success path and error mapping (HTTP/network/CORS/timeout).
  - `fe/src/utils/vfs.test.ts` covers terminal command execution, `xdg-open`, `nano`, file content updates, and command score events.
  - `fe/src/hooks/useBashCashSession.test.ts` covers Gamification properties in local storage and command handling.
  - `fe/src/utils/defaultVfs.test.ts` covers the deterministic default folder structure.
- **CI automation:** `.github/workflows/bashcash-ci.yml` runs BashCash backend and frontend tests on push/PR for BashCash changes.

## Current Project Structure & Status

The project is currently split across `/bashcash` app code and shared repo-level infrastructure/workflows:

- `/bashcash/fe` (**Implemented MVP shell + VFS integration + API diagnostics tests**)
  - Upload flow sends Base64 zip payload to backend endpoint
  - Default folder flow starts a deterministic local VFS without backend calls
  - Tree UI renders returned VFS for display-only navigation
  - `TerminalUI` renders the terminal shell; command behavior lives in `src/utils/vfs/commands.ts` and the handler modules under `src/utils/vfs/command-handlers/`
  - Gamification state (Cash, Multiplier) based on command score events has been added.
  - `useBashCashSession` manages restore/save, new-session rotation, uploads, and editor-driven file updates
  - Session snapshots are restored/saved via `GET`/`PUT /v1/sessions/{session_id}` with `localStorage` session IDs
  - API client now logs/normalizes fetch failures for easier debugging

- `/bashcash/be` (**Implemented VFS parser endpoint + request-level observability + Gamification Props**)
  - FastAPI app with CORS + Mangum handler
  - `POST /v1/vfs/parse` and `GET /v1/health` implemented
  - Structured error responses with correlation ID support
  - `vfs.py` parses zip and includes file metadata (`size`, `modified`) plus inline `content` for UTF-8 `.txt`/`.sh` files
  - `sessions.py` persists session snapshots to DynamoDB (or in-memory fallback in local/dev when the table env var is absent), including `cash_balance` and `accuracy_multiplier`; `ai.py` is still a placeholder

- `/terraform` (**BashCash deployment wiring in progress**)
  - `terraform/modules/bashcash-backend/outputs.tf` now exposes `api_base_url`, `invoke_url`, `api_id`, and `lambda_api_name`
  - `terraform/bashcash_project.tf` frontend build env now uses `module.bashcash_backend.api_base_url` for `VITE_API_URL`
  - Bedrock-related infrastructure remains unchanged

## API Contracts
Source-of-truth for request/response schemas and endpoint expectations is `bashcash/api-contract.md`.
Any backend/frontend integration changes must stay aligned with that file.

## Next Priority Tasks
1. Implement Bedrock tutor endpoint in `be/app/ai.py`.
2. Expand integration coverage for terminal workflows, including opening/editing files after navigation and ensuring the tree remains non-interactive for file opening.
3. Consider adding explicit UI for session id reset/new-session creation if the product needs a user-visible accountless switcher.

Implementation note: the default-folder flow instantiates a local `VFSNode` tree directly (via `fe/src/utils/defaultVfs.ts` and `fe/src/hooks/useBashCashSession.ts`) and must not call `POST /v1/vfs/parse`.

Editing note: keep page composition in `fe/src/pages/BashCashHomePage.tsx`, session behavior in `fe/src/hooks/useBashCashSession.ts`, and command semantics in the VFS handler modules rather than re-centralizing them in `utils/vfs.ts`.
