# BashCash Project Context

## Description
A serverless Single-Page Application (SPA) providing a gamified, simulated POSIX terminal environment. Users upload a `.zip` file containing a directory structure, which is converted into a Virtual File System (VFS). Users complete challenges by executing standard Linux file-navigation commands against their VFS, earning session-based currency.

## Core Architecture & Tech Stack

### Frontend (`/bashcash/fe`)
- **Framework:** React 19, TypeScript, Vite.
- **Hosting:** Hosted on AWS S3, distributed via AWS CloudFront.
- **Terminal Emulator:** `xterm.js` for intercepting keystrokes and rendering the terminal UI.
- **Visual File Tree:** A React-based visual map of the current VFS representing files/folders (replaces backend Graphviz generation).
- **State Management:** Local React state handles the VFS traversal and command simulation (intercepting `cd`, `ls`, `cat`) without backend calls.

### Backend (`/bashcash/be`)
- **Runtime & Hosting:** Python 3.12, AWS Lambda, Amazon API Gateway.
- **VFS Generator:** Pure Python functions utilizing `zipfile` to parse Base64 payloads into JSON graph representations.
- **Database:** Amazon DynamoDB.
  - **Design:** Single-table design.
  - **Partition Key:** `session_id` (UUIDv4 generated on the frontend).
  - **Attributes:** `cash_balance` (Number), `ttl` (Time-to-Live epoch).

### AI Integration
- **Service:** AWS Bedrock utilizing Anthropic Claude 3 Haiku.
- **Function:** Triggered via a custom CLI command (e.g., `bashcash --help <command>`) to provide low-latency, context-aware explanations of POSIX utilities.

### Infrastructure as Code (`/terraform`)
- **Tool:** Terraform managers the entire AWS topology, ensuring reproducible deployments of API Gateway, Lambda, DynamoDB, Bedrock permissions, and S3/CloudFront.

## Feature Set

- **In-Memory VFS Generation:** Zero-persistence parsing of user-uploaded `.zip` archives into a JSON-based virtual directory tree. Extracts real file metadata (`size`, `modified` date) to accurately power terminal utilities.
- **Client-Side Terminal Simulation:** Full client-side execution of safe POSIX commands (`ls`, `cd`, `cat`, `pwd`, `grep`, `touch`, `mkdir`, `rm`) against the VFS using `xterm.js`.
- **Visual VFS Mapping:** Interactive frontend graph reflecting the current file system and user's working directory.
- **Stateless Gamification:** Frictionless onboarding using `localStorage` UUIDs mapped to DynamoDB TTL-enabled session records. Atomic counters handle cash increments.
- **Regex-Based Exercise Validation:** State-machine challenge system where user command outputs are matched against predefined expected regex patterns to trigger cash payouts.
- **Native AI Tutor:** Integrated command-line assistant using Claude 3 Haiku for sub-second, token-efficient command explanations.

## Current Project Structure & Status
The project is strictly separated into three main directories under `/bashcash`:
- `/bashcash/fe`: The React 19 + Vite frontend app. Uses `@xterm/xterm` for terminal rendering. (Bootstrapped and ready, pending interactive map integration).
- `/bashcash/be`: The Python 3.12 backend app powered by FastAPI/Mangum. (VFS zip-parser implemented with metadata support, endpoints stubbed).
- `/bashcash/terraform`: Infrastructure as code. (Pending)

## API Contracts
The source-of-truth for backend API definitions (endpoints, request/response schemas) is located at `/bashcash/api-contract.md`. Any new AI agent working on backend routes or frontend API integration MUST consult this file to ensure schemas align.
