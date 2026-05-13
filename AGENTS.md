<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:shell-and-package-rules -->
# Shell & Package Manager Rules

- 始终使用 git bash 执行 shell 命令，禁止使用 PowerShell。
- 在执行任何包安装/升级命令（含 pnpm install / add / update 等）前，必须先执行 `use20` 切换到 Node.js 20。
- 包管理统一使用 `pnpm`，禁止使用 `npm` / `yarn`（如安装：`pnpm add xxx`，开发依赖：`pnpm add -D xxx`）。
<!-- END:shell-and-package-rules -->
