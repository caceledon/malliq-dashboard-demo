# MallIQ — Agent Context

> This file is intended for AI coding agents. It describes the project structure, technology stack, build process, and development conventions.

## Project Overview

**MallIQ** is a single-page web application for shopping-mall operational analytics and commercial management. It supports multiple malls (portfolio mode), contract lifecycle tracking, sales ingestion (manual, OCR, fiscal printer, POS connection), budget/forecast generation, document management, and AI-powered contract autofill from PDFs.

The UI language and copy are **Spanish**. Code comments and variable names in domain logic also use Spanish terms (e.g., `locatarios`, `contratos`, `ventas`).

> **Nomenclatura actualizada:** El término "Mall" fue refactorizado globalmente a **"Activo"** (`Asset`). Todos los tipos, estado, rutas y UI usan "Activo" / "activos".

## Technology Stack

- **Frontend**: React 19 + TypeScript 5.9 + Vite 8
- **Styling**: Tailwind CSS 4 with custom CSS variables and a glassmorphism design system
- **Routing**: `react-router-dom` (HashRouter)
- **State Management**: Custom React Context in `src/store/appState.tsx` (no Redux/Zustand)
- **Client Storage**: `localStorage` for app state portfolio, `idb` (IndexedDB) for local document blobs
- **Charts**: `recharts`
- **Icons**: `lucide-react`
- **Backend**: Express 5 + SQLite (`sqlite3` + `sqlite` wrapper)
- **AI / OCR**: `openai` SDK with Moonshot as preferred provider (`kimi-k2.5` by default when configured), OpenAI-compatible fallback, `tesseract.js`, `pdf-parse`
- **Build Tooling**: Vite with custom Rollup manual chunks, `concurrently` for dev orchestration

## Project Structure

```
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # HashRouter + lazy-loaded routes
│   ├── index.css                # Tailwind import + custom design tokens + animations
│   ├── store/
│   │   └── appState.tsx         # Global React Context (portfolio + active asset workspace)
│   ├── lib/
│   │   ├── domain.ts            # Core types, date math, business logic, insights builder, KPIs
│   │   ├── portfolio.ts         # Multi-asset portfolio state helpers and migrations
│   │   ├── api.ts               # HTTP client for backend sync and remote documents
│   │   ├── files.ts             # IndexedDB blob storage for documents
│   │   ├── importers.ts         # Sales/CSV/text import parsers
│   │   ├── exporters.ts         # Backup/export helpers
│   │   ├── format.ts            # Legacy currency/formatting helpers (CLP/UF)
│   │   ├── currency.tsx         # Global UF/CLP currency context + formatter
│   │   ├── theme.tsx            # Light/dark theme context
│   │   └── utils.ts             # General utilities (cn helper using clsx + tailwind-merge)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx    # Shell with sidebar, navbar, gateway status, setup wizard
│   │   │   ├── Navbar.tsx       # Includes global CLP/UF toggle + UF value input
│   │   │   └── Sidebar.tsx
│   │   ├── app/
│   │   │   ├── DocumentManager.tsx
│   │   │   ├── SalesIngestionCenter.tsx
│   │   │   ├── SetupWizard.tsx
│   │   │   └── TenantHealthRating.tsx   # 0-5 star rating component
│   │   ├── Toast.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── GatewayStatus.tsx
│   │   ├── InteractiveMap.tsx
│   │   ├── NotificationDrawer.tsx
│   │   └── SkeletonLoader.tsx
│   ├── pages/
│   │   ├── PortalSelector.tsx   # Landing portal selection
│   │   ├── NotFound.tsx
│   │   ├── admin/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Portafolio.tsx
│   │   │   ├── Locatarios.tsx
│   │   │   ├── LocatarioDetail.tsx
│   │   │   ├── RentasContratos.tsx
│   │   │   ├── CargasDatos.tsx
│   │   │   ├── Planeacion.tsx
│   │   │   ├── Ecosistema.tsx
│   │   │   ├── Alertas.tsx
│   │   │   └── Configuracion.tsx
│   │   └── locatario/
│   │       ├── Dashboard.tsx
│   │       ├── Contrato.tsx
│   │       └── Ventas.tsx
│   └── data/                    # (empty dir, likely for static data)
├── server/
│   ├── index.js                 # Express API server
│   └── db.js                    # SQLite schema and JSON-per-row data access
├── public/
│   └── favicon.svg / icons.svg
├── package.json
├── vite.config.ts               # Vite config with @/ alias and /api proxy
├── tsconfig.app.json            # TS config for the app (strict, ES2023, bundler)
├── tsconfig.node.json           # TS config for Vite/Node tooling
├── eslint.config.js             # ESLint flat config (TS + React Hooks + Refresh)
└── deploy.ps1                   # GitHub Pages deployment script
```

