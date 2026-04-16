# BuildCore ERP

## Overview

Full-stack Enterprise Resource Planning system for Indian civil construction companies. Monorepo managed by pnpm workspaces with TypeScript throughout.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + shadcn/ui + @tanstack/react-query + wouter + recharts

## Artifacts

- **`artifacts/erp`** — React + Vite frontend (port: 18996, path: `/`)
- **`artifacts/api-server`** — Express backend (port: 8080, base: `/api`)

## ERP Modules

1. **Dashboard** — KPI cards, recent activity feed
2. **Projects** — Construction project tracking with budget/progress
3. **Finance** — GST-compliant transactions, invoices, cashflow chart
4. **Procurement** — Purchase orders, vendor contracts
5. **Vendors** — Supplier registry with GST numbers, ratings
6. **Inventory** — Material stock tracking, low-stock alerts
7. **Tenders** — Bid tracking, win rate analysis
8. **Vehicles** — Fleet management, maintenance records, fuel logs
9. **HR** — Employee directory, payroll summary

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run build` — build API server (required after route changes)

## Architecture Notes

- All API hooks imported from `@workspace/api-client-react`, never relative paths
- INR formatting uses `formatINR()` from `@/lib/utils/format` (supports Lakhs/Crores)
- Express route ordering: specific routes MUST come before parameterized `/:id` routes
- Numeric DB fields (numeric/decimal) must be cast with `Number()` before returning in API responses
- `<SelectItem>` must never have empty string `value` — use `"all"` as sentinel for "All" options
