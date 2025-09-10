---
description: Deep Playwright audit (crawl & click)
allowed-tools:
  - Read(./**)
  - Write(./**/*)
  - Bash(npm i:*)
  - Bash(npx playwright:*)
  - Bash(node:*)
  - Bash(npm run dev:*)
---
Use the **Audit Runner** to:
1) Detect routes (Next.js/React Router) and build a route list.
2) Create `tools/audit/` with a Playwright crawler that visits each route, clicks buttons/links, submits obvious forms with safe dummy data, and records console+network errors.
3) Add `npm run audit:web` to run it.
4) Execute the audit and print the **Audit Report**.