## Build and Development Commands

```bash
# Install dependencies
npm install

# Frontend dev server only (Vite on default port)
npm run dev

# Backend API server only (Node with --watch on port 4000)
npm run dev:api

# Run both frontend and backend concurrently
npm run dev:all

# Type-check and build production bundle in dist/
npm run build

# Lint with ESLint
npm run lint

# Preview the production build locally
npm run preview

# Start the production server (Express serves dist/ if present)
npm start
```

## Key Architecture Details

### Multi-Asset Portfolio State
- The frontend stores a `PortfolioState` in `localStorage` under the key `malliq-functional-state`.
- Each asset is an `AssetWorkspace` containing `asset`, `units`, `contracts`, `sales`, `planning`, `documents`, `suppliers`, `prospects`, `posConnections`, and `importLogs`.
- Users can switch between assets. Portfolio-level backups/export include all workspaces and documents.

### Backend Sync
- If an asset has `syncEnabled` and a `backendUrl`, the frontend pushes/pulls a `BackupArchive` to/from the Express server.
- The server stores state in SQLite (one JSON column per entity row) and manages a `revision` counter in a `meta` table.
- Push conflicts are detected via revision mismatch (409 response); `forcePushToServer` bypasses this.
- The frontend auto-pushes local changes after 1.5 seconds of inactivity and polls remote health every 15 seconds.
- If the remote revision advances while local dirty state exists, the UI marks the asset as `conflict`. If there are no local pending changes, the frontend can pull the remote revision automatically.

### Document Storage
- Documents can be stored locally (IndexedDB) or remotely (server filesystem in `server/data/uploads`).
- Remote documents are exposed via `/api/documents/:id/download`.
- Document entity types: `'asset' | 'unit' | 'contract'`.
- The backend validates document payloads and enforces upload size limits.

### AI Contract Autofill
- `POST /api/contracts/autofill` accepts a PDF.
- If `MOONSHOT_API_KEY` is set, Moonshot is preferred. Current recommended model is `kimi-k2.5` with `MOONSHOT_BASE_URL=https://api.moonshot.ai/v1`.
- If `OPENAI_API_KEY` is set and Moonshot is absent, it uses OpenAI-compatible chat completions.
- Text extraction uses `pdf-parse` v2 and the backend normalizes dates, numeric fields, and `rentSteps`.
- If no API key is configured, it returns a mocked template based on the filename with `source: 'mock_local'`.

### POS Proxy & Fiscal Ingestion
- `POST /api/connectors/pos/proxy` forwards HTTP requests to external POS endpoints but blocks localhost/private-network targets, limits payload/response size, and applies a timeout.
- `POST /api/connectors/fiscal/ingest` accepts raw text or a file and returns extracted text content.
- Fiscal ingestion supports text files, PDFs, and images; image inputs are OCR-processed on the backend.

## Domain Model — Contract / Local

Each contract (`Contract`) supports the following fields:

