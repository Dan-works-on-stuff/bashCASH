# BashCash

A serverless Single-Page Application (SPA) providing a gamified, simulated POSIX terminal environment in the browser.

Users upload a `.zip` file containing a real directory structure, which is converted in-memory into a Virtual File System (VFS). Users can then complete interactive challenges by executing standard Linux file-navigation commands (`ls`, `cd`, `cat`, etc.) against their VFS to earn session-based rewards.

## Core Features
1. **In-Memory VFS Generation:** Uploading a `.zip` archive triggers a pure Python generator that extracts the file tree, file sizes, and modification timestamps without persistence.
2. **Client-Side Terminal Simulation:** A real POSIX CLI experience powered by `xterm.js`, with command logic implemented entirely on the frontend.
3. **Visual Directory Mapper:** A dynamic React-based visualization of the file tree mapped out from the VFS.
4. **Stateless Gamification:** frictionless play mapped via UUID to DynamoDB TTL-based sessions.
5. **Bedrock AI Tutor:** An integrated Claude-3-Haiku assistant accessed via `<command> --help` to explain Linux utilities efficiently in the CLI.

## Stack
- **Frontend Container:** React 19, TypeScript, Vite, `@xterm/xterm`.
- **Backend APIs:** Python 3.12, FastAPI, AWS Lambda + API Gateway.
- **Persistence:** DynamoDB (Single-table setup).
- **AI:** AWS Bedrock (Claude 3 Haiku).
- **IaC:** Terraform.

