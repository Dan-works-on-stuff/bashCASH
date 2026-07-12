# BashCash

BashCash is a personal project that turns the browser into a simulated POSIX terminal. An uploaded `.zip` becomes a virtual file system, and you can work through the tree with normal shell commands while the app tracks session state and rewards.

## Core features

1. In-memory VFS generation from uploaded archives
2. Terminal simulation with `xterm.js`
3. Visual file-tree browser for the virtual filesystem
4. Session persistence with DynamoDB-backed snapshots
5. Nano-like editing for text files in the browser

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, `@xterm/xterm` |
| Backend | Python 3.12, FastAPI, AWS Lambda, API Gateway |
| Persistence | DynamoDB |
| IaC | Terraform |