- `companyName` / `storeName` / `category`
- `localIds`: array of linked unit IDs
- `startDate` / `endDate`
- `fixedRent`: renta fija en CLP
- `variableRentPct`: % sobre ventas
- `baseRentUF`: tarifa UF/m²
- `commonExpenses`: gastos comunes
- `fondoPromocion`: fondo de promoción
- `garantiaMonto` / `garantiaVencimiento`
- `feeIngreso`: guante / costo de estudio
- `rentSteps`: array de escalonados (`RentStep[]`)
- Health checks: `healthPagoAlDia`, `healthEntregaVentas`, `healthNivelVenta`, `healthNivelRenta`, `healthPercepcionAdmin`

### KPIs calculados automáticamente
- **Renta Fija Total:** `gla_m2 * renta_fija_uf_m2 * ufValue`
- **Renta Variable Total:** `ventas * renta_variable_pct`
- **Renta Total:** Fija + Variable
- **Costo de Ocupación (%):** `(Renta Total + GC + Fondo Promoción) / ventas` — destacado en rojo si supera 20%
- **Venta x M2:** `ventas / gla_m2`

## Code Style Guidelines

- **Language**: TypeScript with `strict: true`. Target is ES2023.
- **Modules**: ES modules throughout (`"type": "module"` in `package.json`).
- **Imports**: Use the `@/` path alias for `src/` imports.
- **Components**: Functional components with hooks. Larger pages are lazy-loaded in `App.tsx`.
- **CSS/Tailwind**: Utility-first with Tailwind. Custom design tokens live in `src/index.css` using CSS variables. Common patterns:
  - Cards: `.glass-card`
  - Inputs: `.input-field`
  - Badges: `.badge-success`, `.badge-warning`, `.badge-danger`, `.badge-info`
- **Naming**: Domain entities use Spanish names in types and UI (e.g., `Locatarios`, `Contratos`, `Ventas`, `Planeacion`).

## Currency Conventions

- Use `useCurrency()` from `@/lib/currency` for all monetary formatting.
- `formatCurrency(amountClp)` automatically renders in CLP or UF depending on the global toggle.
- Do **not** use `formatPeso` in new UI code; it is retained only for legacy compatibility.

## Testing Instructions

There is an active **Vitest** suite in the project:
- **Domain unit tests**: `src/lib/domain.test.ts`
- **Backend integration tests**: `server/server.integration.test.ts`
- Run with `npm run test`

Preferred additions:
- **Unit tests**: `vitest`
- **Component tests**: `@testing-library/react`
- **E2E tests**: `playwright` or `cypress`

## Security Considerations

- The Express server has optional bearer-token auth via the `API_KEY` environment variable. In development it is bypassed if `API_KEY` is not set.
- The POS proxy endpoint is restricted to public HTTP/HTTPS endpoints and rejects localhost/private-network addresses.
- CORS is enabled globally on the server.
- Sensitive AI keys (`OPENAI_API_KEY`, `MOONSHOT_API_KEY`) are read from environment variables only. The backend also supports local `.env.local` / `.env` loading through `server/env.js`.

## Deployment

- `deploy.ps1` is a PowerShell script that:
  1. Initializes a Git repo and pushes to GitHub (`malliq-dashboard-demo` under the `celed` user).
  2. Builds the frontend with Vite.
  3. Deploys the `dist/` folder to GitHub Pages using `gh-pages`.
- The Express server can also serve the built `dist/` folder statically for a self-hosted deployment.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `PORT` | API server port (default: 4000) |
| `API_KEY` | Optional bearer token for API routes |
| `VITE_API_BASE_URL` | Frontend fallback API base URL |
| `OPENAI_API_KEY` | OpenAI key for contract autofill |
| `OPENAI_BASE_URL` | Optional custom OpenAI-compatible base URL |
| `MOONSHOT_API_KEY` | Moonshot AI key (preferred if present) |
| `MOONSHOT_BASE_URL` | Moonshot base URL override (default: `https://api.moonshot.ai/v1`) |
| `CONTRACT_AUTOFILL_MODEL` | Model override (default: `gpt-4o-mini` or `kimi-k2.5`) |
| `MALLIQ_DATA_DIR` | Override directory for backend data files |
| `MALLIQ_DB_PATH` | Override path for the SQLite database file |
